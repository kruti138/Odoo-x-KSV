import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import { createStore } from "./store.js";
import { quotationTotals } from "./seed.js";

const app = express();
const store = await createStore();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "vendorbridge-demo-secret";
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [process.env.CLIENT_URL, "http://localhost:5173", "http://localhost:5174"].filter(Boolean);
app.use(cors({ origin: (origin, callback) => {
  if (!origin) return callback(null, true);
  callback(null, allowedOrigins.includes(origin) ? origin : false);
} }));
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

const publicUser = ({ password, ...user }) => user;
const sign = (user) => jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "8h" });
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = await store.get("users", payload.id);
    if (!req.user) throw new Error("User not found");
    next();
  } catch {
    res.status(401).json({ message: "Please sign in to continue." });
  }
};
const allow = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ message: "Your role cannot perform this action." });
const activity = (type, message) => store.create("activities", { type, message, date: new Date().toISOString() });
const enriched = async () => {
  const [vendors, rfqs, quotations, approvals, purchaseOrders, invoices] = await Promise.all([
    store.list("vendors"), store.list("rfqs"), store.list("quotations"), store.list("approvals"), store.list("purchaseOrders"), store.list("invoices")
  ]);
  const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));
  const rfqMap = Object.fromEntries(rfqs.map((r) => [r.id, r]));
  const quotationMap = Object.fromEntries(quotations.map((q) => [q.id, q]));
  return {
    vendors, rfqs,
    quotations: quotations.map((q) => ({ ...q, vendor: vendorMap[q.vendorId], rfq: rfqMap[q.rfqId], ...quotationTotals(q) })),
    approvals: approvals.map((a) => ({ ...a, quotation: quotationMap[a.quotationId], rfq: rfqMap[a.rfqId], vendor: vendorMap[quotationMap[a.quotationId]?.vendorId] })),
    purchaseOrders: purchaseOrders.map((po) => ({ ...po, vendor: vendorMap[po.vendorId], rfq: rfqMap[po.rfqId] })),
    invoices: invoices.map((i) => ({ ...i, vendor: vendorMap[i.vendorId], purchaseOrder: purchaseOrders.find((po) => po.id === i.poId) }))
  };
};

app.get("/api/health", (_req, res) => res.json({ ok: true, database: process.env.USE_MEMORY_DB === "false" ? "mongodb" : "memory" }));

app.post("/api/auth/login", async (req, res) => {
  const user = await store.findOne("users", (item) => item.email.toLowerCase() === String(req.body.email).toLowerCase());
  const valid = user && (user.password === req.body.password || await bcrypt.compare(req.body.password || "", user.password).catch(() => false));
  if (!valid) return res.status(401).json({ message: "Invalid email or password." });
  if (user.status === "Disabled") return res.status(403).json({ message: "This account has been disabled by an administrator." });
  res.json({ token: sign(user), user: publicUser(user) });
});
app.post("/api/auth/signup", async (req, res) => {
  const exists = await store.findOne("users", (item) => item.email.toLowerCase() === String(req.body.email).toLowerCase());
  if (exists) return res.status(409).json({ message: "An account with this email already exists." });
  const { companyName, category, gst, ...account } = req.body;
  let vendorId;
  if (account.role === "Vendor") {
    const vendor = await store.create("vendors", {
      name: companyName || `${account.firstName} ${account.lastName}`,
      category: category || "General Supplies",
      gst: gst || "Pending verification",
      contact: account.phone || "",
      email: account.email,
      status: "Pending",
      rating: 0
    });
    vendorId = vendor.id;
    await activity("Vendor", `Vendor registered - ${vendor.name} is pending verification`);
  }
  const user = await store.create("users", {
    ...account,
    ...(vendorId ? { vendorId } : {}),
    status: "Active",
    password: await bcrypt.hash(account.password, 10)
  });
  await activity("User", `${user.firstName} ${user.lastName} created a ${user.role} account`);
  res.status(201).json({ token: sign(user), user: publicUser(user) });
});
app.post("/api/auth/forgot-password", async (req, res) => res.json({ message: `A reset link has been prepared for ${req.body.email}.` }));
app.get("/api/auth/me", auth, (req, res) => res.json(publicUser(req.user)));

