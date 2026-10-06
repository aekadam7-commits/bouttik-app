/* ============================================================
   Boutik v4 — المصادقة
   ============================================================ */

let currentUser = null;
let currentShift = null;

async function doLogin() {
  try {
    if (!await checkLicenseBeforeLogin()) {
      document.getElementById('loginScreen').classList.add('hidden');
      showSubscription();
      return;
    }
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();
    const found = DB.users().find(x => x.username === u && x.password === p);
    if (!found) {
      document.getElementById('loginError').textContent = '❌ بيانات خاطئة';
      return;
    }
    currentUser = found;
    audit('login', 'تسجيل دخول');
    sessionStorage.setItem('boutik_user_id', found.id);
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('app').classList.add('active');
    document.getElementById('currentUser').textContent = '👤 ' + found.username;
    const __sb = document.getElementById('subscriptionBtn');
    if (__sb) __sb.classList.remove('hidden');
    applyDarkMode();
    loadShopName();
    buildNav();
    loadActiveShift();
    refreshAll();
    Sync.start();
  } catch (e) {
    console.error('Login error:', e);
    const el = document.getElementById('loginError');
    if (el) el.textContent = '❌ حدث خطأ أثناء تسجيل الدخول';
  }
}

function logout() {
  if (!confirm('هل تريد الخروج؟')) return;
  audit('logout', 'تسجيل خروج');
  currentUser = null;
  currentShift = null;
  sessionStorage.removeItem('boutik_user_id');
  document.getElementById('app').classList.remove('active');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('loginError').textContent = '';
}

function loadShopName() {
  const s = DB.settings();
  const el = document.getElementById('shopNameHeader');
  if (el) el.textContent = '— ' + (s.shopName || '');
}

function tryAutoLogin() {
  const uid = sessionStorage.getItem('boutik_user_id');
  if (!uid) return;
  const u = DB.users().find(x => x.id === uid);
  if (u) {
    document.getElementById('loginUser').value = u.username;
    document.getElementById('loginPass').value = u.password;
    doLogin();
  }
}
