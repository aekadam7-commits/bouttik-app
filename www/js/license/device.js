/* ============================================================
   Boutik v4 — معرّف الجهاز الثابت
   ============================================================ */

const Device = {
  KEY: 'boutik_v4_device_id',

  getId() {
    let id = localStorage.getItem(this.KEY);
    if (!id || !/^[0-9A-F]{32}$/.test(id)) {
      id = this.generate();
      localStorage.setItem(this.KEY, id);
    }
    return id;
  },

  generate() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  },

  reset() { localStorage.removeItem(this.KEY); }
};

function copyDeviceId() {
  const id = Device.getId();
  const el = document.getElementById('deviceIdDisplay');
  if (el) el.textContent = id;
  navigator.clipboard?.writeText(id).then(() => toast('✅ تم نسخ معرّف الجهاز'));
}