app.get("/api/bootstrap", auth, async (_req, res) => {
  const data = await enriched();
  const [activities, notifications, users] = await Promise.all([store.list("activities"), store.list("notifications"), store.list("users")]);
  if (_req.user.role === "Vendor") {
    const vendorId = _req.user.vendorId;
    const rfqs = data.rfqs.filter((rfq) => rfq.vendorIds.includes(vendorId));
    const quotations = data.quotations.filter((quotation) => quotation.vendorId === vendorId);
    const purchaseOrders = data.purchaseOrders.filter((po) => po.vendorId === vendorId);
    return res.json({
      vendors: data.vendors.filter((vendor) => vendor.id === vendorId),
      rfqs,
      quotations,
      approvals: [],
      purchaseOrders,
      invoices: [],
      activities: activities.filter((item) => ["RFQ", "Quotation", "Purchase Order"].includes(item.type)),
      notifications: notifications.filter((item) => !item.title.toLowerCase().includes("approval")),
      users: []
    });
  }
  if (_req.user.role === "Manager / Approver") {
    const rfqIds = new Set(data.approvals.map((approval) => approval.rfqId));
    const quotationIds = new Set(data.approvals.map((approval) => approval.quotationId));
    return res.json({
      vendors: data.vendors,
      rfqs: data.rfqs.filter((rfq) => rfqIds.has(rfq.id)),
      quotations: data.quotations.filter((quotation) => quotationIds.has(quotation.id)),
      approvals: data.approvals,
      purchaseOrders: data.purchaseOrders,
      invoices: [],
      activities: activities.filter((item) => ["Approval", "Quotation", "Purchase Order"].includes(item.type)),
      notifications: notifications.filter((item) => item.title.toLowerCase().includes("approval")),
      users: []
    });
  }
  res.json({ ...data, activities, notifications, users: _req.user.role === "Admin" ? users.map(publicUser) : [] });
});

app.patch("/api/users/:id", auth, allow("Admin"), async (req, res) => {
  const allowed = Object.fromEntries(Object.entries(req.body).filter(([key]) => ["role", "status"].includes(key)));
  const user = await store.update("users", req.params.id, allowed);
  if (!user) return res.status(404).json({ message: "User not found." });
  await activity("User", `${user.firstName} ${user.lastName}'s access was updated`);
  res.json(publicUser(user));
});

app.post("/api/vendors", auth, allow("Admin"), async (req, res) => {
  const vendor = await store.create("vendors", { rating: 0, status: "Pending", ...req.body });
  await activity("Vendor", `Vendor added - ${vendor.name} registered with ${vendor.status} status`);
  res.status(201).json(vendor);
});
app.patch("/api/vendors/:id", auth, allow("Procurement Officer", "Admin"), async (req, res) => res.json(await store.update("vendors", req.params.id, req.body)));

app.post("/api/rfqs", auth, allow("Procurement Officer"), async (req, res) => {
  const rfqs = await store.list("rfqs");
  const rfq = await store.create("rfqs", { ...req.body, number: `RFQ-${new Date().getFullYear()}-${String(rfqs.length + 43).padStart(3, "0")}`, status: req.body.status || "Open", createdAt: new Date().toISOString() });
  await activity("RFQ", `RFQ published - ${rfq.title} sent to ${rfq.vendorIds.length} vendors`);
  res.status(201).json(rfq);
});

app.post("/api/quotations", auth, allow("Vendor"), async (req, res) => {
  const previous = await store.findOne("quotations", (q) => q.rfqId === req.body.rfqId && q.vendorId === req.body.vendorId);
  const quotation = previous
    ? await store.update("quotations", previous.id, { ...req.body, status: req.body.status || "Submitted", updatedAt: new Date().toISOString() })
    : await store.create("quotations", { ...req.body, status: req.body.status || "Submitted", createdAt: new Date().toISOString() });
  const vendor = await store.get("vendors", quotation.vendorId);
  await activity("Quotation", `${vendor?.name || "Vendor"} ${previous ? "updated" : "submitted"} a quotation`);
  res.status(previous ? 200 : 201).json({ ...quotation, ...quotationTotals(quotation) });
});

app.post("/api/approvals", auth, allow("Procurement Officer"), async (req, res) => {
  const approval = await store.create("approvals", {
    rfqId: req.body.rfqId, quotationId: req.body.quotationId, status: "Pending L1", currentLevel: 1, remarks: "",
    timeline: [{ label: "Submitted", by: req.user.firstName + " " + req.user.lastName, date: new Date().toISOString(), state: "done" }, { label: "L1 Review", by: "Manager", date: null, state: "current" }, { label: "L2 Approval", by: "Finance", date: null, state: "upcoming" }, { label: "Generate PO", by: "System", date: null, state: "upcoming" }]
  });
  await activity("Approval", "Quotation selected and approval workflow initiated");
  res.status(201).json(approval);
});

