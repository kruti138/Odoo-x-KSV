import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, AlertCircle, ArrowRight, BarChart3, Bell, Boxes, Building2, Calendar,
  Camera, Check, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, Download,
  FileCheck2, FileText, Filter, Globe2, Headphones, IndianRupee,
  LayoutDashboard, LockKeyhole, Mail, Menu, MoonStar, MoreVertical, PackageCheck,
  PanelLeftClose, Phone, Plus, Printer, ReceiptText, Search, Send, ShieldCheck,
  ShoppingCart, Sparkles, Sun, Upload, User, UserPlus, Users, X, XCircle
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const roleNavigation = {
  "Procurement Officer": [
    ["dashboard", "Dashboard", LayoutDashboard], ["vendors", "Vendors", Users],
    ["rfqs", "RFQ's", FileText], ["quotations", "Quotations", ReceiptText],
    ["approvals", "Approval Status", ClipboardCheck], ["orders", "Purchase Orders", PackageCheck],
    ["invoices", "Invoices", ReceiptText], ["activity", "Activity", Activity]
  ],
  Vendor: [
    ["dashboard", "Vendor Dashboard", LayoutDashboard], ["rfqs", "Assigned RFQ's", FileText],
    ["quotations", "My Quotations", ReceiptText], ["orders", "Purchase Orders", PackageCheck],
    ["activity", "Updates", Activity]
  ],
  "Manager / Approver": [
    ["dashboard", "Manager Dashboard", LayoutDashboard], ["approvals", "Approvals", ClipboardCheck],
    ["activity", "Approval Activity", Activity]
  ],
  Admin: [
    ["dashboard", "Admin Dashboard", LayoutDashboard], ["users", "User Management", ShieldCheck],
    ["vendors", "Vendor Management", Users], ["reports", "Analytics", BarChart3],
    ["activity", "Audit Logs", Activity]
  ]
};
const money = (value = 0) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const initials = (name = "") => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Pending";
const cx = (...classes) => classes.filter(Boolean).join(" ");

async function request(path, options = {}) {
  const token = localStorage.getItem("vb_token");
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed." }));
    throw new Error(error.message);
  }
  return response.headers.get("content-type")?.includes("application/json") ? response.json() : response.blob();
}

function Logo({ compact = false }) {
  return <div className="logo"><span className="logo-mark">VB</span>{!compact && <strong>VendorBridge</strong>}</div>;
}
function Status({ value }) {
  const key = String(value).toLowerCase().replaceAll(" ", "-");
  return <span className={`status ${key}`}><i />{value}</span>;
}
function Button({ children, className, secondary, danger, icon: Icon, ...props }) {
  return <button className={cx("btn", secondary && "secondary", danger && "danger", className)} {...props}>{Icon && <Icon size={18} />}{children}</button>;
}
function Field({ label, icon: Icon, as = "input", children, ...props }) {
  const Element = as;
  return <label className="field"><span>{label}</span><div className="input-wrap">{Icon && <Icon size={18} />}<Element {...props}>{children}</Element></div></label>;
}
function Modal({ title, children, onClose, wide }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className={cx("modal", wide && "wide")} onMouseDown={(e) => e.stopPropagation()}><header><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X /></button></header>{children}</section></div>;
}
function Empty({ title, text }) {
  return <div className="empty"><Boxes size={40} /><h3>{title}</h3><p>{text}</p></div>;
}
function PageHead({ title, subtitle, action }) {
  return <div className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function Auth({ onAuth }) {
  const [signup, setSignup] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", phone: "", role: "Procurement Officer", country: "", additionalInfo: "", companyName: "", category: "", gst: "" });
  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      if (forgot) {
        const result = await request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: form.email }) });
        setError(result.message); setForgot(false);
      } else {
        const result = await request(`/auth/${signup ? "signup" : "login"}`, { method: "POST", body: JSON.stringify(form) });
        localStorage.setItem("vb_token", result.token); onAuth(result.user);
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  return <main className="auth-page">
    <header className="auth-header"><Logo /><div><button className="icon-btn"><Sun size={20} /></button><button className="language"><Globe2 size={18} /> English <ChevronDown size={16} /></button></div></header>
    <div className={cx("auth-grid", signup && "signup-mode")}>
      {!signup && <section className="auth-pitch">
        <span className="eyebrow">Procurement & Vendor Management ERP</span>
        <h1>Simplify Procurement.<br />Strengthen Relationships.<br /><em>Drive Growth.</em></h1>
        <p>Streamline your procurement lifecycle with efficiency, transparency, and control.</p>
        <div className="feature-list">
          {[[Users, "Centralized Vendor Management", "Maintain and evaluate vendors in one place"], [FileCheck2, "End-to-End Procurement", "RFQ to invoice, all connected"], [ShieldCheck, "Secure & Role-Based Access", "Ensure data security and accountability"], [BarChart3, "Real-time Insights", "Make smarter decisions with analytics"]].map(([Icon, title, text]) => <div key={title}><span><Icon /></span><section><strong>{title}</strong><small>{text}</small></section></div>)}
        </div>
        <div className="auth-art"><BarChart3 /><ShoppingCart /><Boxes /></div>
      </section>}
      <section className="auth-card">
        {signup && <div className="photo-upload"><Camera /><strong>Upload Photo</strong><small>JPG, PNG up to 2MB</small></div>}
        {!signup && <div className="auth-emblem">VB</div>}
        <h2>{forgot ? "Reset Your Password" : signup ? "Create Your Account" : "Welcome Back"}</h2>
        <p>{forgot ? "Enter your email to receive reset instructions" : signup ? "Fill in your details to get started with VendorBridge" : "Login to continue to VendorBridge"}</p>
        <form onSubmit={submit} className={cx("auth-form", signup && "two-col")}>
          {signup && <><Field label="First Name" icon={User} placeholder="Enter your first name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /><Field label="Last Name" icon={User} placeholder="Enter your last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></>}
          <Field label="Email Address" icon={Mail} type="email" placeholder="Enter your email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          {!forgot && <Field label="Password" icon={LockKeyhole} type="password" placeholder="Enter your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />}
          {signup && <><Field label="Phone Number" icon={Phone} placeholder="Enter your phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><Field label="Role" icon={ShieldCheck} as="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{["Procurement Officer", "Vendor", "Manager / Approver", "Admin"].map((role) => <option key={role}>{role}</option>)}</Field><Field label="Country" icon={Globe2} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />{form.role === "Vendor" && <><Field label="Company / Vendor Name" icon={Building2} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required /><Field label="Vendor Category" icon={Boxes} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required /><Field label="GST Number" icon={FileText} value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })} required /></>}<Field label="Additional Information (Optional)" icon={FileText} value={form.additionalInfo} onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })} /></>}
          {!signup && !forgot && <div className="auth-options"><label><input type="checkbox" /> Remember me</label><button type="button" onClick={() => setForgot(true)}>Forgot Password?</button></div>}
          {error && <div className={cx("form-message", error.includes("prepared") && "success")}>{error}</div>}
          <Button className="gradient full" icon={signup ? UserPlus : ArrowRight} disabled={loading}>{loading ? "Please wait..." : forgot ? "Send Reset Link" : signup ? "Create Account" : "Log In"}</Button>
        </form>
        <p className="auth-switch">{signup ? "Already have an account?" : forgot ? "Remembered your password?" : "Don't have an account?"} <button onClick={() => { setSignup(!signup && !forgot); setForgot(false); setError(""); }}>{signup || forgot ? "Sign in" : "Sign up"}</button></p>
      </section>
    </div>
    <footer className="auth-footer"><span><ShieldCheck /> Enterprise Grade Security</span><span><LockKeyhole /> Your data is safe with us</span><span><Headphones /> 24/7 Customer Support</span><small>© 2026 VendorBridge. All rights reserved.</small></footer>
  </main>;
}

