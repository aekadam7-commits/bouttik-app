async function verifyLicense(code) {
  if (!code || typeof code !== 'string' || !code.startsWith('B3-')) {
    return { ok: false, reason: 'تنسيق الكود غير صحيح' };
  }

  const body = code.slice(3); // بعد "B3-"

  // التوقيع ECDSA P-256 = 64 بايت = 86 حرف base64url
  // payload = body.length - 86 - 1 (الشرطة الفاصلة)
  const SIG_LEN = 86;

  if (body.length < SIG_LEN + 2) {
    return { ok: false, reason: 'كود مبتور' };
  }

  // التوقيع = آخر 86 حرفًا
  const sig64 = body.slice(-SIG_LEN);
  // payload = ما قبل التوقيع، ناقص الشرطة الفاصلة
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

  // التحقق من التوقيع
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

  // التحقق من ربط الجهاز
  const myId = Device.getId();
  if (payload.d && payload.d !== myId) {
    return { ok: false, reason: 'الكود مخصص لجهاز آخر: ' + payload.d };
  }

  // التحقق من الصلاحية
  const nowMs = Date.now();
  if (payload.s && nowMs < payload.s - 86400000) {
    return { ok: false, reason: 'لم يبدأ الترخيص بعد' };
  }
  if (payload.e && nowMs > payload.e) {
    return { ok: false, reason: 'انتهت صلاحية الترخيص' };
  }

  return { ok: true, payload };
}
