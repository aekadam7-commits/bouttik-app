/* ============================================================
   Boutik v4 — أدوات مساعدة
   ============================================================ */

function now() { return new Date().toISOString(); }
function todayISO() { return new Date().toISOString().slice(0, 10); }

function currency() {
  return (DB.settings().currency) || 'دج';
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

function printHTML(content, title) {
  const w = window.open('', '_blank', 'width=800,height=600');
  if (!w) { alert('يرجى السماح بالنوافذ المنبثقة'); return; }
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${escapeHtml(title || 'Boutik')}</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:Tahoma,Arial,sans-serif;padding:15px;color:#000;background:#fff}
      h1,h2,h3{text-align:center;margin:6px 0}
      table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px}
      th,td{border:1px solid #333;padding:6px;text-align:right}
      th{background:#eee}
      .dashed{border-top:1px dashed #999;padding:8px 0;margin:6px 0}
      .row{display:flex;justify-content:space-between;padding:3px 0}
      .total-row{display:flex;justify-content:space-between;font-weight:700;padding:3px 0}
      .center{text-align:center}
      .small{font-size:11px;color:#555}
      .code{font-family:monospace;font-size:16px;direction:ltr;text-align:center;padding:12px;border:1px dashed #333;margin:12px 0}
      .label-box{display:inline-block;border:1px solid #000;padding:8px;margin:5px;width:180px;text-align:center}
      @media print{@page{margin:8mm}body{padding:0}}
    </style></head><body>${content}
    <script>setTimeout(()=>{window.print();window.onafterprint=()=>window.close();},300)<\/script>
    </body></html>`);
  w.document.close();
}

function isExpiringSoon(p) {
  if (!p.expiry_date) return false;
  const days = daysUntilExpiry(p.expiry_date);
  const limit = DB.settings().expiryDays || 30;
  return days >= 0 && days <= limit;
}

function isExpired(p) {
  if (!p.expiry_date) return false;
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
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getQueryParam(name) {
  return new URLSearchParams(location.search).get(name);
}