function Shell({ user, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState("");
  const [dark, setDark] = useState(true);
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const load = async () => setData(await request("/bootstrap"));
  useEffect(() => { load().catch((err) => setToast(err.message)); }, []);
  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const closeMenu = () => setUserMenuOpen(false);
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [userMenuOpen]);
  const notify = (message) => { setToast(message); setTimeout(() => setToast(""), 3000); };
  if (!data) return <div className="loading-screen"><Logo /><span className="spinner" /></div>;
  const context = { data, setData, reload: load, notify, user, go: setPage };
  const navItems = roleNavigation[user.role] || roleNavigation.Vendor;
  const pages = { dashboard: Dashboard, users: UserManagement, vendors: Vendors, rfqs: Rfqs, quotations: Quotations, approvals: Approvals, orders: Orders, invoices: Invoices, reports: Reports, activity: Activities };
  const Page = pages[page];
  return <div className={cx("app", !dark && "light")}>
    <aside className={cx("sidebar", collapsed && "collapsed")}>
      <div className="side-logo"><Logo compact={collapsed} /></div>
      <nav>{navItems.map(([id, label, Icon]) => <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}><Icon /><span>{label}</span></button>)}</nav>
      <div className="side-user"><span className="avatar">{initials(user.firstName + " " + user.lastName)}</span><div><strong>{user.role}</strong><small>{user.email}</small></div><ChevronDown size={16} /></div>
    </aside>
    <header className="topbar">
      <button className="icon-btn" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <Menu /> : <PanelLeftClose />}</button>
      <div className="global-search"><Search /><input placeholder="Search anything..." value={search} onChange={(e) => setSearch(e.target.value)} /><kbd>Ctrl + K</kbd></div>
      <div className="top-actions"><button className="icon-btn" onClick={() => setDark(!dark)}>{dark ? <Sun /> : <MoonStar />}</button><button className="icon-btn notification"><Bell /><b>{data.notifications.filter((n) => !n.read).length}</b></button><div className="user-menu" onClick={(e) => { e.stopPropagation(); setUserMenuOpen((value) => !value); }}>
        <span className="avatar">{initials(user.firstName + " " + user.lastName)}</span><strong>{user.role}</strong><ChevronDown />
        {userMenuOpen && <div className="user-menu-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="dropdown-profile"><strong>{user.firstName} {user.lastName}</strong><small>{user.email}</small></div>
          <button type="button" className="dropdown-item" onClick={() => { setUserMenuOpen(false); onLogout(); }}>Sign out</button>
        </div>}
      </div></div>
    </header>
    <main className="content"><Page {...context} globalSearch={search} /></main>
    {toast && <div className="toast"><CheckCircle2 />{toast}</div>}
  </div>;
}

