export const seed = {
  users: [],
  vendors: [],
  rfqs: [],
  quotations: [],
  approvals: [],
  purchaseOrders: [],
  invoices: [],
  activities: [],
  notifications: []
};

export const quotationTotals = (quotation) => {
  const subtotal = quotation.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
  const tax = subtotal * Number(quotation.taxRate || 0) / 100;
  return { subtotal, tax, total: subtotal + tax };
};
