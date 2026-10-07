/* ============================================================
   Boutik v4 — أدوات مساعدة (طباعة متوافقة مع APK)
   ============================================================ */

function now() { return new Date().toISOString(); }
function todayISO() { return new Date().toISOString().slice(0, 10); }

function currency() {
  try { return (DB.settings().currency) || 'دج'; }
  catch { return 'دج'; }
}

function fmt(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('fr-DZ', { maximumFractionDigits: 2 }) + ' ' + currency();
}

function fmtNum(n) {
  return (Number(n) || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('ar-DZ') + ' ' + dt.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function fmtDateShort(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('ar-DZ'); } catch { return '—'; }
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function toast(msg, isError) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = 'toast', 3000);
}

function openModal(html) {
  const m = document.getElementById('modal');
  const c = document.getElementById('modalContent');
  if (!m || !c) return;
  c.innerHTML = html;
  m.classList.remove('hidden');
}

function closeModal() {
  const m = document.getElementById('modal');
  if (m) m.classList.add('hidden');
}

function exportCSV(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ============================================================
   الطباعة — متوافقة مع المتصفح + APK + Electron
   ============================================================ */
function paperCSS() {
  let size = '58mm';
  try { size = DB.settings().paperSize || '58'; } catch {}
  if (size === 'a4') return { width: '190mm', fontSize: '12px', pageSize: 'A4' };
  if (size === '80') return { width: '72mm', fontSize: '11px', pageSize: '80mm auto' };
  return { width: '52mm', fontSize: '10px', pageSize: '58mm auto' };
}

function printHTML(content, title) {
  const p = paperCSS();

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title || 'Boutik')}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#fff;color:#000}
  body{font-family:Tahoma,Arial,sans-serif;direction:rtl}
  .print-wrap{
    width:${p.width};
    max-width:100%;
    margin:0 auto;
    padding:5mm 3mm;
    font-size:${p.fontSize};
  }
  .center{text-align:center}
  h1,h2,h3{text-align:center;margin:3px 0;font-size:1.15em}
  .small{font-size:.85em;color:#333}
  table{width:100%;border-collapse:collapse;margin:6px 0;font-size:.9em}
  th,td{border-bottom:1px dashed #999;padding:3px 2px;text-align:right}
  th{border-bottom:1px solid #333;background:#f0f0f0}
  .dashed{border-top:1px dashed #666;padding:4px 0;margin:4px 0}
  .row{display:flex;justify-content:space-between;padding:1px 0}
  .total-row{display:flex;justify-content:space-between;font-weight:700;padding:2px 0}
  .code{font-family:monospace;font-size:.95em;direction:ltr;text-align:center;padding:6px;border:1px dashed #333;margin:6px 0}
  .label-box{display:inline-block;border:1px solid #000;padding:6px;margin:3px;width:46mm;text-align:center;vertical-align:top;font-size:.8em}
  .sep{border:none;border-top:1px dashed #666;margin:6px 0}
  @media print{
    @page{size:${p.pageSize};margin:2mm}
    html,body{width:${p.width};margin:0}
    .no-print{display:none!important}
  }
</style>
</head>
<body>
<div class="print-wrap">${content}</div>
<script>
  window.addEventListener('load', function () {
    setTimeout(function () {
      try { window.focus(); window.print(); } catch (e) {}
    }, 300);
  });
<\/script>
</body>
</html>`;

  // 1. جرّب iframe أولًا (يعمل في APK/Electron/المتصفح)
  try {
    const old = document.getElementById('__print_frame__');
    if (old) old.remove();
    const iframe = document.createElement('iframe');
    iframe.id = '__print_frame__';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);

    const d = iframe.contentWindow.document;
    d.open();
    d.write(html);
    d.close();

    // إزالة الـ iframe بعد 30 ثانية
    setTimeout(() => { try { iframe.remove(); } catch (e) {} }, 30000);
    return;
  } catch (e) {
    console.warn('iframe print failed, fallback to window.open', e);
  }

  // 2. fallback: نافذة جديدة
  const w = window.open('', '_blank', 'width=400,height=600');
  if (!w) { alert('يرجى السماح بالنوافذ المنبثقة للطباعة'); return; }
  w.document.write(html);
  w.document.close();
}

function isExpiringSoon(p) {
  if (!p || !p.expiry_date) return false;
  const days = daysUntilExpiry(p.expiry_date);
  const limit = (DB.settings().expiryDays) || 30;
  return days >= 0 && days <= limit;
}

function isExpired(p) {
  if (!p || !p.expiry_date) return false;
  return daysUntilExpiry(p.expiry_date) < 0;
}

function daysUntilExpiry(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.floor((d - t) / 86400000);
}

function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

function uuid() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch (e) {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getQueryParam(name) {
  return new URLSearchParams(location.search).get(name);
}
