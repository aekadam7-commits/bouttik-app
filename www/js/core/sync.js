/* ============================================================
   Boutik v4 — محرّك المزامنة
   ============================================================ */

const Sync = {
  ws: null,
  timer: null,
  running: false,

  start() {
    if (this.running) return;
    this.running = true;
    const mode = DB.mode();
    if (!mode.current) return;

    if (mode.current === 'client' && Net.host) {
      this.connectWS();
      this.timer = setInterval(() => this.flush(), 5000);
    } else if (mode.current === 'host') {
      // المضيف: يدفع التغييرات إلى سيرفره المحلي
      this.timer = setInterval(() => this.flush(), 5000);
    }
  },

  connectWS() {
    if (!Net.host) return;
    try {
      const url = 'ws://' + Net.host.ip + ':' + Net.host.port + '/ws';
      this.ws = new WebSocket(url);
      this.ws.onopen = () => { Net.online = true; updateNetStatus(); };
      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'change') this.onRemoteChange(msg.entry);
        } catch {}
      };
      this.ws.onclose = () => {
        Net.online = false;
        updateNetStatus();
        setTimeout(() => this.connectWS(), 3000);
      };
      this.ws.onerror = () => { try { this.ws.close(); } catch {} };
    } catch (e) { console.error('WS error', e); }
  },

  onRemoteChange(entry) {
    ChangeLog.applyRemote(entry);
    if (typeof refreshAll === 'function') refreshAll();
  },

  async flush() {
    const pending = ChangeLog.pending();
    if (!pending.length) return;
    if (!Net.host) {
      // إذا كان هذا الجهاز المضيف، نرسل لسيرفره المحلي على نفس المنفذ
    }
    const url = Net.baseUrl() || 'http://localhost:8787';
    try {
      const r = await fetch(url + '/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: pending })
      });
      if (r.ok) {
        ChangeLog.markSynced(pending.map(e => e.id));
      }
    } catch (e) { /* صامت */ }
  },

  async pull() {
    if (!Net.host) return;
    const url = Net.baseUrl() + '/api/sync/pull?since=' + (this.lastSeq || 0);
    try {
      const r = await fetch(url);
      if (!r.ok) return;
      const data = await r.json();
      (data.entries || []).forEach(e => ChangeLog.applyRemote(e));
      this.lastSeq = data.seq || this.lastSeq;
    } catch {}
  }
};
