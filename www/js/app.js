/* ============================================================
   Boutik v4 — النواة الرئيسية
   ============================================================ */

function buildNav() {
  const tabs = [
    { id: 'dashboard', label: '📊 الرئيسية', roles: ['admin','manager','cashier'] },
    { id: 'pos', label: '💰 البيع', roles: ['admin','manager','cashier'] },
    { id: 'products', label: '📦 المنتجات', roles: ['admin','manager','stock'] },
    { id: 'customers', label: '👥 الزبائن', roles: ['admin','manager','cashier'] },
    { id: 'suppliers', label: '🚚 الموردين', roles: ['admin','manager','stock'] },
    { id: 'purchases', label: '🛒 المشتريات', roles: ['admin','manager','stock'] },
    { id: 'invoices', label: '🧾 فواتير البيع', roles: ['admin','manager','cashier'] },
    { id: 'inventory', label: '📋 الجرد', roles: ['admin','manager','stock'] },
    { id: 'reports', label: '📈 التقارير', roles: ['admin','manager'] },
    { id: 'settings', label: '⚙️ الإعدادات', roles: ['admin'] },
    { id: 'users', label: '👤 المستخدمون', roles: ['admin'] },
    { id: 'contact', label: '📞 تواصل معنا', roles: ['admin','manager','cashier','stock'] }
  ];
  const role = currentUser ? currentUser.role : 'cashier';
  const allowed = tabs.filter(t => t.roles.includes(role));
  document.getElementById('mainNav').innerHTML = allowed
    .map((t, i) => `<button class="${i === 0 ? 'active' : ''}" data-tab="${t.id}" onclick="switchTab('${t.id}')">${t.label}</button>`)
    .join('');
}

function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById('tab-' + tab);
  if (target) target.classList.remove('hidden');
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`nav button[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');

  const actions = {
    dashboard: renderDashboard,
    products: renderProducts,
    customers: renderCustomers,
    suppliers: renderSuppliers,
    purchases: renderPurchases,
    invoices: renderInvoices,
    inventory: renderInventoryTab,
    reports: renderReports,
    settings: renderSettings,
    users: renderUsers,
    contact: () => {},
    pos: () => { renderPOSCustomers(); searchPOS(); }
  };
  if (actions[tab]) actions[tab]();
}

function refreshAll() {
  renderDashboard();
  if (typeof renderProducts === 'function') renderProducts();
  if (typeof renderCustomers === 'function') renderCustomers();
  if (typeof renderSuppliers === 'function') renderSuppliers();
  if (typeof renderInvoices === 'function') renderInvoices();
  if (typeof renderPurchases === 'function') renderPurchases();
  if (typeof renderReports === 'function') renderReports();
  if (typeof renderPOSCustomers === 'function') renderPOSCustomers();
  if (typeof renderCart === 'function') renderCart();
  if (typeof renderSettings === 'function') renderSettings();
  if (typeof renderUsers === 'function') renderUsers();
}

function chooseMode(mode) {
  if (mode === 'host') {
    Net.setMode('host', null);
    toast('✅ تم اختيار الوضع: مضيف');
    // المضيف يحتاج سيرفرًا محليًا، لكن في حالة الويب نستخدم localhost فقط
    afterModeChosen();
  } else {
    Net.setMode('client', null);
    document.getElementById('modeNetwork').classList.remove('hidden');
    Net.scanForHosts();
  }
}

function afterModeChosen() {
  const m = DB.mode();
  document.getElementById('modeScreen').classList.add('hidden');

  if (m.current === 'host') {
    // المضيف يحتاج ترخيصًا
    const st = licenseState();
    if (!st.active) {
      showSubscription();
    } else {
      showLogin();
    }
  } else {
    // العميل: لا يحتاج ترخيصًا (يتحقق من المضيف)
    showLogin();
  }
}

function showLogin() {
  document.getElementById('licenseScreen').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');

  const m = DB.mode();
  const badge = document.getElementById('netBadge');
  if (badge) {
    badge.classList.remove('hidden');
    if (m.current === 'host') { badge.className = 'net-badge host'; badge.textContent = '🖥️ وضع المضيف'; }
    else { badge.className = 'net-badge client'; badge.textContent = '📱 وضع العميل — ' + (m.host ? m.host.ip + ':' + m.host.port : 'غير متصل'); }
  }
  const hint = document.getElementById('hostHint');
  if (hint && m.current === 'client' && m.host) {
    hint.textContent = 'http://' + m.host.ip + ':' + m.host.port;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    if (typeof closeScanner === 'function') closeScanner();
  }
  if (e.key === 'Enter') {
    const ls = document.getElementById('loginScreen');
    if (ls && !ls.classList.contains('hidden')) doLogin();
  }
});

/* ============================================================
   التهيئة الأولية
   ============================================================ */
window.addEventListener('load', () => {
  BoutikI18n.init();
  applyDarkMode();
  updateNetStatus();

  const mode = DB.mode().current;
  if (!mode) {
    // اترك شاشة اختيار الوضع
  } else {
    document.getElementById('modeScreen').classList.add('hidden');
    Net.current();
    afterModeChosen();
    tryAutoLogin();
  }
  console.log('🚀 Boutik v4 جاهز');
});
