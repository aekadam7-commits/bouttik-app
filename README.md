# 🛒 Boutik v4

نظام إدارة محل مع دعم الشبكة المحلية + ترخيص ECDSA + بناء APK/EXE.

## البنية

- `www/`     : الواجهة (HTML/CSS/JS) — تعمل كتطبيق ويب + Capacitor + Electron.
- `server/`  : سيرفر Node.js (Express + WebSocket) — يعمل داخل Electron أو المستقبل داخل Capacitor مع nodejs-mobile.
- `electron/`: غلاف Desktop.
- `android/` : إعداد Capacitor.

## التشغيل السريع

### 1. السيرفر
```bash
cd server
npm install
npm start
