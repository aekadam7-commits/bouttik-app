/* ============================================================
   Boutik v4 — سجل التغييرات (للمزامنة)
   ============================================================ */

const ChangeLog = {
  MAX: 5000,

  record(table, data) {
    const log = DB.get('changelog');
    log.push({
      id: uuid(),
      table,
      data,
      ts: Date.now(),
      deviceId: (typeof Device !== 'undefined') ? Device.getId() : 'unknown',
      synced: false
    });
    if (log.length > this.MAX) log.splice(0, log.length - this.MAX);
    DB.set('changelog', log);
  },

  pending() {
    return DB.get('changelog').filter(e => !e.synced);
  },

  markSynced(ids) {
    const log = DB.get('changelog');
    const set = new Set(ids);
    log.forEach(e => { if (set.has(e.id)) e.synced = true; });
    DB.set('changelog', log);
  },

  // تطبيق تغيير قادم من الشبكة (بدون إعادة تسجيله)
  applyRemote(entry) {
    if (!entry || !entry.table) return;
    const cur = DB.get(entry.table);
    const idx = cur.findIndex(x => x && x.id === entry.data.id);
    if (idx >= 0) {
      // LWW: آخر تعديل يفوز
      if ((entry.data._updated_at || 0) >= (cur[idx]._updated_at || 0)) {
        cur[idx] = entry.data;
      }
    } else {
      cur.push(entry.data);
    }
    localStorage.setItem(DB.PREFIX + entry.table, JSON.stringify(cur));
  }
};

/* دالة مساعدة: تحديث سجل مع ختم زمني */
function upsertRow(table, row) {
  row._updated_at = Date.now();
  const cur = DB.get(table);
  const idx = cur.findIndex(x => x && x.id === row.id);
  if (idx >= 0) cur[idx] = row;
  else cur.push(row);
  DB.set(table, cur);
  return row;
}

function removeRow(table, id) {
  const cur = DB.get(table).filter(x => x && x.id !== id);
  DB.set(table, cur);
}
