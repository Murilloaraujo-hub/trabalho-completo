/**
 * Ephyra Finance — High-level Storage / Repository
 * All app persistence goes through this module (IndexedDB via EphyraDB).
 * Includes one-time migration from legacy LocalStorage keys.
 */
const EphyraStorage = (() => {
  'use strict';

  const LEGACY_USERS = 'ephyra_users';
  const LEGACY_SESSION = 'ephyra_session';
  const LEGACY_DATA_PREFIX = 'ephyra_data_';
  const MIGRATION_FLAG = 'migrated_from_localstorage_v1';

  let _ready = null;
  /** @type {Record<string, any>|null} in-memory users cache */
  let _usersCache = null;
  /** @type {any} */
  let _sessionCache = null;
  /** @type {Map<string, any>} */
  const _dataCache = new Map();

  function _dataKey(email) {
    return String(email || '').toLowerCase();
  }

  /**
   * Ensure DB is open and legacy data migrated once.
   * @returns {Promise<void>}
   */
  async function init() {
    if (_ready) return _ready;
    _ready = (async () => {
      await EphyraDB.open();
      await migrateFromLocalStorage();
      // warm caches
      const users = await EphyraDB.get('meta', 'users_map');
      _usersCache = users?.value || {};
      const session = await EphyraDB.get('sessions', 'current');
      _sessionCache = session || null;
    })().catch((err) => {
      console.error('[EphyraStorage] init failed', err);
      _ready = null;
      throw err;
    });
    return _ready;
  }

  /**
   * One-shot migration LocalStorage → IndexedDB.
   */
  async function migrateFromLocalStorage() {
    try {
      const done = await EphyraDB.metaGet(MIGRATION_FLAG, false);
      if (done) return;

      let users = {};
      try {
        users = JSON.parse(localStorage.getItem(LEGACY_USERS) || '{}') || {};
      } catch (_) {
        users = {};
      }

      if (users && typeof users === 'object' && Object.keys(users).length) {
        await EphyraDB.put('meta', { key: 'users_map', value: users });
        for (const [email, user] of Object.entries(users)) {
          await EphyraDB.put('users', { ...user, email: email.toLowerCase() });
          const legacyKey = LEGACY_DATA_PREFIX + email.replace(/[^a-zA-Z0-9]/g, '_');
          let raw = localStorage.getItem(legacyKey);
          if (!raw) {
            // try original email casing variants
            raw = localStorage.getItem(LEGACY_DATA_PREFIX + String(email).replace(/[^a-zA-Z0-9]/g, '_'));
          }
          if (raw) {
            try {
              const data = JSON.parse(raw);
              await EphyraDB.put('userdata', { email: email.toLowerCase(), data, updatedAt: new Date().toISOString() });
            } catch (e) {
              console.warn('[EphyraStorage] skip corrupt userdata for', email, e);
            }
          }
        }
      }

      try {
        const sess = JSON.parse(localStorage.getItem(LEGACY_SESSION) || 'null');
        if (sess && sess.email) {
          await EphyraDB.put('sessions', { id: 'current', ...sess });
        }
      } catch (_) { /* ignore */ }

      await EphyraDB.metaSet(MIGRATION_FLAG, true);

      // Optional cleanup of legacy keys (keep until verified — safer to leave for now)
      // We leave localStorage in place as backup; app no longer reads it after migration.
    } catch (err) {
      console.error('[EphyraStorage] migration error', err);
      // Do not block app if migration partially fails
      try { await EphyraDB.metaSet(MIGRATION_FLAG, true); } catch (_) { /* ignore */ }
    }
  }

  // ─── Users ───────────────────────────────────────────────

  async function getUsers() {
    await init();
    if (_usersCache) return { ..._usersCache };
    const row = await EphyraDB.get('meta', 'users_map');
    _usersCache = row?.value || {};
    return { ..._usersCache };
  }

  async function saveUsers(users) {
    await init();
    _usersCache = { ...users };
    await EphyraDB.put('meta', { key: 'users_map', value: _usersCache });
    // mirror each user row
    const entries = Object.entries(_usersCache);
    for (const [email, user] of entries) {
      await EphyraDB.put('users', { ...user, email: email.toLowerCase() });
    }
  }

  async function getUser(email) {
    const users = await getUsers();
    return users[String(email).toLowerCase()] || users[email] || null;
  }

  async function upsertUser(user) {
    const users = await getUsers();
    const email = String(user.email).toLowerCase();
    users[email] = { ...user, email };
    await saveUsers(users);
    return users[email];
  }

  // ─── Session ─────────────────────────────────────────────

  async function getSession() {
    await init();
    if (_sessionCache) return { ..._sessionCache };
    const row = await EphyraDB.get('sessions', 'current');
    _sessionCache = row || null;
    return _sessionCache ? { ..._sessionCache } : null;
  }

  async function saveSession(session) {
    await init();
    const payload = { id: 'current', ...session };
    _sessionCache = payload;
    await EphyraDB.put('sessions', payload);
  }

  async function clearSession() {
    await init();
    _sessionCache = null;
    await EphyraDB.remove('sessions', 'current');
  }

  // ─── User application data blob ──────────────────────────

  async function getUserData(email) {
    await init();
    const key = _dataKey(email);
    if (_dataCache.has(key)) {
      return structuredClone ? structuredClone(_dataCache.get(key)) : JSON.parse(JSON.stringify(_dataCache.get(key)));
    }
    const row = await EphyraDB.get('userdata', key);
    if (!row) return null;
    _dataCache.set(key, row.data);
    return structuredClone ? structuredClone(row.data) : JSON.parse(JSON.stringify(row.data));
  }

  async function saveUserData(email, data) {
    await init();
    const key = _dataKey(email);
    _dataCache.set(key, data);
    await EphyraDB.put('userdata', {
      email: key,
      data,
      updatedAt: new Date().toISOString()
    });

    // Keep denormalized slices for future queries (best-effort)
    try {
      await _syncSlices(key, data);
    } catch (e) {
      console.warn('[EphyraStorage] slice sync failed', e);
    }
  }

  async function removeUserData(email) {
    await init();
    const key = _dataKey(email);
    _dataCache.delete(key);
    await EphyraDB.remove('userdata', key);
    // cleanup slices
    await _clearSlices(key);
  }

  async function _clearSlices(email) {
    const stores = ['transactions', 'goals', 'categories', 'achievements', 'history', 'notifications'];
    for (const s of stores) {
      const rows = await EphyraDB.getAllByIndex(s, 'email', email);
      for (const r of rows) {
        await EphyraDB.remove(s, r.id);
      }
    }
    await EphyraDB.remove('settings', email);
    await EphyraDB.remove('xp', email);
    await EphyraDB.remove('statistics', email);
  }

  async function _syncSlices(email, data) {
    // Settings / XP / stats
    await EphyraDB.put('settings', { email, ...(data.config || {}) });
    await EphyraDB.put('xp', {
      email,
      xp: data.xp || 0,
      nivel: data.nivel || 1
    });
    await EphyraDB.put('statistics', {
      email,
      saldo: data.saldo || 0,
      receitasCount: (data.receitas || []).length,
      despesasCount: (data.despesas || []).length,
      metasCount: (data.metas || []).length,
      conquistasCount: (data.conquistas || []).length,
      updatedAt: new Date().toISOString()
    });

    // Replace list stores for this user (simple & consistent)
    const replaceList = async (storeName, items, mapFn) => {
      const existing = await EphyraDB.getAllByIndex(storeName, 'email', email);
      for (const row of existing) await EphyraDB.remove(storeName, row.id);
      if (items && items.length) {
        await EphyraDB.putMany(storeName, items.map(mapFn));
      }
    };

    await replaceList('transactions', [...(data.receitas || []), ...(data.despesas || [])], (t) => ({
      ...t,
      id: t.id || `${email}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email
    }));

    await replaceList('history', data.historico || [], (t) => ({
      ...t,
      id: t.id || `${email}_h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email
    }));

    await replaceList('goals', data.metas || [], (g) => ({
      ...g,
      id: g.id || `${email}_g_${Date.now()}`,
      email
    }));

    await replaceList('categories', data.categorias || [], (c) => ({
      ...c,
      id: c.id || `${email}_c_${Date.now()}`,
      email
    }));

    await replaceList('achievements', data.conquistas || [], (a) => ({
      ...a,
      id: a.id ? `${email}__${a.id}` : `${email}_a_${Date.now()}`,
      achievementId: a.id,
      email
    }));
  }

  // ─── Export / Import ─────────────────────────────────────

  async function exportAll(email) {
    const user = await getUser(email);
    const data = await getUserData(email);
    return JSON.stringify({
      user,
      data,
      exp: new Date().toISOString(),
      version: 'idb-1.0'
    }, null, 2);
  }

  async function importAll(email, payload) {
    let obj = payload;
    if (typeof payload === 'string') obj = JSON.parse(payload);
    if (!obj || !obj.data) throw new Error('Formato inválido');
    if (obj.user) await upsertUser({ ...obj.user, email: email || obj.user.email });
    await saveUserData(email || obj.user?.email, obj.data);
    return obj;
  }

  async function resetUser(email) {
    await removeUserData(email);
    const users = await getUsers();
    // keep account credentials; only wipe financial data
    return users;
  }

  async function wipeEverything() {
    await init();
    await EphyraDB.clearAll();
    _usersCache = {};
    _sessionCache = null;
    _dataCache.clear();
    // also clear legacy localStorage leftovers
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ephyra_')) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch (_) { /* ignore */ }
  }

  return {
    init,
    getUsers,
    saveUsers,
    getUser,
    upsertUser,
    getSession,
    saveSession,
    clearSession,
    getUserData,
    saveUserData,
    removeUserData,
    exportAll,
    importAll,
    resetUser,
    wipeEverything,
    migrateFromLocalStorage
  };
})();

if (typeof window !== 'undefined') window.EphyraStorage = EphyraStorage;
