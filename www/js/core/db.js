/* ============================================================
   Boutik v4 — قاعدة البيانات (طبقة فوق Store)
   ============================================================ */

const DB = {
  PREFIX: 'boutik_v4_',

  get(k) {
    try { return JSON.parse(localStorage.getItem(this.PREFIX + k) || '[]'); }
    catch { return []; }
  },
  set(k, v) {
    localStorage.setItem(this.PREFIX + k, JSON.stringify(v));
    if (typeof ChangeLog !== 'undefined') ChangeLog.record(k, v);
  },
  getObj(k) {
    try { return JSON.parse(localStorage.getItem(this.PREFIX + k) || '{}'); }
    catch { return {}; }
  },
  setObj(k, v) {
    localStorage.setItem(this.PREFIX + k, JSON.stringify(v));
  },
  remove(k) { localStorage.removeItem(this.PREFIX + k); },

  // Accessors
  users()            { return this.get('users'); },
  products()         { return this.get('products'); },
  categories()       { return this.get('categories'); },
  customers()        { return this.get('customers'); },
  suppliers()        { return this.get('suppliers'); },
  invoices()         { return this.get('invoices'); },
  invoiceItems()     { return this.get('invoiceItems'); },
  purchases()        { return this.get('purchases'); },
  purchaseItems()    { return this.get('purchaseItems'); },
  payments()         { return this.get('payments'); },
  stockMovements()   { return this.get('stockMovements'); },
  shifts()           { return this.get('shifts'); },
  auditLog()         { return this.get('auditLog'); },
  inventorySessions(){ return this.get('inventorySessions'); },
  inventoryItems()   { return this.get('inventoryItems'); },

  settings() { return this.getObj('settings'); },
  counters() { return this.getObj('counters'); },
  mode()     { return this.getObj('mode'); }
};

/* ============================================================
   التهيئة
   ============================================================ */
function initDB() {
  const s = DB.settings();
  if (!s.initialized) {
    DB.setObj('settings', {
      initialized: true,
      version: 4,
      shopName: 'محل Boutik',
      shopAddress: '',
      shopPhone: '',
      shopRC: '',
      invPrefix: 'INV-',
      purPrefix: 'PUR-',
      currency: 'دج',
      taxRate: 0,
      expiryDays: 30,
      paperSize: '58',
      darkMode: false
    });

    DB.set('users', [{
      id: uuid(),
      username: 'user',
      password: '1234',
      role: 'admin',
      created_at: now()
    }]);
    ['products','categories','customers','suppliers','invoices','invoiceItems',
     'purchases','purchaseItems','payments','stockMovements','shifts','auditLog',
     'inventorySessions','inventoryItems','changelog'].forEach(k => DB.set(k, []));

    DB.setObj('mode', { current: null, host: null });
    console.log('✅ Boutik v4: قاعدة البيانات جاهزة');
  }
}

/* ============================================================
   سجل التدقيق
   ============================================================ */
function audit(action, details = '') {
  const log = DB.auditLog();
  log.push({
    id: uuid(),
    action,
    details,
    user: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.username : 'system',
    created_at: now()
  });
  if (log.length > 2000) log.splice(0, log.length - 2000);
  DB.set('auditLog', log);
}

initDB();