app.patch("/api/approvals/:id", auth, allow("Manager / Approver"), async (req, res) => {
  const current = await store.get("approvals", req.params.id);
  if (!current) return res.status(404).json({ message: "Approval not found." });
  const rejected = req.body.action === "reject";
  let status = rejected ? "Rejected" : current.currentLevel === 1 ? "Pending L2" : "Approved";
  let level = rejected ? current.currentLevel : Math.min(current.currentLevel + 1, 3);
  const timeline = current.timeline.map((step, index) => {
    if (index === current.currentLevel) return { ...step, date: new Date().toISOString(), state: rejected ? "rejected" : "done", by: `${req.user.firstName} ${req.user.lastName}` };
    if (!rejected && index === current.currentLevel + 1) return { ...step, state: "current" };
    return step;
  });
  const approval = await store.update("approvals", current.id, { status, currentLevel: level, remarks: req.body.remarks || current.remarks, timeline });
  let generated = null;
  if (status === "Approved") {
    const quotation = await store.get("quotations", current.quotationId);
    const totals = quotationTotals(quotation);
    const pos = await store.list("purchaseOrders");
    const po = await store.create("purchaseOrders", { number: `PO-${new Date().getFullYear()}-${String(pos.length + 68).padStart(4, "0")}`, quotationId: quotation.id, rfqId: quotation.rfqId, vendorId: quotation.vendorId, status: "Approved", issueDate: new Date().toISOString().slice(0, 10), total: totals.total });
    const invoices = await store.list("invoices");
    const due = new Date(); due.setDate(due.getDate() + 30);
    const invoice = await store.create("invoices", { number: `INV-${new Date().getFullYear()}-${String(invoices.length + 149).padStart(4, "0")}`, poId: po.id, vendorId: po.vendorId, issueDate: new Date().toISOString().slice(0, 10), dueDate: due.toISOString().slice(0, 10), status: "Pending Payment", ...totals });
    generated = { po, invoice };
    await activity("Purchase Order", `${po.number} and ${invoice.number} generated after approval`);
  } else {
    await activity("Approval", `Procurement request ${status.toLowerCase()} by ${req.user.firstName} ${req.user.lastName}`);
  }
  res.json({ approval, generated });
});

app.patch("/api/invoices/:id", auth, allow("Procurement Officer"), async (req, res) => {
  const invoice = await store.update("invoices", req.params.id, req.body);
  await activity("Invoice", `${invoice.number} status changed to ${invoice.status}`);
  res.json(invoice);
});

function invoicePdf(res, invoice, vendor, po) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${invoice.number}.pdf`);
  doc.pipe(res);
  doc.fontSize(28).fillColor("#6d5dfc").text("VendorBridge");
  doc.moveDown().fontSize(20).fillColor("#111827").text("TAX INVOICE");
  doc.fontSize(10).fillColor("#4b5563").text(`Invoice: ${invoice.number}`).text(`Purchase Order: ${po?.number || "-"}`).text(`Issue date: ${invoice.issueDate}`).text(`Due date: ${invoice.dueDate}`);
  doc.moveDown().fontSize(12).fillColor("#111827").text(`Vendor: ${vendor?.name || "-"}`).text(`GSTIN: ${vendor?.gst || "-"}`).text(`Contact: ${vendor?.email || "-"}`);
  doc.moveDown(2).fontSize(11).text(`Subtotal: INR ${invoice.subtotal.toLocaleString("en-IN")}`).text(`Tax: INR ${invoice.tax.toLocaleString("en-IN")}`).fontSize(14).text(`Grand total: INR ${invoice.total.toLocaleString("en-IN")}`);
  doc.moveDown(3).fontSize(9).fillColor("#6b7280").text("Generated by VendorBridge Procurement ERP");
  doc.end();
}
app.get("/api/invoices/:id/pdf", auth, async (req, res) => {
  const invoice = await store.get("invoices", req.params.id);
  if (!invoice) return res.status(404).json({ message: "Invoice not found." });
  invoicePdf(res, invoice, await store.get("vendors", invoice.vendorId), await store.get("purchaseOrders", invoice.poId));
});
app.post("/api/invoices/:id/email", auth, allow("Procurement Officer"), async (req, res) => {
  const invoice = await store.get("invoices", req.params.id);
  const vendor = await store.get("vendors", invoice.vendorId);
  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    await transporter.sendMail({ from: process.env.SMTP_USER, to: req.body.email || vendor.email, subject: `Invoice ${invoice.number}`, text: `Invoice ${invoice.number} for INR ${invoice.total.toLocaleString("en-IN")} is attached to your VendorBridge account.` });
  }
  await activity("Invoice", `${invoice.number} emailed to ${req.body.email || vendor.email}`);
  res.json({ message: `Invoice sent to ${req.body.email || vendor.email}${process.env.SMTP_HOST ? "" : " (demo mode)"}.` });
});

app.get("/api/reports/export", auth, async (_req, res) => {
  const { vendors, purchaseOrders, invoices } = await enriched();
  const rows = [["Metric", "Value"], ["Active vendors", vendors.filter((v) => v.status === "Active").length], ["Purchase orders", purchaseOrders.length], ["Invoices", invoices.length], ["Total spend", invoices.reduce((sum, i) => sum + i.total, 0)]];
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=vendorbridge-report.csv");
  res.send(rows.map((row) => row.join(",")).join("\n"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Something went wrong." });
});
app.listen(PORT, () => console.log(`VendorBridge API running on http://localhost:${PORT}`));
