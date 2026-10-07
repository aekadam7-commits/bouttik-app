/* ============================================================
   Boutik v4 — قارئ الباركود (محسّن + صوت قوي + منع التكرار)
   ============================================================ */

let scannerInstance = null;
let scannerTarget = null;
let scannerLastCode = '';
let scannerLastTime = 0;
let scannerBeepEnabled = true;

/* جلب إعدادات الماسح */
function getScannerConfig() {
  try {
    const s = DB.settings();
    return {
      beep: s.scannerBeep !== false,
      vibrate: s.scannerVibrate !== false,
      avoidDuplicate: s.scannerAvoidDuplicate !== false,
      duplicateInterval: s.scannerDuplicateInterval || 2500
    };
  } catch { return { beep: true, vibrate: true, avoidDuplicate: true, duplicateInterval: 2500 }; }
}

function openScanner(target) {
  scannerTarget = target;
  scannerLastCode = '';
  scannerLastTime = 0;

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

  const st = document.getElementById('scannerStatus');
  if (st) st.textContent = '📷 جارٍ تشغيل الكاميرا...';

  try {
    scannerInstance = new Html5Qrcode('qrReader', { verbose: false });
    scannerInstance.start(
      { facingMode: 'environment' },
      {
        fps: 30,
        qrbox: function (w, h) {
          const min = Math.min(w, h);
          const size = Math.max(220, Math.floor(min * 0.75));
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      },
      (decodedText, decodedResult) => {
        onScanSuccess(decodedText, decodedResult);
      },
      () => {}
    ).then(() => {
      if (st) st.textContent = '✅ وجّه الكاميرا نحو الباركود...';
      vibrate([30, 60, 30]);
    }).catch(err => {
      if (st) st.textContent = '❌ ' + err;
      playErrorBeep();
    });
  } catch (e) {
    console.error('Scanner init:', e);
    if (st) st.textContent = '❌ ' + e.message;
  }
}

function onScanSuccess(text, result) {
  if (!text) return;
  const cfg = getScannerConfig();
  const now = Date.now();

  // منع التكرار خلال فترة قصيرة
  if (cfg.avoidDuplicate && text === scannerLastCode && (now - scannerLastTime) < cfg.duplicateInterval) {
    return;
  }

  scannerLastCode = text;
  scannerLastTime = now;

  // صوت + اهتزاز
  if (cfg.beep) playSuccessBeep();
  if (cfg.vibrate) vibrate([80, 40, 80]);

  // عرض آخر مسح
  const last = document.getElementById('scannerLast');
  if (last) last.textContent = '✅ ' + text;

  // معالجة المسح
  handleScan(text);
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
    if (p) {
      addToCart(p.id);
      toast('✅ ' + p.name);
    } else {
      if (typeof playErrorBeep === 'function') playErrorBeep();
      toast('⚠️ منتج غير معروف: ' + text, true);
    }
  } else if (scannerTarget === 'product') {
    // فتح/تحديث نموذج المنتج
    const p = DB.products().find(x => x.barcode === text);
    if (p) {
      closeScanner();
      // فتح نموذج التعديل
      if (typeof openProductModal === 'function') {
        openProductModal(p.id);
        toast('📦 منتج موجود: ' + p.name);
      }
    } else {
      closeScanner();
      // فتح نموذج جديد مع الباركود معبّأ
      if (typeof openProductModalWithBarcode === 'function') {
        openProductModalWithBarcode(text);
      } else if (typeof openProductModal === 'function') {
        openProductModal();
        setTimeout(() => {
          const f = document.getElementById('pBarcode');
          if (f) f.value = text;
        }, 50);
        toast('➕ منتج جديد: ' + text);
      }
    }
  } else if (scannerTarget === 'product-barcode') {
    // فقط معبّئ حقل الباركود
    const f = document.getElementById('pBarcode');
    if (f) {
      f.value = text;
      // البحث التلقائي عن منتج بنفس الباركود
      if (typeof onProductBarcodeChange === 'function') onProductBarcodeChange(text);
    }
    closeScanner();
  }
}

/* إعدادات الماسح — للاستخدام في settings.js */
function saveScannerSettings() {
  const s = DB.settings();
  s.scannerBeep = document.getElementById('setScannerBeep')?.checked !== false;
  s.scannerVibrate = document.getElementById('setScannerVibrate')?.checked !== false;
  s.scannerAvoidDuplicate = document.getElementById('setScannerAvoidDup')?.checked !== false;
  DB.setObj('settings', s);
  toast('✅ تم الحفظ');
}
