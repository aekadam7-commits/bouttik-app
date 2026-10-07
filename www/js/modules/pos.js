/* ============================================================
   Boutik v4 — نقطة البيع (طباعة عند البيع)
   ============================================================ */

let cart = [];
let payType = 'cash';

function renderPOSCustomers() {
  const sel = document.getElementById('posCustomer');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">زبون عادي</option>' +
    DB.customers().map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${fmtNum(c.balance || 0)})</option>`).join('');
  if (cur) sel.value = cur;
}

function searchPOS() {
  const q = (document.getElementById('posSearch').value || '').trim().toLowerCase();
  const res = document.getElementById('posResults');
  if (!q) { res.innerHTML = ''; return; }
  const products = DB.products().filter(p =>
    (p.name && p.name.toLowerCase().includes(q)) ||
    (p.barcode && p.barcode.toLowerCase().includes(q))
  ).slice(0, 20);

  if (!products.length) { res.innerHTML = '<div class="empty">لا نتائج</div>'; return; }
  res.innerHTML = products.map(p => `
    <div class="cart-item" onclick="addToCart('${p.id}')" style="cursor:pointer">
      <div>
        <strong>${escapeHtml(p.name)}</strong>
        <div class="small">${escapeHtml(p.barcode || '')} — ${fmt(p.price)}</div>
      </div>
      <div><b>${p.qty}</b></div>
    </div>
  `).join('');
}

function addToCart(productId) {
  const p = DB.products().find(x => x.id === productId);
  if (!p) return;
  if (p.qty <= 0) { toast('⚠️ الكمية نفدت', true); return; }
  const item = cart.find(x => x.product_id === productId);
  if (item) {
    if (item.qty + 1 > p.qty) { toast('⚠️ الكمية غير كافية', true); return; }
    item.qty++;
  } else {
    cart.push({
      product_id: p.id, name: p.name, barcode: p.barcode || '',
      price: p.price, cost: p.cost || 0, qty: 1
    });
  }
  renderCart();
}

function addFreeItem() {
  openModal(`
    <h3>➕ مادة حرة</h3>
    <label class="lbl">الاسم</label><input id="freeName">
    <label class="lbl">السعر</label><input id="freePrice" type="number" inputmode="decimal" value="0">
    <label class="lbl">الكمية</label><input id="freeQty" type="number" inputmode="numeric" value="1">
    <label class="lbl">سعر الشراء</label><input id="freeCost" type="number" inputmode="decimal" value="0">
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="confirmFreeItem()">إضافة</button>
      <button class="btn btn-danger" onclick="closeModal()">إلغاء</button>
    </div>`);
}

function confirmFreeItem() {
  const name = document.getElementById('freeName').value.trim();
  const price = +document.getElementById('freePrice').value || 0;
  const qty = +document.getElementById('freeQty').value || 1;
  const cost = +document.getElementById('freeCost').value || 0;
  if (!name) return;
  cart.push({ product_id: null, name, price, cost, qty, free: true });
  renderCart();
  closeModal();
}

function addCashLoan() {
  openModal(`
    <h3>💵 سلفة مالية</h3>
    <label class="lbl">المبلغ</label><input id="loanAmt" type="number" inputmode="decimal" value="0">
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="confirmCashLoan()">إضافة</button>
      <button class="btn btn-danger" onclick="closeModal()">إلغاء</button>
    </div>`);
}

function confirmCashLoan() {
  const amt = +document.getElementById('loanAmt').value || 0;
  if (!amt) return;
  cart.push({ product_id: null, name: 'سلفة مالية', price: amt, cost: 0, qty: 1, loan: true });
  renderCart();
  closeModal();
}

function renderCart() {
  const el = document.getElementById('cartItems');
  const countEl = document.getElementById('cartCount');
  const totalEl = document.getElementById('cartTotal');
  if (!el) return;

  el.innerHTML = cart.map((it, i) => `
    <div class="cart-item">
      <div>
        <strong>${escapeHtml(it.name)}</strong>
        <div class="small">${fmt(it.price)} × ${it.qty}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <b>${fmt(it.price * it.qty)}</b>
        <button class="btn btn-danger btn-sm" onclick="cart.splice(${i},1);renderCart()">✖</button>
      </div>
    </div>
  `).join('') || '<div class="empty">السلة فارغة</div>';

  const total = cart.reduce((s, it) => s + it.price * it.qty, 0);
  if (countEl) countEl.textContent = cart.length;
  if (totalEl) totalEl.textContent = fmt(total);
}

function setPayType(t) {
  payType = t;
  document.querySelectorAll('.payment-options button').forEach(b => {
    b.classList.toggle('active', b.dataset.pay === t);
  });
  const pf = document.getElementById('partialField');
  if (pf) pf.classList.toggle('hidden', t !== 'partial');
  if (t === 'partial') {
    const paid = document.getElementById('posPaid');
    if (paid && !paid.value) paid.value = totalCart();
  }
}

function totalCart() {
  return cart.reduce((s, it) => s + it.price * it.qty, 0);
}

function finalizeSale() {
  if (!cart.length) { toast('السلة فارغة', true); return; }
  if (!currentShift) { toast('⚠️ يجب فتح وردية أولًا', true); return; }

  const total = totalCart();
  const customerId = document.getElementById('posCustomer').value;
  let paid = total, due = 0;

  if (payType === 'credit') {
    if (!customerId) { toast('⚠️ اختر زبونًا للبيع بالدين', true); return; }
    paid = 0; due = total;
  } else if (payType === 'partial') {
    paid = +document.getElementById('posPaid').value || 0;
    due = Math.max(0, total - paid);
    if (due > 0 && !customerId) { toast('⚠️ اختر زبونًا', true); return; }
  }

  const settings = DB.settings();
  const counter = (DB.counters().invoice || 0) + 1;
  const invoiceNumber = (settings.invPrefix || 'INV-') + String(counter).padStart(5, '0');

  const invoice = {
    id: uuid(), number: invoiceNumber, type: 'sale',
    customer_id: customerId || null,
    customer_name: customerId ? (DB.customers().find(c => c.id === customerId) || {}).name : 'زبون عادي',
    total, paid, due,
    status: due === 0 ? 'paid' : (paid === 0 ? 'credit' : 'partial'),
    user: currentUser.username,
    shift_id: currentShift.id,
    created_at: now()
  };
  upsertRow('invoices', invoice);

  cart.forEach(it => {
    upsertRow('invoiceItems', {
      id: uuid(), invoice_id: invoice.id,
      product_id: it.product_id, name: it.name,
      price: it.price, cost: it.cost, qty: it.qty,
      subtotal: it.price * it.qty
    });

    if (it.product_id) {
      const p = DB.products().find(x => x.id === it.product_id);
      if (p) { p.qty = Math.max(0, (p.qty || 0) - it.qty); upsertRow('products', p); }
    }
  });

  if (customerId && due > 0) {
    const c = DB.customers().find(x => x.id === customerId);
    if (c) { c.balance = (c.balance || 0) + due; upsertRow('customers', c); }
  }

  const counters = DB.counters();
  counters.invoice = counter;
  DB.setObj('counters', counters);

  audit('sale', invoiceNumber + ' — ' + fmt(total));
  toast('✅ تم البيع: ' + invoiceNumber);

  const invoiceId = invoice.id;

  cart = [];
  payType = 'cash';
  setPayType('cash');
  renderCart();
  refreshAll();

  // طباعة الفاتورة تلقائيًا بعد البيع
  setTimeout(() => {
    if (typeof printInvoice === 'function') printInvoice(invoiceId);
  }, 500);
}
