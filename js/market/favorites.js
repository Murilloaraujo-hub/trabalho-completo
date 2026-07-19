/**
 * Ephyra Finance — Market Favorites
 * IndexedDB persistence for starred assets.
 */
const MarketFavorites = (() => {
  'use strict';
  const KEY = 'market_favorites';

  async function get() {
    const row = await EphyraDB.metaGet(KEY);
    return row || [];
  }

  async function add(code) {
    const favs = await get();
    if (!favs.includes(code)) {
      favs.unshift(code);
      await EphyraDB.metaSet(KEY, favs);
    }
    return favs;
  }

  async function remove(code) {
    let favs = await get();
    favs = favs.filter((c) => c !== code);
    await EphyraDB.metaSet(KEY, favs);
    return favs;
  }

  async function isFav(code) {
    const favs = await get();
    return favs.includes(code);
  }

  /** Sort items: favorites first */
  async function sortFirst(items) {
    const favs = await get();
    if (!favs.length) return items;
    return [...items].sort((a, b) => {
      const ai = favs.indexOf(a.code);
      const bi = favs.indexOf(b.code);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }

  return { get, add, remove, isFav, sortFirst };
})();