function Metric({ icon: Icon, label, value, change, tone = "green" }) {
  return <article className="metric"><span className={`metric-icon ${tone}`}><Icon /></span><div><small>{label}</small><strong>{value}</strong><em>{change}</em></div></article>;
}
function Dashboard({ data, go, user }) {
  if (user.role === "Vendor") return <VendorDashboard data={data} go={go} user={user} />;
  if (user.role === "Manager / Approver") return <ManagerDashboard data={data} go={go} user={user} />;
  if (user.role === "Admin") return <AdminDashboard data={data} go={go} user={user} />;
  const spend = data.invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const chart = [{ month: "Jan", spend: 110000, orders: 8 }, { month: "Feb", spend: 135000, orders: 9 }, { month: "Mar", spend: 176000, orders: 12 }, { month: "Apr", spend: 228000, orders: 19 }, { month: "May", spend: 131000, orders: 11 }, { month: "Jun", spend: spend || 207090, orders: data.purchaseOrders.length + 8 }];
  return <>
    <PageHead title="Dashboard" subtitle={`Welcome back, ${user.firstName} — Today's Overview`} />
    <div className="metrics"><Metric icon={FileText} label="Active RFQ's" value={data.rfqs.filter((r) => r.status === "Open").length} change="+18.5% from last week" /><Metric icon={Users} label="Pending Approvals" value={data.approvals.filter((a) => a.status.includes("Pending")).length} change="+7.2% from last week" tone="purple" /><Metric icon={IndianRupee} label="Total Spend" value={money(spend)} change="+12.8% from last month" tone="blue" /><Metric icon={AlertCircle} label="Overdue Invoices" value={data.invoices.filter((i) => new Date(i.dueDate) < new Date() && i.status !== "Paid").length} change="Needs attention" tone="orange" /></div>
    <div className="dashboard-grid">
      <section className="panel"><header><h2>Recent Purchase Orders</h2><Button secondary onClick={() => go("orders")}>View All</Button></header><div className="table-scroll"><table><thead><tr><th>PO#</th><th>Vendor</th><th>Amount</th><th>Status</th></tr></thead><tbody>{data.purchaseOrders.slice(0, 5).map((po) => <tr key={po.id}><td>{po.number}</td><td><div className="vendor-cell"><span className="mini-avatar">{initials(po.vendor?.name)}</span>{po.vendor?.name}</div></td><td>{money(po.total)}</td><td><Status value={po.status} /></td></tr>)}</tbody></table></div></section>
      <section className="panel chart-panel"><header><h2>Spending Trends <small>last 6 months</small></h2><span className="select-pill">6 Months <ChevronDown /></span></header><ResponsiveContainer width="100%" height={300}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#1f3142" vertical={false} /><XAxis dataKey="month" stroke="#8190a5" /><YAxis stroke="#8190a5" /><Tooltip contentStyle={{ background: "#0c1928", border: "1px solid #26384c" }} /><Legend /><Bar dataKey="spend" fill="#6948db" radius={[6, 6, 0, 0]} /><Line type="monotone" dataKey="orders" stroke="#4ade80" /></BarChart></ResponsiveContainer></section>
    </div>
    <section className="panel quick"><header><h2>Quick Actions</h2></header><div className="quick-grid">{[[Plus, "New RFQ", "Create a new RFQ", "rfqs", "green"], [UserPlus, "Add Vendor", "Register a new vendor", "vendors", "purple"], [ReceiptText, "View Invoices", "View all invoices", "invoices", "blue"], [FileCheck2, "Purchase Orders", "Manage official POs", "orders", "orange"]].map(([Icon, title, text, target, tone]) => <button key={title} onClick={() => go(target)}><span className={`quick-icon ${tone}`}><Icon /></span><div><strong>{title}</strong><small>{text}</small></div><ArrowRight /></button>)}</div></section>
  </>;
}

function VendorDashboard({ data, go, user }) {
  const openRfqs = data.rfqs.filter((rfq) => rfq.status === "Open");
  return <>
    <PageHead title="Vendor Dashboard" subtitle={`Welcome, ${user.firstName} — manage invitations and commercial responses`} />
    <div className="metrics">
      <Metric icon={FileText} label="Assigned RFQ's" value={data.rfqs.length} change="Requests shared with your company" />
      <Metric icon={ReceiptText} label="Submitted Quotations" value={data.quotations.filter((q) => q.status === "Submitted").length} change="Your submitted responses" tone="purple" />
      <Metric icon={Clock3} label="Open Invitations" value={openRfqs.length} change="Available for quotation" tone="orange" />
      <Metric icon={PackageCheck} label="Purchase Orders" value={data.purchaseOrders.length} change="Orders awarded to you" tone="blue" />
    </div>
    <div className="vendor-dashboard-grid">
      <section className="panel"><header><h2>RFQ Invitations</h2><Button secondary onClick={() => go("rfqs")}>View All</Button></header>
        <div className="role-card-list">{openRfqs.map((rfq) => <article key={rfq.id}><span className="doc-icon"><FileText /></span><div><strong>{rfq.title}</strong><small>{rfq.number} · Due {date(rfq.deadline)}</small></div><Button onClick={() => go("quotations")}>Submit Quote</Button></article>)}</div>
      </section>
      <section className="panel"><header><h2>My Recent Quotations</h2><Button secondary onClick={() => go("quotations")}>Manage</Button></header>
        <div className="role-card-list">{data.quotations.map((quote) => <article key={quote.id}><span className="doc-icon purple-doc"><ReceiptText /></span><div><strong>{quote.rfq?.title}</strong><small>{money(quote.total)} · {quote.deliveryDays} day delivery</small></div><Status value={quote.status} /></article>)}</div>
      </section>
    </div>
  </>;
}

