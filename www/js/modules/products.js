/* ============================================================
   Boutik v4 — المنتجات
   ============================================================ */

function renderProducts() {
  const q = (document.getElementById('prodSearch')?.value || '').trim().toLowerCase();
  const catFilter = document.getElementById('prodFilterCategory')?.value || '';
  const statusFilter = document.getElementById('prodFilterStatus')?.value || '';

  let list = DB.products();
  if (q) list = list.filter(p => (p.name || '').toLowerCase().includes(q) || (p.barcode || '').includes(q));
  if (catFilter) list = list.filter(p => p.category === catFilter);
  if (statusFilter === 'low') list = list.filter(p => p.qty > 0 && p.qty <= (p.min_qty || 5));
  if (statusFilter === 'out') list = list.filter(p => p.qty <= 0);
  if (statusFilter === 'expiring') list = list.filter(isExpiringSoon);
  if (statusFilter === 'expired') list = list.filter(isExpired);

  const tb = document.getElementById('productsTable');
  if (!tb) return;
  tb.innerHTML = list.length ? list.map(p => `
    <tr>
      <td dir="ltr">${escapeHtml(p.barcode || '—')}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category || '—')}</td>
      <td style="color:${p.qty <= 0 ? '#e74c3c' : (p.qty <= (p.min_qty || 5) ? '#f39c12' : '#138a45')};font-weight:700">${p.qty}</td>
      <td>${fmt(p.price)}</td>
      <td>${p.expiry_date ? fmtDateShort(p.expiry_date) : '—'}</td>
      <td>
        <button class="btn btn-info btn-sm" onclick="openProductModal('${p.id}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">🗑️</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="7" class="empty">لا توجد منتجات</td></tr>';

  // تعبئة الفئات
  const sel = document.getElementById('prodFilterCategory');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = '<option value="">كل الفئات</option>' +
      DB.categories().map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
    sel.value = cur;
  }
}

function openProductModal(id) {
  const p = id ? DB.products().find(x => x.id === id) : { name: '', barcode: '', category: '', qty: 0, min_qty: 5, price: 0, cost: 0, expiry_date: '' };
  const cats = DB.categories();
  openModal(`
    <h3>${id ? '✏️ تعديل' : '➕ منتج جديد'}</h3>
    <label class="lbl">الباركود</label><input id="pBarcode" dir="ltr" value="${escapeHtml(p.barcode || '')}">
    <label class="lbl">الاسم</label><input id="pName" value="${escapeHtml(p.name || '')}">
    <label class="lbl">الفئة</label>
    <select id="pCategory">
      <option value="">— بدون —</option>
      ${cats.map(c => `<option value="${escapeHtml(c.name)}" ${c.name === p.category ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
    </select>
    <div class="row">
      <div><label class="lbl">الكمية</label><input id="pQty" type="number" inputmode="numeric" value="${p.qty}"></div>
      <div><label class="lbl">حد التنبيه</label><input id="pMinQty" type="number" inputmode="numeric" value="${p.min_qty || 5}"></div>
    </div>
    <div class="row">
      <div><label class="lbl">سعر الشراء</label><input id="pCost" type="number" inputmode="decimal" value="${p.cost || 0}"></div>
      <div><label class="lbl">سعر البيع</label><input id="pPrice" type="number" inputmode="decimal" value="${p.price || 0}"></div>
    </div>
    <label class="lbl">تاريخ الانتهاء</label><input id="pExpiry" type="date" value="${p.expiry_date || ''}">
    <div class="modal-actions">
      <button class="btn btn-success" onclick="saveProduct('${id || ''}')">💾 حفظ</button>
      <button class="btn btn-danger" onclick="closeModal()">إلغاء</button>
    </div>`);
}

function saveProduct(id) {
  const barcode = document.getElementById('pBarcode').value.trim();
  const name = document.getElementById('pName').value.trim();
  if (!name) { toast('أدخل الاسم', true); return; }
  const p = id ? DB.products().find(x => x.id === id) : { id: uuid(), created_at: now() };
  p.barcode = barcode;
  p.name = name;
  p.category = document.getElementById('pCategory').value;
  p.qty = +document.getElementById('pQty').value || 0;
  p.min_qty = +document.getElementById('pMinQty').value || 5;
  p.cost = +document.getElementById('pCost').value || 0;
  p.price = +document.getElementById('pPrice').value || 0;
  p.expiry_date = document.getElementById('pExpiry').value || '';
  upsertRow('products', p);
  audit('product_save', name);
  closeModal();
  renderProducts();
  toast('✅ تم الحفظ');
}

function deleteProduct(id) {
  if (!confirm('حذف المنتج؟')) return;
  removeRow('products', id);
  audit('product_delete', id);
  renderProducts();
  toast('🗑️ تم الحذف');
}

function printInventoryList() {
  const products = DB.products();
  const s = DB.settings();
  printHTML(`
    <div class="center"><h2>${escapeHtml(s.shopName || 'Boutik')}</h2><div class="small">جرد المخزون</div></div>
    <div class="small">التاريخ: ${fmtDate(now())}</div>
    <table>
      <thead><tr><th>#</th><th>باركود</th><th>الاسم</th><th>الكمية</th><th>سعر البيع</th><th>القيمة</th></tr></thead>
      <tbody>${products.map((p, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(p.barcode || '')}</td><td>${escapeHtml(p.name)}</td><td>${p.qty}</td><td>${fmtNum(p.price)}</td><td>${fmtNum((p.qty * p.price))}</td></tr>`).join('')}</tbody>
    </table>
  `, 'جرد المخزون');
}

function printBarcodeLabels() {
  const products = DB.products().filter(p => p.barcode);
  if (!products.length) return toast('لا توجد منتجات بباركود', true);
  const s = DB.settings();
  printHTML(`
    <div class="center small">${escapeHtml(s.shopName || 'Boutik')}</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px">
      ${products.map(p => `
        <div class="label-box">
          <div style="font-size:10px;margin-bottom:4px">${escapeHtml(p.name).slice(0, 20)}</div>
          <div style="font-family:monospace;font-size:10px;direction:ltr;word-break:break-all">${escapeHtml(p.barcode)}</div>
          <div style="font-size:11px;font-weight:700;margin-top:3px">${fmtNum(p.price)}</div>
        </div>`).join('')}
    </div>
  `, 'ملصقات الباركود');
                                                               }
