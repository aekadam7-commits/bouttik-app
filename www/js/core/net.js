/* ============================================================
   Boutik v4 — الشبكة (اكتشاف المضيف + الاتصال)
   ============================================================ */

const Net = {
  host: null,        // { ip, port, name }
  online: false,
  mode: null,        // 'host' | 'client'

  current() {
    const m = DB.mode();
    this.mode = m.current;
    this.host = m.host;
    return this;
  },

  setMode(mode, host) {
    DB.setObj('mode', { current: mode, host: host || null });
    this.mode = mode;
    this.host = host || null;
  },

  baseUrl() {
    if (!this.host) return '';
    return 'http://' + this.host.ip + ':' + this.host.port;
  },

  async ping() {
    if (!this.host) return false;
    try {
      const r = await fetch(this.baseUrl() + '/api/ping', { method: 'GET' });
      this.online = r.ok;
    } catch { this.online = false; }
    updateNetStatus();
    return this.online;
  },

  async scanForHosts() {
    const list = document.getElementById('hostList');
    if (list) list.innerHTML = '<div class="empty">جارٍ البحث...</div>';
    const found = [];
    // المسح على IP المحلي (يستخدم /api/discover من السيرفر المحلي إذا كان هذا الجهاز مضيفًا)
    // بديل: محاولة الاتصال بعناوين شائعة
    const candidates = this.localCandidates();
    await Promise.all(candidates.map(async (ip) => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 500);
        const r = await fetch('http://' + ip + ':8787/api/info', { signal: ctrl.signal });
        clearTimeout(t);
        if (r.ok) {
          const info = await r.json();
          found.push({ ip, port: 8787, name: info.shopName || 'Boutik', id: info.deviceId });
        }
      } catch {}
    }));
    this.renderHosts(found);
    return found;
  },

  localCandidates() {
    // عناوين شائعة — في الحقيقة نستخدم mDNS في الإصدار المستقبلي
    const list = [];
    for (let i = 1; i <= 30; i++) list.push('192.168.1.' + i);
    for (let i = 1; i <= 20; i++) list.push('192.168.0.' + i);
    return list.slice(0, 30); // اختصر للسرعة
  },

  renderHosts(list) {
    const el = document.getElementById('hostList');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = '<div class="empty">لم يُعثر على أجهزة رئيسية. جرّب العنوان اليدوي.</div>';
      return;
    }
    el.innerHTML = list.map(h => `
      <div class="host-item" onclick="Net.pickHost('${h.ip}', ${h.port}, '${escapeHtml(h.name)}')">
        <div><b>${escapeHtml(h.name)}</b><span>${h.ip}:${h.port}</span></div>
        <span>➡️</span>
      </div>
    `).join('');
  },

  pickHost(ip, port, name) {
    this.setMode('client', { ip, port, name });
    toast('✅ تم الاتصال بـ ' + name);
    setTimeout(() => location.reload(), 600);
  }
};

function updateNetStatus() {
  const el = document.getElementById('netStatus');
  if (!el) return;
  if (Net.mode === 'host') {
    el.className = 'net-status online';
    el.textContent = '🖥️ مضيف';
  } else if (Net.mode === 'client') {
    el.className = 'net-status ' + (Net.online ? 'online' : 'offline');
    el.textContent = Net.online ? '📡 متصل' : '📴 غير متصل';
  } else {
    el.className = 'net-status offline';
    el.textContent = '❓ غير محدد';
  }
}

function scanForHosts() { Net.scanForHosts(); }
function connectManual() {
  const v = document.getElementById('manualHost').value.trim();
  if (!v) return;
  const [ip, port] = v.split(':');
  Net.pickHost(ip, +(port || 8787), 'Boutik');
      }
