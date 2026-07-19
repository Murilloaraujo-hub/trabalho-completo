/**
 * Ephyra Finance — IndexedDB Database Layer
 * Unique low-level persistence access. No other module may open IndexedDB directly.
 * @version 1.0.0
 */
const EphyraDB = (() => {
  'use strict';

  const DB_NAME = 'EphyraFinanceDB';
  const DB_VERSION = 1;

  /** @type {IDBDatabase|null} */
  let _db = null;
  let _opening = null;

  const STORES = {
    meta: { keyPath: 'key' },
    users: { keyPath: 'email', indexes: [{ name: 'nome', keyPath: 'nome', unique: false }] },
    sessions: { keyPath: 'id' },
    userdata: { keyPath: 'email' },
    transactions: {
      keyPath: 'id',
      indexes: [
        { name: 'email', keyPath: 'email', unique: false },
        { name: 'tipo', keyPath: 'tipo', unique: false },
        { name: 'data', keyPath: 'data', unique: false },
        { name: 'categoria', keyPath: 'categoria', unique: false }
      ]
    },
    goals: {
      keyPath: 'id',
      indexes: [
        { name: 'email', keyPath: 'email', unique: false },
        { name: 'status', keyPath: 'status', unique: false }
      ]
    },
    categories: {
      keyPath: 'id',
      indexes: [{ name: 'email', keyPath: 'email', unique: false }]
    },
    achievements: {
      keyPath: 'id',
      indexes: [{ name: 'email', keyPath: 'email', unique: false }]
    },
    settings: { keyPath: 'email' },
    history: {
      keyPath: 'id',
      indexes: [
        { name: 'email', keyPath: 'email', unique: false },
        { name: 'data', keyPath: 'data', unique: false }
      ]
    },
    xp: { keyPath: 'email' },
    notifications: {
      keyPath: 'id',
      indexes: [{ name: 'email', keyPath: 'email', unique: false }]
    },
    statistics: { keyPath: 'email' }
  };

  function _req(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    });
  }

  function _txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  }

  /**
   * Open (or reuse) the database connection.
   * @returns {Promise<IDBDatabase>}
   */
  async function open() {
    if (_db) return _db;
    if (_opening) return _opening;

    _opening = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB não suportado neste navegador'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = req.result;
        const oldVersion = event.oldVersion || 0;

        Object.entries(STORES).forEach(([name, cfg]) => {
          let store;
          if (!db.objectStoreNames.contains(name)) {
            store = db.createObjectStore(name, { keyPath: cfg.keyPath });
          } else if (oldVersion > 0 && req.transaction) {
            store = req.transaction.objectStore(name);
          }
          if (store && cfg.indexes) {
            cfg.indexes.forEach((idx) => {
              if (!store.indexNames.contains(idx.name)) {
                store.createIndex(idx.name, idx.keyPath, { unique: !!idx.unique });
              }
            });
          }
        });
      };

      req.onsuccess = () => {
        _db = req.result;
        _db.onversionchange = () => {
          try { _db.close(); } catch (_) { /* ignore */ }
          _db = null;
        };
        _opening = null;
        resolve(_db);
      };

      req.onerror = () => {
        _opening = null;
        reject(req.error || new Error('Falha ao abrir IndexedDB'));
      };

      req.onblocked = () => {
        console.warn('[EphyraDB] Abertura bloqueada — feche outras abas do app');
      };
    });

    return _opening;
  }

  async function _store(name, mode = 'readonly') {
    const db = await open();
    const tx = db.transaction(name, mode);
    return { tx, store: tx.objectStore(name) };
  }

  /** @param {string} storeName @param {any} value */
  async function put(storeName, value) {
    const { tx, store } = await _store(storeName, 'readwrite');
    store.put(value);
    await _txDone(tx);
    return value;
  }

  /** @param {string} storeName @param {any[]} values */
  async function putMany(storeName, values) {
    const { tx, store } = await _store(storeName, 'readwrite');
    values.forEach((v) => store.put(v));
    await _txDone(tx);
    return values;
  }

  /** @param {string} storeName @param {IDBValidKey} key */
  async function get(storeName, key) {
    const { store } = await _store(storeName, 'readonly');
    return _req(store.get(key));
  }

  /** @param {string} storeName */
  async function getAll(storeName) {
    const { store } = await _store(storeName, 'readonly');
    return _req(store.getAll());
  }

  /**
   * @param {string} storeName
   * @param {string} indexName
   * @param {IDBValidKey} value
   */
  async function getAllByIndex(storeName, indexName, value) {
    const { store } = await _store(storeName, 'readonly');
    const index = store.index(indexName);
    return _req(index.getAll(value));
  }

  /** @param {string} storeName @param {IDBValidKey} key */
  async function remove(storeName, key) {
    const { tx, store } = await _store(storeName, 'readwrite');
    store.delete(key);
    await _txDone(tx);
  }

  /** @param {string} storeName */
  async function clear(storeName) {
    const { tx, store } = await _store(storeName, 'readwrite');
    store.clear();
    await _txDone(tx);
  }

  /** Clear every object store */
  async function clearAll() {
    const db = await open();
    const names = Array.from(db.objectStoreNames);
    const tx = db.transaction(names, 'readwrite');
    names.forEach((n) => tx.objectStore(n).clear());
    await _txDone(tx);
  }

  /** @param {string} storeName @param {IDBValidKey} key */
  async function has(storeName, key) {
    const row = await get(storeName, key);
    return row !== undefined;
  }

  /** Meta helpers (key/value) */
  async function metaGet(key, fallback = null) {
    const row = await get('meta', key);
    return row ? row.value : fallback;
  }

  async function metaSet(key, value) {
    return put('meta', { key, value });
  }

  async function close() {
    if (_db) {
      try { _db.close(); } catch (_) { /* ignore */ }
      _db = null;
    }
  }

  return {
    open,
    close,
    put,
    putMany,
    get,
    getAll,
    getAllByIndex,
    remove,
    clear,
    clearAll,
    has,
    metaGet,
    metaSet,
    STORES: Object.keys(STORES),
    DB_NAME,
    DB_VERSION
  };
})();

// UMD-ish global for non-module script tags
if (typeof window !== 'undefined') window.EphyraDB = EphyraDB;
