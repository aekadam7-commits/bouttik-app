/* ============================================================
   Boutik v4 — الزبائن والموردين
   ============================================================ */

/* ============ زبائن ============ */
function renderCustomers() {
  const q = (document.getElementById('custSearch')?.value || '').toLowerCase();
  let list = DB.customers();
  if (q) list = list.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q));
  const tb = document.getElementById('customersTable');
  if (!tb) return;
  tb.innerHTML = list.length ? list.map(c => `
    <tr>
      <td>${escapeHtml(c.name)}</td>
      <td dir="ltr">${escapeHtml(c.phone || '—')}</td>
      <td style="color:${(c.balance || 0) > 0 ? '#e74c3c' : '#138a45'};font-weight:700">${fmt(c.balance || 0)}</td>
      <td>
        <button class="btn btn-info btn-sm" onclick="openCustomerModal('${c.id}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">🗑️</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="4" class="empty">لا زبائن</td></tr>';
}

function openCustomerModal(id) {
  const c = id ? DB.customers().find(x => x.id === id) : { name: '', phone: '', balance: 0, note: '' };
  openModal(`
    <h3>${id ? '✏️ تعديل زبون' : '➕ زبون جديد'}</h3>
    <label class="lbl">الاسم</label><input id="cName" value="${escapeHtml(c.name || '')}">
    <label class="lbl">الهاتف</label><input id="cPhone" dir="ltr" value="${escapeHtml(c.phone || '')}">
    <label class="lbl">الرصيد (دين)</label><input id="cBalance" type="number" inputmode="decimal" value="${c.balance || 0}">
    <label class="lbl">ملاحظات</label><input id="cNote" value="${escapeHtml(c.note || '')}">
    <div class="modal-actions">
      <button class="btn btn-success" onclick="saveCustomer('${id || ''}')">💾</button>
      <button class="btn btn-danger" onclick="closeModal()">إلغاء</button>
    </div>`);
}

function saveCustomer(id) {
  const name = document.getElementById('cName').value.trim();
  if (!name) return;
  const c = id ? DB.customers().find(x => x.id === id) : { id: uuid(), created_at: now() };
  c.name = name;
  c.phone = document.getElementById('cPhone').value.trim();
  c.balance = +document.getElementById('cBalance').value || 0;
  c.note = document.getElementById('cNote').value.trim();
  upsertRow('customers', c);
  closeModal();
  renderCustomers();
  renderPOSCustomers();
  toast('✅ تم الحفظ');
}

function deleteCustomer(id) {
  if (!confirm('حذف الزبون؟')) return;
  removeRow('customers', id);
  renderCustomers();
}

function printCustomersList() {
  const list = DB.customers();
  printHTML(`
    <div class="center"><h2>قائمة الزبائن</h2></div>
    <table><thead><tr><th>#</th><th>الاسم</th><th>الهاتف</th><th>الرصيد</th></tr></thead>
    <tbody>${list.map((c, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(c.name)}</td><td dir="ltr">${escapeHtml(c.phone || '')}</td><td>${fmtNum(c.balance || 0)}</td></tr>`).join('')}</tbody></table>
  `, 'قائمة الزبائن');
}

/* ============ موردين ============ */
function renderSuppliers() {
  const list = DB.suppliers();
  const tb = document.getElementById('suppliersTable');
  if (!tb) return;
  tb.innerHTML = list.length ? list.map(s => `
    <tr>
      <td>${escapeHtml(s.name)}</td>
      <td dir="ltr">${escapeHtml(s.phone || '—')}</td>
      <td style="color:${(s.balance || 0) > 0 ? '#e74c3c' : '#138a45'};font-weight:700">${fmt(s.balance || 0)}</td>
      <td>
        <button class="btn btn-info btn-sm" onclick="openSupplierModal('${s.id}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteSupplier('${s.id}')">🗑️</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="4" class="empty">لا موردين</td></tr>';
}

function openSupplierModal(id) {
  const s = id ? DB.suppliers().find(x => x.id === id) : { name: '', phone: '', balance: 0, note: '' };
  openModal(`
    <h3>${id ? '✏️ تعديل مورد' : '➕ مورد جديد'}</h3>
    <label class="lbl">الاسم</label><input id="sName" value="${escapeHtml(s.name || '')}">
    <label class="lbl">الهاتف</label><input id="sPhone" dir="ltr" value="${escapeHtml(s.phone || '')}">
    <label class="lbl">الرصيد</label><input id="sBalance" type="number" inputmode="decimal" value="${s.balance || 0}">
    <label class="lbl">ملاحظات</label><input id="sNote" value="${escapeHtml(s.note || '')}">
    <div class="modal-actions">
      <button class="btn btn-success" onclick="saveSupplier('${id || ''}')">💾</button>
      <button class="btn btn-danger" onclick="closeModal()">إلغاء</button>
    </div>`);
}

function saveSupplier(id) {
  const name = document.getElementById('sName').value.trim();
  if (!name) return;
  const s = id ? DB.suppliers().find(x => x.id === id) : { id: uuid(), created_at: now() };
  s.name = name;
  s.phone = document.getElementById('sPhone').value.trim();
  s.balance = +document.getElementById('sBalance').value || 0;
  s.note = document.getElementById('sNote').value.trim();
  upsertRow('suppliers', s);
  closeModal();
  renderSuppliers();
  toast('✅ تم الحفظ');
}

function deleteSupplier(id) {
  if (!confirm('حذف المورد؟')) return;
  removeRow('suppliers', id);
  renderSuppliers();
}

function printSuppliersList() {
  const list = DB.suppliers();
  printHTML(`
    <div class="center"><h2>قائمة الموردين</h2></div>
    <table><thead><tr><th>#</th><th>الاسم</th><th>الهاتف</th><th>الرصيد</th></tr></thead>
    <tbody>${list.map((s, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(s.name)}</td><td dir="ltr">${escapeHtml(s.phone || '')}</td><td>${fmtNum(s.balance || 0)}</td></tr>`).join('')}</tbody></table>
  `, 'قائمة الموردين');
}
