/* ============================================================
   Boutik v4 — النسخ الاحتياطي
   ============================================================ */

function openBackup() {
  openModal(`
    <h3>💾 النسخ الاحتياطي</h3>
    <p class="small" style="margin-bottom:12px">صدّر كل بياناتك أو استوردها.</p>
    <div class="modal-actions" style="flex-direction:column">
      <button class="btn btn-primary" onclick="exportData()">📤 تصدير JSON</button>
      <button class="btn btn-warning" onclick="document.getElementById('importFile').click()">📥 استيراد JSON</button>
      <input type="file" id="importFile" accept=".json" onchange="importData(event)" class="hidden">
      <button class="btn btn-info" onclick="exportAllCSV()">📊 تصدير CSV</button>
      <button class="btn btn-danger" onclick="wipeAll()">🗑️ حذف الكل</button>
      <button class="btn btn-primary" onclick="closeModal()">إغلاق</button>
    </div>`);
}

function exportData() {
  const data = {};
  ['users','products','categories','customers','suppliers','invoices','invoiceItems',
   'purchases','purchaseItems','payments','stockMovements','shifts','auditLog',
   'inventorySessions','inventoryItems','changelog'
  ].forEach(k => { data[k] = DB.get(k); });
  data.counters = DB.counters();
  data.settings = DB.settings();
  data.mode = DB.mode();
  data.exported_at = now();

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'boutik-backup-' + todayISO() + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  audit('backup_export', '');
  toast('✅ تم التصدير');
}

function importData(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!confirm('⚠️ سيتم استبدال كل البيانات الحالية. متابعة؟')) return;
      ['users','products','categories','customers','suppliers','invoices','invoiceItems',
       'purchases','purchaseItems','payments','stockMovements','shifts','auditLog',
       'inventorySessions','inventoryItems','changelog'
      ].forEach(k => { if (data[k]) DB.set(k, data[k]); });
      if (data.counters) DB.setObj('counters', data.counters);
      if (data.settings) DB.setObj('settings', data.settings);
      audit('backup_import', '');
      toast('✅ تم الاستيراد');
      closeModal();
      setTimeout(() => location.reload(), 800);
    } catch { toast('❌ ملف غير صالح', true); }
  };
  reader.readAsText(file);
}

function exportAllCSV() {
  const products = DB.products();
  const headers = ['الباركود','الاسم','الفئة','الكمية','سعر الشراء','سعر البيع','تاريخ الانتهاء'];
  const rows = products.map(p => [p.barcode || '', p.name, p.category || '', p.qty, p.cost, p.price, p.expiry_date || '']);
  exportCSV('boutik-products-' + todayISO() + '.csv', headers, rows);
}

function wipeAll() {
  if (!confirm('⚠️ سيتم حذف كل البيانات نهائيًا! متأكد؟')) return;
  if (!confirm('⚠️⚠️ تأكيد أخير؟')) return;
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith(DB.PREFIX)) localStorage.removeItem(k);
  });
  location.reload();
}
