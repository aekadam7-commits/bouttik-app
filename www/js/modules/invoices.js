/* ============================================================
   Boutik v4 — الفواتير
   ============================================================ */

function renderInvoices() {
  const q = (document.getElementById('invSearch')?.value || '').toLowerCase();
  let list = DB.invoices().filter(i => i.type === 'sale').slice().reverse();
  if (q) list = list.filter(i => (i.number || '').toLowerCase().includes(q) || (i.customer_name || '').toLowerCase().includes(q));
  const tb = document.getElementById('invoicesTable');
  if (!tb) return;
  tb.innerHTML = list.length ? list.map(i => `
    <tr>
      <td>${escapeHtml(i.number)}</td>
      <td>${fmtDateShort(i.created_at)}</td>
      <td>${escapeHtml(i.customer_name || '—')}</td>
      <td>${fmt(i.total)}</td>
      <td>${statusBadge(i)}</td>
      <td>
        <button class="btn btn-info btn-sm" onclick="printInvoice('${i.id}')">🖨️</button>
        ${i.due > 0 ? `<button class="btn btn-warning btn-sm" onclick="openPayModal('${i.id}')">💰</button>` : ''}
      </td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty">لا فواتير</td></tr>';
}

function statusBadge(inv) {
  if (inv.status === 'paid') return '<span style="color:#138a45">✅ مدفوع</span>';
  if (inv.status === 'partial') return '<span style="color:#f39c12">💰 جزئي</span>';
  return '<span style="color:#e74c3c">📝 دين</span>';
}

function openPayModal(invoiceId) {
  const inv = DB.invoices().find(i => i.id === invoiceId);
  if (!inv) return;
  openModal(`
    <h3>💰 تسجيل دفعة</h3>
    <div class="small">${inv.number} — المتبقي: ${fmt(inv.due)}</div>
    <label class="lbl">المبلغ المدفوع</label>
    <input id="payAmount" type="number" inputmode="decimal" value="${inv.due}" min="0" max="${inv.due}">
    <div class="modal-actions">
      <button class="btn btn-success" onclick="confirmPay('${invoiceId}')">💾</button>
      <button class="btn btn-danger" onclick="closeModal()">إلغاء</button>
    </div>`);
}

function confirmPay(invoiceId) {
  const amt = +document.getElementById('payAmount').value || 0;
  if (amt <= 0) return;
  const inv = DB.invoices().find(i => i.id === invoiceId);
  if (!inv) return;
  const actual = Math.min(amt, inv.due);
  inv.paid = (inv.paid || 0) + actual;
  inv.due = Math.max(0, inv.due - actual);
  inv.status = inv.due === 0 ? 'paid' : (inv.paid > 0 ? 'partial' : 'credit');
  upsertRow('invoices', inv);

  // حركة دفع
  const pay = {
    id: uuid(),
    invoice_id: invoiceId,
    customer_id: inv.customer_id,
    amount: actual,
    user: currentUser.username,
    created_at: now()
  };
  upsertRow('payments', pay);

  // خصم من رصيد الزبون
  if (inv.customer_id) {
    const c = DB.customers().find(x => x.id === inv.customer_id);
    if (c) {
      c.balance = Math.max(0, (c.balance || 0) - actual);
      upsertRow('customers', c);
    }
  }

  audit('payment', `${inv.number} — ${fmt(actual)}`);
  closeModal();
  renderInvoices();
  toast('✅ تم تسجيل الدفعة');
}

function printDailyReport() {
  const today = todayISO();
  const invoices = DB.invoices().filter(i => i.type === 'sale' && i.created_at.startsWith(today));
  const total = invoices.reduce((s, i) => s + i.total, 0);
  const paid = invoices.reduce((s, i) => s + (i.paid || 0), 0);
  const due = invoices.reduce((s, i) => s + (i.due || 0), 0);
  const s = DB.settings();

  printHTML(`
    <div class="center">
      <h2>${escapeHtml(s.shopName || 'Boutik')}</h2>
      <div class="small">تقرير اليوم — ${fmtDateShort(today)}</div>
    </div>
    <div class="dashed">
      <div class="total-row"><span>عدد الفواتير:</span><span>${invoices.length}</span></div>
      <div class="total-row"><span>إجمالي المبيعات:</span><span>${fmt(total)}</span></div>
      <div class="total-row"><span>المدفوع:</span><span>${fmt(paid)}</span></div>
      <div class="total-row"><span>الباقي:</span><span>${fmt(due)}</span></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>فاتورة</th><th>زبون</th><th>إجمالي</th><th>الحالة</th></tr></thead>
      <tbody>${invoices.map((i, idx) => `<tr><td>${idx + 1}</td><td>${i.number}</td><td>${escapeHtml(i.customer_name)}</td><td>${fmtNum(i.total)}</td><td>${i.status === 'paid' ? 'مدفوع' : 'دين'}</td></tr>`).join('')}</tbody>
    </table>
  `, 'تقرير اليوم');
}
