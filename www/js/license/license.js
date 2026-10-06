/* ============================================================
   Boutik v4 — التحقق من الترخيص (ECDSA P-256)
   ============================================================ */

const BOUTIK_PUBLIC_KEY = {
  kty: 'EC', crv: 'P-256',
  x: '8BKyWNBO5gX2Xxy5o6Xd5vdY3-hKcajqs70BKuwqBIk',
  y: 'Uoa3DZj2Ba-elZtZ9glyuC3nYU_4AgI8NNaJoGuvxYA'
};

const LICENSE_STORAGE = 'boutik_v4_license';

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function verifyLicense(code) {
  if (!code || typeof code !== 'string' || !code.startsWith('B3-')) {
    return { ok: false, reason: 'تنسيق الكود غير صحيح' };
  }

  const body = code.slice(3);
  const SIG_LEN = 86;

  if (body.length < SIG_LEN + 2) {
    return { ok: false, reason: 'كود مبتور' };
  }

  const sig64 = body.slice(-SIG_LEN);
  let payload64 = body.slice(0, -SIG_LEN);
  if (payload64.endsWith('-')) payload64 = payload64.slice(0, -1);
  if (payload64.endsWith('=')) payload64 = payload64.replace(/=+$/, '');

  let payloadBytes, sigBytes;
  try {
    payloadBytes = b64urlDecode(payload64);
    sigBytes = b64urlDecode(sig64);
  } catch (e) {
    return { ok: false, reason: 'base64 غير صالح' };
  }

  if (sigBytes.length !== 64) {
    return { ok: false, reason: 'طول التوقيع غير صحيح' };
  }

  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(payloadBytes)); }
  catch { return { ok: false, reason: 'payload غير صالح' }; }

  try {
    const key = await crypto.subtle.importKey(
      'jwk', BOUTIK_PUBLIC_KEY,
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
    );
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key, sigBytes, payloadBytes
    );
    if (!valid) return { ok: false, reason: 'التوقيع غير صحيح' };
  } catch (e) {
    return { ok: false, reason: 'خطأ في التحقق: ' + e.message };
  }

  const myId = Device.getId();
  if (payload.d && payload.d !== myId) {
    return { ok: false, reason: 'الكود مخصص لجهاز آخر' };
  }

  const nowMs = Date.now();
  if (payload.s && nowMs < payload.s - 86400000) {
    return { ok: false, reason: 'لم يبدأ الترخيص بعد' };
  }
  if (payload.e && nowMs > payload.e) {
    return { ok: false, reason: 'انتهت صلاحية الترخيص' };
  }

  return { ok: true, payload };
}

/* ============ التخزين ============ */
function getStoredLicense() {
  try { return JSON.parse(localStorage.getItem(LICENSE_STORAGE) || 'null'); }
  catch { return null; }
}

function saveLicense(code, payload) {
  localStorage.setItem(LICENSE_STORAGE, JSON.stringify({ code, payload, savedAt: Date.now() }));
}

/* ============ الفحص ============ */
async function checkLicenseBeforeLogin() {
  const mode = DB.mode().current;
  if (mode === 'client') return true;

  const stored = getStoredLicense();
  if (!stored) return false;
  const res = await verifyLicense(stored.code);
  if (!res.ok) {
    localStorage.removeItem(LICENSE_STORAGE);
    return false;
  }
  return true;
}

function licenseState() {
  const stored = getStoredLicense();
  if (!stored) return { active: false };
  const p = stored.payload;
  const nowMs = Date.now();
  const expired = p.e && nowMs > p.e;
  const days = p.e ? Math.max(0, Math.ceil((p.e - nowMs) / 86400000)) : null;
  return { active: !expired, payload: p, days, code: stored.code };
}

/* ============ التفعيل ============ */
async function activateLicense() {
  const code = document.getElementById('licenseCode').value.trim();
  const err = document.getElementById('licenseError');
  const st = document.getElementById('licenseStatus');
  if (err) err.textContent = '';
  if (!code) { if (err) err.textContent = 'أدخل كود الترخيص'; return; }

  if (st) st.textContent = '⏳ جارٍ التحقق...';
  const res = await verifyLicense(code);
  if (!res.ok) {
    if (st) st.textContent = '';
    if (err) err.textContent = '❌ ' + res.reason;
    return;
  }
  saveLicense(code, res.payload);
  if (st) st.textContent = '✅ تم التفعيل';
  setTimeout(() => location.reload(), 600);
}

/* ============ العرض ============ */
function showSubscription() {
  const st = licenseState();
  const screen = document.getElementById('licenseScreen');
  const status = document.getElementById('licenseStatus');
  const info = document.getElementById('licenseInfo');
  const codeInp = document.getElementById('licenseCode');
  const dev = document.getElementById('deviceIdDisplay');
  if (!screen) return;
  screen.classList.remove('hidden');
  if (dev) dev.textContent = Device.getId();
  if (st.active) {
    status.textContent = '✅ الترخيص فعّال';
    status.style.color = '#138a45';
    info.innerHTML = `
      <div>النوع: ${st.payload.t || '—'}</div>
      <div>ينتهي: ${st.payload.e ? new Date(st.payload.e).toLocaleDateString('ar-DZ') : 'دائم'}</div>
      ${st.days != null ? '<div>يتبقى: ' + st.days + ' يوم</div>' : ''}
    `;
    if (codeInp) codeInp.value = st.code || '';
  } else {
    status.textContent = '⚠️ لا يوجد ترخيص فعّال';
    status.style.color = '#f39c12';
    info.innerHTML = '<div>أدخل كود التفعيل للمتابعة</div>';
  }
}
