/* ============================================================
   Boutik v4 — قارئ الباركود
   ============================================================ */

let scannerInstance = null;
let scannerTarget = null;

function openScanner(target) {
  scannerTarget = target;
  const overlay = document.getElementById('scannerOverlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');

  if (typeof Html5Qrcode === 'undefined') {
    document.getElementById('scannerStatus').textContent = '⚠️ مكتبة المسح غير محمّلة';
    return;
  }
  const container = document.getElementById('scannerContainer');
  container.innerHTML = '<div id="qrReader"></div>';

  scannerInstance = new Html5Qrcode('qrReader');
  scannerInstance.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (text) => {
      const last = document.getElementById('scannerLast');
      if (last) last.textContent = '✅ ' + text;
      handleScan(text);
    },
    () => {}
  ).catch(err => {
    document.getElementById('scannerStatus').textContent = '❌ ' + err;
  });
}

function closeScanner() {
  const overlay = document.getElementById('scannerOverlay');
  if (overlay) overlay.classList.add('hidden');
  if (scannerInstance) {
    scannerInstance.stop().then(() => {
      scannerInstance.clear();
      scannerInstance = null;
    }).catch(() => {});
  }
}

function handleScan(text) {
  if (scannerTarget === 'pos') {
    const p = DB.products().find(x => x.barcode === text);
    if (p) { addToCart(p.id); toast('✅ ' + p.name); }
    else toast('⚠️ منتج غير معروف: ' + text, true);
  } else if (scannerTarget === 'product') {
    const f = document.getElementById('pBarcode');
    if (f) f.value = text;
    closeScanner();
  }
}