function ManagerDashboard({ data, go, user }) {
  const pending = data.approvals.filter((approval) => approval.status.includes("Pending"));
  return <>
    <PageHead title="Manager Dashboard" subtitle={`Welcome, ${user.firstName} — review and control procurement approvals`} />
    <div className="metrics">
      <Metric icon={Clock3} label="Pending Decisions" value={pending.length} change="Requests waiting for your review" tone="orange" />
      <Metric icon={CheckCircle2} label="Approved" value={data.approvals.filter((a) => a.status === "Approved").length} change="Completed workflows" />
      <Metric icon={XCircle} label="Rejected" value={data.approvals.filter((a) => a.status === "Rejected").length} change="Requests returned" tone="purple" />
      <Metric icon={IndianRupee} label="Value Under Review" value={money(pending.reduce((sum, approval) => sum + (data.quotations.find((q) => q.id === approval.quotationId)?.total || 0), 0))} change="Pending procurement value" tone="blue" />
    </div>
    <section className="panel manager-queue"><header><h2>Approval Queue</h2><Button onClick={() => go("approvals")}>Open Approval Center</Button></header>
      <div className="table-scroll"><table><thead><tr><th>Request</th><th>Selected Vendor</th><th>Value</th><th>Stage</th><th></th></tr></thead><tbody>{pending.map((approval) => <tr key={approval.id}><td><strong>{approval.rfq?.title}</strong></td><td>{approval.vendor?.name}</td><td>{money(data.quotations.find((q) => q.id === approval.quotationId)?.total)}</td><td><Status value={approval.status} /></td><td><Button secondary onClick={() => go("approvals")}>Review</Button></td></tr>)}</tbody></table></div>
    </section>
  </>;
}

function AdminDashboard({ data, go, user }) {
  const activeUsers = data.users.filter((account) => account.status !== "Disabled").length;
  return <>
    <PageHead title="Admin Dashboard" subtitle={`Welcome, ${user.firstName} — platform administration and governance`} />
    <div className="metrics">
      <Metric icon={ShieldCheck} label="Platform Users" value={data.users.length} change={`${activeUsers} accounts enabled`} tone="purple" />
      <Metric icon={Users} label="Registered Vendors" value={data.vendors.length} change={`${data.vendors.filter((v) => v.status === "Active").length} active suppliers`} />
      <Metric icon={Boxes} label="Vendor Categories" value={new Set(data.vendors.map((v) => v.category)).size} change="Categories configured" tone="blue" />
      <Metric icon={Activity} label="Audit Events" value={data.activities.length} change="Tracked system activities" tone="orange" />
    </div>
    <div className="admin-action-grid">
      <button onClick={() => go("users")}><ShieldCheck /><div><strong>User & Role Management</strong><small>Control accounts and platform permissions</small></div><ArrowRight /></button>
      <button onClick={() => go("vendors")}><Users /><div><strong>Vendor Administration</strong><small>Verify and manage supplier records</small></div><ArrowRight /></button>
      <button onClick={() => go("reports")}><BarChart3 /><div><strong>Procurement Analytics</strong><small>Review organization-wide performance</small></div><ArrowRight /></button>
      <button onClick={() => go("activity")}><Activity /><div><strong>System Audit Logs</strong><small>Inspect traceable platform activity</small></div><ArrowRight /></button>
    </div>
  </>;
}

function UserManagement({ data, reload, notify }) {
  const update = async (id, changes) => {
    await request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
    await reload();
    notify("User access updated.");
  };
  return <>
    <PageHead title="User Management" subtitle="Administer accounts, roles and platform access" />
    <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Country</th><th>Status</th></tr></thead><tbody>{data.users.map((account) => <tr key={account.id}><td><div className="vendor-cell"><span className="mini-avatar">{initials(`${account.firstName} ${account.lastName}`)}</span><strong>{account.firstName} {account.lastName}</strong></div></td><td>{account.email}</td><td><select className="inline-select" value={account.role} onChange={(event) => update(account.id, { role: event.target.value })}>{["Procurement Officer", "Vendor", "Manager / Approver", "Admin"].map((role) => <option key={role}>{role}</option>)}</select></td><td>{account.country || "—"}</td><td><select className="inline-select" value={account.status || "Active"} onChange={(event) => update(account.id, { status: event.target.value })}><option>Active</option><option>Disabled</option></select></td></tr>)}</tbody></table></div></section>
  </>;
}

