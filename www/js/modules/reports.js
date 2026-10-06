/* ============================================================
   Boutik v4 — التقارير
   ============================================================ */

function renderReports() {
  const invoices = DB.invoices().filter(i => i.type === 'sale');
  const total = invoices.reduce((s, i) => s + i.total, 0);
  const items = DB.invoiceItems();
  const profit = items.reduce((s, it) => {
    const inv = DB.invoices().find(i => i.id === it.invoice_id);
    if (!inv || inv.type !== 'sale') return s;
    return s + ((it.price - it.cost) * it.qty);
  }, 0);
  const debts = DB.customers().reduce((s, c) => s + (c.balance || 0), 0);
  const stockValue = DB.products().reduce((s, p) => s + (p.qty * p.price), 0);
  const stockCost = DB.products().reduce((s, p) => s + (p.qty * (p.cost || 0)), 0);

  const el = id => document.getElementById(id);
  if (el('repTotalSales')) el('repTotalSales').textContent = fmt(total);
  if (el('repProfit')) el('repProfit').textContent = fmt(profit);
  if (el('repDebts')) el('repDebts').textContent = fmt(debts);
  if (el('repInvoices')) el('repInvoices').textContent = invoices.length;
  if (el('repStockValue')) el('repStockValue').textContent = fmt(stockValue);
  if (el('repStockCost')) el('repStockCost').textContent = fmt(stockCost);

  renderTopProducts();
}

function renderTopProducts() {
  const items = DB.invoiceItems();
  const map = {};
  items.forEach(it => {
    const key = it.product_id || it.name;
    if (!map[key]) map[key] = { name: it.name, qty: 0, total: 0 };
    map[key].qty += it.qty;
    map[key].total += it.subtotal || (it.price * it.qty);
  });
  const list = Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 15);
  const el = document.getElementById('topProducts');
  if (!el) return;
  el.innerHTML = list.length ? list.map((p, i) => `
    <div class="cart-item"><span>${i + 1}. ${escapeHtml(p.name)}</span><span>${p.qty} × — ${fmt(p.total)}</span></div>
  `).join('') : '<div class="empty">لا بيانات</div>';
}

function renderPeriodReport() {
  const from = document.getElementById('repDateFrom').value;
  const to = document.getElementById('repDateTo').value;
  if (!from || !to) return toast('حدّد الفترة', true);
  const invoices = DB.invoices().filter(i =>
    i.type === 'sale' &&
    i.created_at >= from && i.created_at <= to + 'T23:59:59');
  const total = invoices.reduce((s, i) => s + i.total, 0);
  const el = document.getElementById('periodReport');
  if (!el) return;
  el.innerHTML = `
    <div class="stats">
      <div class="stat"><div class="label">عدد الفواتير</div><div class="value">${invoices.length}</div></div>
      <div class="stat"><div class="label">الإجمالي</div><div class="value">${fmt(total)}</div></div>
    </div>`;
}

function printPeriodReport() {
  const from = document.getElementById('repDateFrom').value;
  const to = document.getElementById('repDateTo').value;
  if (!from || !to) return;
  const invoices = DB.invoices().filter(i =>
    i.type === 'sale' && i.created_at >= from && i.created_at <= to + 'T23:59:59');
  const total = invoices.reduce((s, i) => s + i.total, 0);
  printHTML(`
    <div class="center"><h2>تقرير الفترة</h2></div>
    <div class="small">من ${from} إلى ${to}</div>
    <div class="dashed">
      <div class="total-row"><span>عدد الفواتير:</span><span>${invoices.length}</span></div>
      <div class="total-row"><span>الإجمالي:</span><span>${fmt(total)}</span></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>فاتورة</th><th>تاريخ</th><th>إجمالي</th></tr></thead>
      <tbody>${invoices.map((i, idx) => `<tr><td>${idx + 1}</td><td>${i.number}</td><td>${fmtDateShort(i.created_at)}</td><td>${fmtNum(i.total)}</td></tr>`).join('')}</tbody>
    </table>
  `, 'تقرير الفترة');
}

function printTopProducts() {
  const items = DB.invoiceItems();
  const map = {};
  items.forEach(it => {
    const key = it.product_id || it.name;
    if (!map[key]) map[key] = { name: it.name, qty: 0, total: 0 };
    map[key].qty += it.qty;
    map[key].total += it.subtotal || (it.price * it.qty);
  });
  const list = Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 30);
  printHTML(`
    <div class="center"><h2>الأكثر مبيعًا</h2></div>
    <table>
      <thead><tr><th>#</th><th>المنتج</th><th>الكمية</th><th>الإجمالي</th></tr></thead>
      <tbody>${list.map((p, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(p.name)}</td><td>${p.qty}</td><td>${fmtNum(p.total)}</td></tr>`).join('')}</tbody>
    </table>
  `, 'الأكثر مبيعًا');
}
