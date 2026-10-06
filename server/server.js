/* ============================================================
   Boutik v4 — السيرفر المدمج
   - REST API للمزامنة
   - WebSocket للتحديث اللحظي
   - /api/info لاكتشاف المضيف
   ============================================================ */
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const os = require('os');
const db = require('./db');

const PORT = process.env.PORT || 8787;
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// تسجيل حالة السيرفر
db.load();
const state = db.getState();

// ثابت
if (!state.deviceId) state.deviceId = require('crypto').randomBytes(16).toString('hex').toUpperCase();
if (!state.shopName) state.shopName = 'Boutik Host';
db.setState(state);

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname, '..', 'www')));

// معلومات المضيف
app.get('/api/info', (req, res) => {
  res.json({
    ok: true,
    shopName: state.shopName,
    deviceId: state.deviceId,
    version: '4.0.0',
    seq: state.seq
  });
});

app.get('/api/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));

// استقبال دفعة تغييرات
app.post('/api/sync/push', (req, res) => {
  const entries = (req.body && req.body.entries) || [];
  const accepted = [];
  entries.forEach(e => {
    if (!e || !e.id || !e.table) return;
    accepted.push(db.append(e));
  });
  // بث للمستخدمين الآخرين
  const payload = JSON.stringify({ type: 'batch', entries: accepted });
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(payload); });
  res.json({ ok: true, count: accepted.length, seq: db.getState().seq });
});

// جلب التغييرات منذ seq
app.get('/api/sync/pull', (req, res) => {
  const since = +req.query.since || 0;
  const entries = db.since(since);
  res.json({ ok: true, entries, seq: db.getState().seq });
});

// الحالة الكاملة (للمزامنة الأولى)
app.get('/api/state', (req, res) => {
  res.json({ ok: true, entries: db.getState().changelog, seq: db.getState().seq });
});

// سيرفر HTTP
const server = http.createServer(app);

// WebSocket
const wss = new WebSocket.Server({ server, path: '/ws' });
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'hello', seq: db.getState().seq }));
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'push' && Array.isArray(data.entries)) {
        const accepted = data.entries.map(e => db.append(e));
        const payload = JSON.stringify({ type: 'batch', entries: accepted });
        wss.clients.forEach(c => { if (c.readyState === 1 && c !== ws) c.send(payload); });
      }
    } catch {}
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) { localIP = net.address; break; }
    }
  }
  console.log('🖥️  Boutik v4 Server');
  console.log('   Local :  http://localhost:' + PORT);
  console.log('   LAN   :  http://' + localIP + ':' + PORT);
  console.log('   Device:  ' + state.deviceId);
});