function Vendors({ data, reload, notify, globalSearch, user }) {
  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", category: "", gst: "", contact: "", email: "", status: "Pending" });
  const filtered = data.vendors.filter((v) => (filter === "All" || v.status === filter) && `${v.name} ${v.category} ${v.gst}`.toLowerCase().includes(`${search} ${globalSearch}`.trim().toLowerCase()));
  const save = async (e) => { e.preventDefault(); await request("/vendors", { method: "POST", body: JSON.stringify(form) }); await reload(); setModal(false); notify("Vendor registered successfully."); };
  const updateVendorStatus = async (vendorId, status) => {
    await request(`/vendors/${vendorId}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await reload();
    notify(`Vendor status changed to ${status}.`);
  };
  return <>
    <PageHead title="Vendors" subtitle="Manage supplier profiles and registrations" action={user.role === "Admin" ? <Button icon={Plus} onClick={() => setModal(true)}>Add Vendor</Button> : null} />
    <div className="search-row"><div className="search-box"><Search /><input placeholder="Search by name, GST number, category..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><button className="icon-btn bordered"><Filter /></button></div>
    <div className="tabs">{["All", "Active", "Pending", "Blocked"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item} ({item === "All" ? data.vendors.length : data.vendors.filter((v) => v.status === item).length})</button>)}</div>
    <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Vendor Name</th><th>Category</th><th>GST No.</th><th>Contact</th><th>Status</th><th>Rating</th><th>Action</th></tr></thead><tbody>{filtered.map((vendor) => <tr key={vendor.id}><td><div className="vendor-cell"><span className="mini-avatar">{initials(vendor.name)}</span><strong>{vendor.name}</strong></div></td><td><span className="category"><Building2 />{vendor.category}</span></td><td>{vendor.gst}</td><td>{vendor.contact}</td><td><Status value={vendor.status} /></td><td>★ {vendor.rating || "New"}</td><td><Button secondary>View</Button> {user.role === "Admin" && vendor.status === "Pending" && <Button icon={CheckCircle2} onClick={() => updateVendorStatus(vendor.id, "Active")}>Activate</Button>} <MoreVertical className="row-more" /></td></tr>)}</tbody></table></div></section>
    {modal && <Modal title="Register New Vendor" onClose={() => setModal(false)}><form className="form-grid" onSubmit={save}><Field label="Vendor Name" icon={Building2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><Field label="Category" icon={Boxes} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required /><Field label="GST Number" icon={FileText} value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })} required /><Field label="Contact Number" icon={Phone} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /><Field label="Email" icon={Mail} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /><Field label="Status" as="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{["Pending", "Active", "Blocked"].map((s) => <option key={s}>{s}</option>)}</Field><div className="modal-actions"><Button secondary type="button" onClick={() => setModal(false)}>Cancel</Button><Button icon={Plus}>Register Vendor</Button></div></form></Modal>}
  </>;
}

function Rfqs({ data, reload, notify, user }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", category: "", description: "", deadline: "", vendorIds: [], items: [{ name: "", quantity: 1, unit: "Nos" }], status: "Open" });
  const canCreate = ["Procurement Officer", "Admin"].includes(user.role);
  const updateItem = (index, key, value) => setForm({ ...form, items: form.items.map((item, i) => i === index ? { ...item, [key]: value } : item) });
  const submit = async (e) => { e.preventDefault(); await request("/rfqs", { method: "POST", body: JSON.stringify(form) }); await reload(); setModal(false); notify("RFQ published and vendors notified."); };
  return <>
    <PageHead title={user.role === "Vendor" ? "Assigned RFQ Invitations" : "Request for Quotations"} subtitle={user.role === "Vendor" ? "Review procurement requests shared with your company" : "Create, publish and track procurement requests"} action={canCreate && <Button icon={Plus} onClick={() => setModal(true)}>Create RFQ</Button>} />
    <div className="card-grid">{data.rfqs.map((rfq) => <article className="rfq-card" key={rfq.id}><header><span className="doc-icon"><FileText /></span><Status value={rfq.status} /></header><small>{rfq.number}</small><h3>{rfq.title}</h3><p>{rfq.description}</p><div className="rfq-meta"><span><Boxes />{rfq.items.length} line items</span><span><Users />{rfq.vendorIds.length} vendors</span><span><Calendar />Due {date(rfq.deadline)}</span></div><footer><span>{rfq.category}</span><Button secondary>View Details</Button></footer></article>)}</div>
    {modal && <Modal title="Create New RFQ" wide onClose={() => setModal(false)}><form onSubmit={submit}>
      <div className="form-grid"><Field label="RFQ Title" icon={FileText} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /><Field label="Category" icon={Boxes} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required /><Field label="Deadline" icon={Calendar} type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required /><Field label="Description" icon={FileText} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <h3 className="form-section-title">Line Items</h3>{form.items.map((item, i) => <div className="line-item" key={i}><input placeholder="Product or service" value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} required /><input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} /><input value={item.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} /><button type="button" className="icon-btn" onClick={() => setForm({ ...form, items: form.items.filter((_, index) => index !== i) })}><X /></button></div>)}<Button secondary type="button" icon={Plus} onClick={() => setForm({ ...form, items: [...form.items, { name: "", quantity: 1, unit: "Nos" }] })}>Add Line Item</Button>
      <h3 className="form-section-title">Assign Vendors</h3><div className="check-grid">{data.vendors.filter((v) => v.status === "Active").map((v) => <label key={v.id}><input type="checkbox" checked={form.vendorIds.includes(v.id)} onChange={() => setForm({ ...form, vendorIds: form.vendorIds.includes(v.id) ? form.vendorIds.filter((id) => id !== v.id) : [...form.vendorIds, v.id] })} /><span className="mini-avatar">{initials(v.name)}</span>{v.name}</label>)}</div>
      <div className="upload-zone"><Upload /><strong>Drop attachments here or click to upload</strong><small>PDF, DOCX, XLSX up to 10MB</small></div>
      <div className="modal-actions"><Button secondary type="button" onClick={() => setModal(false)}>Save as Draft</Button><Button icon={Send}>Save & Send to Vendors</Button></div>
    </form></Modal>}
  </>;
}

function Quotations({ data, reload, notify, user }) {
  const [selectedRfq, setSelectedRfq] = useState(data.rfqs[0]?.id);
  const [submitModal, setSubmitModal] = useState(false);
  const rfq = data.rfqs.find((r) => r.id === selectedRfq);
  const quotes = data.quotations.filter((q) => q.rfqId === selectedRfq).sort((a, b) => a.total - b.total);
  const [form, setForm] = useState({ deliveryDays: 7, taxRate: 18, paymentTerms: "30 days", notes: "", items: [] });
  useEffect(() => { if (rfq) setForm((old) => ({ ...old, items: rfq.items.map((item) => ({ ...item, unitPrice: 0 })) })); }, [selectedRfq]);
  const submit = async (e) => { e.preventDefault(); const vendorId = user.vendorId || data.vendors[0].id; await request("/quotations", { method: "POST", body: JSON.stringify({ ...form, rfqId: selectedRfq, vendorId, status: "Submitted" }) }); await reload(); setSubmitModal(false); notify("Quotation submitted successfully."); };
  const select = async (quote) => { await request("/approvals", { method: "POST", body: JSON.stringify({ rfqId: quote.rfqId, quotationId: quote.id }) }); await reload(); notify("Vendor selected and approval initiated."); };
  if (user.role === "Vendor") return <VendorQuotationWorkspace data={data} rfq={rfq} quotes={quotes} selectedRfq={selectedRfq} setSelectedRfq={setSelectedRfq} submitModal={submitModal} setSubmitModal={setSubmitModal} form={form} setForm={setForm} submit={submit} />;
  return <>
    <PageHead title="Quotation Comparison" subtitle="Compare price, delivery, ratings and commercial terms" action={<div className="head-actions"><select value={selectedRfq} onChange={(e) => setSelectedRfq(e.target.value)}>{data.rfqs.map((r) => <option value={r.id} key={r.id}>{r.title}</option>)}</select>{["Vendor", "Admin"].includes(user.role) && <Button icon={Plus} onClick={() => setSubmitModal(true)}>Submit Quotation</Button>}</div>} />
    <section className="comparison panel"><header><div><small>{rfq?.number}</small><h2>{rfq?.title}</h2><p>{quotes.length} quotations received · Deadline {date(rfq?.deadline)}</p></div><div className="legend-low"><i /> Lowest total</div></header>
      {quotes.length ? <div className="comparison-grid">
        <div className="criteria"><strong>Criteria</strong>{["Grand Total", "Tax", "Delivery", "Vendor Rating", "Payment Terms", "Decision"].map((item) => <span key={item}>{item}</span>)}</div>
        {quotes.map((quote, index) => <div className={cx("quote-column", index === 0 && "lowest")} key={quote.id}><strong>{quote.vendor?.name}{index === 0 && <small>Best Value</small>}</strong><span className="quote-total">{money(quote.total)}</span><span>{money(quote.tax)} ({quote.taxRate}%)</span><span>{quote.deliveryDays} days</span><span>★ {quote.vendor?.rating}/5</span><span>{quote.paymentTerms}</span><span>{["Procurement Officer", "Admin"].includes(user.role) ? <Button secondary={index !== 0} onClick={() => select(quote)}>Select {index === 0 && "& Approve"}</Button> : <Status value={quote.status} />}</span></div>)}
      </div> : <Empty title="No quotations yet" text="Assigned vendors can submit pricing against this RFQ." />}
    </section>
    {submitModal && <Modal title={`Submit Quotation · ${rfq?.title}`} wide onClose={() => setSubmitModal(false)}><form onSubmit={submit}>{form.items.map((item, i) => <div className="quote-line" key={item.name}><strong>{item.name}</strong><span>Qty {item.quantity}</span><Field label="Unit Price" icon={IndianRupee} type="number" min="0" value={item.unitPrice} onChange={(e) => setForm({ ...form, items: form.items.map((it, index) => index === i ? { ...it, unitPrice: Number(e.target.value) } : it) })} required /></div>)}<div className="form-grid"><Field label="Tax / GST %" type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} /><Field label="Delivery (days)" icon={Clock3} type="number" value={form.deliveryDays} onChange={(e) => setForm({ ...form, deliveryDays: Number(e.target.value) })} /><Field label="Payment Terms" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} /><Field label="Notes / Comments" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div><div className="modal-actions"><Button secondary type="button">Save Draft</Button><Button icon={Send}>Submit Quotation</Button></div></form></Modal>}
  </>;
}

function VendorQuotationWorkspace({ data, rfq, quotes, selectedRfq, setSelectedRfq, submitModal, setSubmitModal, form, setForm, submit }) {
  return <>
    <PageHead title="My Quotations" subtitle="Prepare, edit and track your commercial responses" action={<div className="head-actions"><select value={selectedRfq} onChange={(e) => setSelectedRfq(e.target.value)}>{data.rfqs.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select><Button icon={Plus} onClick={() => setSubmitModal(true)}>{quotes.length ? "Update Quotation" : "Submit Quotation"}</Button></div>} />
    <section className="panel vendor-quote-workspace"><header><div><small>{rfq?.number}</small><h2>{rfq?.title}</h2><p>Deadline {date(rfq?.deadline)} · {rfq?.items.length} requested items</p></div><Status value={rfq?.status || "Open"} /></header>
      <div className="requested-items"><h3>Requested Items</h3>{rfq?.items.map((item) => <div key={item.name}><strong>{item.name}</strong><span>{item.quantity} {item.unit}</span></div>)}</div>
      {quotes.length ? <div className="my-quote-card"><div><small>Your submitted total</small><strong>{money(quotes[0].total)}</strong></div><div><small>Delivery commitment</small><strong>{quotes[0].deliveryDays} days</strong></div><div><small>Payment terms</small><strong>{quotes[0].paymentTerms}</strong></div><Status value={quotes[0].status} /></div> : <Empty title="No quotation submitted" text="Submit your pricing before the RFQ deadline." />}
    </section>
    {submitModal && <Modal title={`${quotes.length ? "Update" : "Submit"} Quotation · ${rfq?.title}`} wide onClose={() => setSubmitModal(false)}><form onSubmit={submit}>{form.items.map((item, i) => <div className="quote-line" key={item.name}><strong>{item.name}</strong><span>Qty {item.quantity}</span><Field label="Unit Price" icon={IndianRupee} type="number" min="0" value={item.unitPrice} onChange={(e) => setForm({ ...form, items: form.items.map((it, index) => index === i ? { ...it, unitPrice: Number(e.target.value) } : it) })} required /></div>)}<div className="form-grid"><Field label="Tax / GST %" type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} /><Field label="Delivery (days)" icon={Clock3} type="number" value={form.deliveryDays} onChange={(e) => setForm({ ...form, deliveryDays: Number(e.target.value) })} /><Field label="Payment Terms" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} /><Field label="Notes / Comments" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div><div className="modal-actions"><Button secondary type="button">Save Draft</Button><Button icon={Send}>{quotes.length ? "Update Quotation" : "Submit Quotation"}</Button></div></form></Modal>}
  </>;
}

function Approvals({ data, reload, notify, user }) {
  const [selected, setSelected] = useState(data.approvals[0]);
  const [remarks, setRemarks] = useState("");
  const decide = async (action) => { const result = await request(`/approvals/${selected.id}`, { method: "PATCH", body: JSON.stringify({ action, remarks }) }); await reload(); setSelected(result.approval); notify(result.generated ? `${result.generated.po.number} and invoice generated.` : `Request ${action}d.`); };
  const canApprove = ["Manager / Approver", "Admin"].includes(user.role);
  return <>
    <PageHead title="Approval Workflow" subtitle="Review requests and monitor structured approval transitions" />
    <div className="approval-layout"><section className="approval-list">{data.approvals.map((approval) => <button className={selected?.id === approval.id ? "active" : ""} key={approval.id} onClick={() => setSelected(approval)}><span className="doc-icon"><ClipboardCheck /></span><div><strong>{approval.rfq?.title}</strong><small>{approval.vendor?.name}</small><Status value={approval.status} /></div></button>)}</section>
      {selected ? <section className="panel approval-detail"><header><div><small>{selected.rfq?.number}</small><h2>{selected.rfq?.title}</h2><p>Vendor: {selected.vendor?.name}</p></div><Status value={selected.status} /></header>
        <div className="timeline">{selected.timeline.map((step, index) => <div className={step.state} key={step.label}><span>{step.state === "done" ? <Check /> : step.state === "rejected" ? <X /> : index + 1}</span><strong>{step.label}</strong><small>{step.by}<br />{date(step.date)}</small></div>)}</div>
        <div className="approval-content"><section><h3>Approval Chain</h3>{selected.timeline.slice(0, 3).map((step) => <div className="chain" key={step.label}><span className="avatar">{initials(step.by)}</span><div><strong>{step.by}</strong><small>{step.label} · {step.state}</small></div></div>)}<Field label="Approval Remarks" as="textarea" rows="5" placeholder="Add comments or conditions..." value={remarks} onChange={(e) => setRemarks(e.target.value)} /></section>
          <section className="summary-card"><h3>Quotation Summary</h3><p><span>Vendor</span><strong>{selected.vendor?.name}</strong></p><p><span>Total</span><strong>{money(selected.quotation ? data.quotations.find((q) => q.id === selected.quotationId)?.total : 0)}</strong></p><p><span>Delivery</span><strong>{selected.quotation?.deliveryDays} days</strong></p><p><span>Rating</span><strong>★ {selected.vendor?.rating}/5</strong></p>{canApprove && selected.status.includes("Pending") && <div className="decision"><Button icon={CheckCircle2} onClick={() => decide("approve")}>Approve</Button><Button danger icon={XCircle} onClick={() => decide("reject")}>Reject</Button></div>}</section>
        </div>
      </section> : <Empty title="No approval selected" text="Select a workflow from the left." />}</div>
  </>;
}

function Orders({ data, user }) {
  return <><PageHead title={user.role === "Vendor" ? "Purchase Orders Received" : "Purchase Orders"} subtitle={user.role === "Vendor" ? "View official orders awarded to your company" : "Official orders generated from approved quotations"} /><section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>PO Number</th>{user.role !== "Vendor" && <th>Vendor</th>}<th>RFQ</th><th>Issue Date</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{data.purchaseOrders.map((po) => <tr key={po.id}><td><strong>{po.number}</strong></td>{user.role !== "Vendor" && <td>{po.vendor?.name}</td>}<td>{po.rfq?.title}</td><td>{date(po.issueDate)}</td><td>{money(po.total)}</td><td><Status value={po.status} /></td><td><Button secondary>View Order</Button></td></tr>)}</tbody></table></div></section></>;
}

function Invoices({ data, reload, notify, user }) {
  const [selected, setSelected] = useState(null);
  const canManage = ["Procurement Officer", "Admin"].includes(user.role);
  const download = async (invoice) => {
    const blob = await request(`/invoices/${invoice.id}/pdf`);
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${invoice.number}.pdf`; a.click(); URL.revokeObjectURL(url);
  };
  const email = async (invoice) => { const result = await request(`/invoices/${invoice.id}/email`, { method: "POST", body: JSON.stringify({ email: invoice.vendor?.email }) }); notify(result.message); };
  const markPaid = async (invoice) => { await request(`/invoices/${invoice.id}`, { method: "PATCH", body: JSON.stringify({ status: "Paid" }) }); await reload(); notify("Invoice marked as paid."); };
  return <>
    <PageHead title="Invoices" subtitle="Generate, deliver and track procurement invoices" />
    <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Invoice</th><th>Purchase Order</th><th>Vendor</th><th>Due Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.number}</strong></td><td>{invoice.purchaseOrder?.number}</td><td>{invoice.vendor?.name}</td><td>{date(invoice.dueDate)}</td><td>{money(invoice.total)}</td><td><Status value={invoice.status} /></td><td className="actions"><button title="View" onClick={() => setSelected(invoice)}><FileText /></button><button title="Download PDF" onClick={() => download(invoice)}><Download /></button><button title="Print" onClick={() => { setSelected(invoice); setTimeout(() => window.print(), 100); }}><Printer /></button>{canManage && <button title="Email" onClick={() => email(invoice)}><Mail /></button>}</td></tr>)}</tbody></table></div></section>
    {selected && <Modal title={`Invoice ${selected.number}`} wide onClose={() => setSelected(null)}><div className="invoice-document"><header><Logo /><div><h2>TAX INVOICE</h2><Status value={selected.status} /></div></header><div className="invoice-parties"><section><small>Bill To</small><strong>VendorBridge Demo Organization</strong><p>123 Business Park, Ahmedabad<br />GSTIN: 25B34S34FB</p></section><section><small>Vendor</small><strong>{selected.vendor?.name}</strong><p>{selected.vendor?.email}<br />GSTIN: {selected.vendor?.gst}</p></section></div><div className="invoice-meta"><span>PO Number <strong>{selected.purchaseOrder?.number}</strong></span><span>Invoice Date <strong>{date(selected.issueDate)}</strong></span><span>Due Date <strong>{date(selected.dueDate)}</strong></span></div><div className="invoice-totals"><p><span>Subtotal</span><strong>{money(selected.subtotal)}</strong></p><p><span>GST</span><strong>{money(selected.tax)}</strong></p><p className="grand"><span>Grand Total</span><strong>{money(selected.total)}</strong></p></div></div><div className="modal-actions"><Button secondary icon={Download} onClick={() => download(selected)}>Download PDF</Button><Button secondary icon={Printer} onClick={() => window.print()}>Print</Button>{canManage && <Button secondary icon={Mail} onClick={() => email(selected)}>Email Invoice</Button>}{canManage && selected.status !== "Paid" && <Button icon={Check} onClick={() => markPaid(selected)}>Mark as Paid</Button>}</div></Modal>}
  </>;
}

