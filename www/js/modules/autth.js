/* ============================================================
   Boutik v4 — المصادقة
   ============================================================ */

let currentUser = null;
let currentShift = null;

async function doLogin() {
  const errEl = document.getElementById('loginError');
  if (errEl) errEl.textContent = '';
  const __sb = document.getElementById('subscriptionBtn');

  try {
    // 1. فحص الترخيص (تخطي في وضع العميل)
    const mode = DB.mode().current;

    if (mode === 'host') {
      let licenseOK = false;
      try {
        licenseOK = await checkLicenseBeforeLogin();
      } catch (e) {
        console.error('License check error:', e);
        licenseOK = false;
      }

      if (!licenseOK) {
        if (errEl) {
          errEl.textContent = '⚠️ يجب تفعيل الترخيص أولًا';
          errEl.style.color = '#f39c12';
        }
        // أظهر شاشة الترخيص
        if (typeof showSubscription === 'function') showSubscription();
        if (__sb) __sb.classList.remove('hidden');
        return;
      }
    }

    // 2. قراءة المدخلات
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();

    if (!u || !p) {
      if (errEl) errEl.textContent = '❌ أدخل اسم المستخدم وكلمة السر';
      return;
    }

    // 3. التحقق
    const found = DB.users().find(x => x.username === u && x.password === p);
    if (!found) {
      if (errEl) {
        errEl.textContent = '❌ بيانات خاطئة — جرّب: user / 1234';
        errEl.style.color = '#c62828';
      }
      return;
    }

    // 4. نجاح الدخول
    currentUser = found;
    audit('login', 'تسجيل دخول');
    sessionStorage.setItem('boutik_user_id', found.id);

    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('licenseScreen').classList.add('hidden');
    document.getElementById('modeScreen').classList.add('hidden');
    document.getElementById('app').classList.add('active');
    document.getElementById('currentUser').textContent = '👤 ' + found.username;

    if (__sb) __sb.classList.remove('hidden');

    if (typeof applyDarkMode === 'function') applyDarkMode();
    if (typeof loadShopName === 'function') loadShopName();
    if (typeof buildNav === 'function') buildNav();
    if (typeof loadActiveShift === 'function') loadActiveShift();
    if (typeof refreshAll === 'function') refreshAll();
    if (typeof Sync !== 'undefined' && Sync.start) Sync.start();

  } catch (e) {
    console.error('Login error:', e);
    if (errEl) errEl.textContent = '❌ خطأ: ' + (e.message || e);
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
