/* ============================================================
   Boutik v4 — قارئ الباركود (مصحّح)
   ============================================================ */

let scannerInstance = null;
let scannerTarget = null;

function openScanner(target) {
  scannerTarget = target;
  const overlay = document.getElementById('scannerOverlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');

  if (typeof Html5Qrcode === 'undefined') {
    const st = document.getElementById('scannerStatus');
    if (st) st.textContent = '⚠️ مكتبة المسح غير محمّلة';
    return;
  }

  const container = document.getElementById('scannerContainer');
  if (!container) return;
  container.innerHTML = '<div id="qrReader"></div>';

  try {
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
      const st = document.getElementById('scannerStatus');
      if (st) st.textContent = '❌ ' + err;
    });
  } catch (e) {
    console.error('Scanner init:', e);
  }
}

function closeScanner() {
  const overlay = document.getElementById('scannerOverlay');
  if (overlay) overlay.classList.add('hidden');
  if (scannerInstance) {
    const inst = scannerInstance;
    scannerInstance = null;
    try {
      inst.stop().then(() => { try { inst.clear(); } catch (e) {} }).catch(() => {});
    } catch (e) {}
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