function Activities({ data, user }) {
  const [filter, setFilter] = useState("All");
  const activities = data.activities.filter((a) => filter === "All" || a.type === filter);
  const labels = user.role === "Vendor" ? ["All", "RFQ", "Quotation", "Purchase Order"] : user.role === "Manager / Approver" ? ["All", "Approval", "Quotation", "Purchase Order"] : ["All", "RFQ", "Approval", "Invoice", "Vendor"];
  return <><PageHead title={user.role === "Admin" ? "System Audit Logs" : user.role === "Vendor" ? "Vendor Updates" : user.role === "Manager / Approver" ? "Approval Activity" : "Activity & Logs"} subtitle={user.role === "Admin" ? "Traceable organization-wide platform activity" : "Updates relevant to your procurement workflow"} /><div className="tabs">{labels.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><section className="panel activity-panel">{activities.map((item) => <article key={item.id}><span className={`activity-icon ${item.type.toLowerCase()}`}>{item.type === "Approval" ? <Clock3 /> : item.type === "RFQ" ? <FileText /> : item.type === "Vendor" ? <Users /> : <CheckCircle2 />}</span><div><strong>{item.message}</strong><small>{new Date(item.date).toLocaleString("en-IN")}</small></div></article>)}</section></>;
}

function Reports({ data, notify }) {
  const total = data.invoices.reduce((sum, i) => sum + i.total, 0);
  const category = Object.values(data.purchaseOrders.reduce((acc, po) => { const key = po.rfq?.category || "Other"; acc[key] ||= { name: key, value: 0 }; acc[key].value += po.total; return acc; }, {}));
  const monthly = [{ name: "Jan", spend: 145000 }, { name: "Feb", spend: 185000 }, { name: "Mar", spend: 210000 }, { name: "Apr", spend: 198000 }, { name: "May", spend: 245000 }, { name: "Jun", spend: total }];
  const exportReport = async () => { const blob = await request("/reports/export"); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "vendorbridge-report.csv"; a.click(); notify("Report exported successfully."); };
  return <>
    <PageHead title="Reports & Analytics" subtitle="Procurement insights and performance trends" action={<div className="head-actions"><span className="select-pill">June 2026 <ChevronDown /></span><Button secondary icon={Download} onClick={exportReport}>Export</Button></div>} />
    <div className="metrics report-metrics"><Metric icon={IndianRupee} label="Total Spend" value={money(total)} change="Current reporting period" tone="blue" /><Metric icon={Users} label="Active Vendors" value={data.vendors.filter((v) => v.status === "Active").length} change="Across all categories" /><Metric icon={PackageCheck} label="PO Fulfillment" value="94%" change="+4% from last month" tone="orange" /><Metric icon={Clock3} label="Pending Approvals" value={data.approvals.filter((a) => a.status.includes("Pending")).length} change="Requires review" tone="purple" /></div>
    <div className="reports-grid"><section className="panel"><header><h2>Monthly Procurement Trend</h2></header><ResponsiveContainer width="100%" height={300}><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" stroke="#1f3142" vertical={false} /><XAxis dataKey="name" stroke="#8190a5" /><YAxis stroke="#8190a5" /><Tooltip contentStyle={{ background: "#0c1928", border: "1px solid #26384c" }} /><Bar dataKey="spend" fill="#6254e8" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></section><section className="panel"><header><h2>Spend by Category</h2></header>{category.length ? <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={category} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} paddingAngle={4}>{category.map((_, index) => <Cell key={index} fill={["#5ee38d", "#6d5dfc", "#3185f6", "#f59e0b"][index % 4]} />)}</Pie><Tooltip contentStyle={{ background: "#0c1928", border: "1px solid #26384c" }} /><Legend /></PieChart></ResponsiveContainer> : <Empty title="No category spend yet" text="Approved purchase orders will appear here." />}</section></div>
    <section className="panel top-vendors"><header><h2>Top Vendors by Spend</h2></header>{data.purchaseOrders.map((po, index) => <div key={po.id}><span>{index + 1}</span><span className="mini-avatar">{initials(po.vendor?.name)}</span><strong>{po.vendor?.name}</strong><em>★ {po.vendor?.rating}</em><b>{money(po.total)}</b></div>)}</section>
  </>;
}

function App() {
  const [user, setUser] = useState(null);
  useEffect(() => { if (localStorage.getItem("vb_token")) request("/auth/me").then(setUser).catch(() => localStorage.removeItem("vb_token")); }, []);
  return user ? <Shell user={user} onLogout={() => { localStorage.removeItem("vb_token"); setUser(null); }} /> : <Auth onAuth={setUser} />;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
