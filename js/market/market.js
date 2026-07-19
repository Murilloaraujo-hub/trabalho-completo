/**
 * Ephyra Finance — Market Data Store (offline / IndexedDB)
 * No external APIs. Prices are realistic seed values + simulated micro-fluctuation.
 */
const MarketData = (() => {
  'use strict';

  const STORE_FX = 'market_fx';
  const STORE_CRYPTO = 'market_crypto';
  const STORE_PREFS = 'market_prefs';

  /** Seed realistic BRL-based FX rates */
  const FX_SEEDS = [
    { code: 'USD', name: 'Dólar Americano', flag: '🇺🇸', buy: 5.65, sell: 5.70, prev: 5.62 },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺', buy: 6.12, sell: 6.18, prev: 6.10 },
    { code: 'GBP', name: 'Libra Esterlina', flag: '🇬🇧', buy: 7.15, sell: 7.22, prev: 7.12 },
    { code: 'JPY', name: 'Iene Japonês', flag: '🇯🇵', buy: 0.0376, sell: 0.0381, prev: 0.0374 },
    { code: 'CHF', name: 'Franco Suíço', flag: '🇨🇭', buy: 6.42, sell: 6.48, prev: 6.39 },
    { code: 'CAD', name: 'Dólar Canadense', flag: '🇨🇦', buy: 4.15, sell: 4.20, prev: 4.12 },
    { code: 'AUD', name: 'Dólar Australiano', flag: '🇦🇺', buy: 3.72, sell: 3.77, prev: 3.70 },
    { code: 'CNY', name: 'Yuan Chinês', flag: '🇨🇳', buy: 0.782, sell: 0.788, prev: 0.780 },
    { code: 'KRW', name: 'Won Sul-Coreano', flag: '🇰🇷', buy: 0.00416, sell: 0.00421, prev: 0.00414 },
    { code: 'ARS', name: 'Peso Argentino', flag: '🇦🇷', buy: 0.00580, sell: 0.00590, prev: 0.00575 },
  ];

  /** Seed realistic BRL-based crypto prices */
  const CRYPTO_SEEDS = [
    { code: 'BTC', name: 'Bitcoin', symbol: '₿', price: 820000, prev: 810000, high: 835000, low: 805000, volume: 'R$ 12.5B', mcap: 'R$ 8.2T', icon: '₿' },
    { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', price: 18500, prev: 18200, high: 18900, low: 17900, volume: 'R$ 4.8B', mcap: 'R$ 1.1T', icon: 'Ξ' },
    { code: 'SOL', name: 'Solana', symbol: '◎', price: 980, prev: 960, high: 1010, low: 945, volume: 'R$ 1.9B', mcap: 'R$ 210B', icon: '◎' },
    { code: 'XRP', name: 'XRP', symbol: '✕', price: 12.50, prev: 12.20, high: 12.90, low: 12.10, volume: 'R$ 950M', mcap: 'R$ 35B', icon: '✕' },
    { code: 'BNB', name: 'BNB', symbol: '◆', price: 3450, prev: 3400, high: 3520, low: 3360, volume: 'R$ 680M', mcap: 'R$ 52B', icon: '◆' },
    { code: 'ADA', name: 'Cardano', symbol: '₳', price: 4.20, prev: 4.10, high: 4.35, low: 4.05, volume: 'R$ 320M', mcap: 'R$ 15B', icon: '₳' },
    { code: 'DOGE', name: 'Dogecoin', symbol: 'Ð', price: 0.95, prev: 0.92, high: 0.98, low: 0.90, volume: 'R$ 580M', mcap: 'R$ 8.5B', icon: 'Ð' },
    { code: 'TRX', name: 'TRON', symbol: '⊙', price: 1.15, prev: 1.12, high: 1.18, low: 1.10, volume: 'R$ 210M', mcap: 'R$ 6.2B', icon: '⊙' },
    { code: 'LTC', name: 'Litecoin', symbol: 'Ł', price: 520, prev: 510, high: 535, low: 505, volume: 'R$ 180M', mcap: 'R$ 4.1B', icon: 'Ł' },
    { code: 'XMR', name: 'Monero', symbol: 'ɱ', price: 890, prev: 875, high: 910, low: 865, volume: 'R$ 95M', mcap: 'R$ 2.8B', icon: 'ɱ' },
  ];

  function _fluctuate(base, rangePct = 0.15) {
    const delta = base * (Math.random() * 2 - 1) * rangePct / 100;
    return +(base + delta).toFixed(base > 100 ? 2 : base > 1 ? 4 : 6);
  }

  /** Generate history array of ~N points with realistic walk */
  function _genHistory(start, points = 30) {
    const arr = [];
    let p = start;
    for (let i = 0; i < points; i++) {
      p = _fluctuate(p, 0.8);
      arr.push(p);
    }
    return arr;
  }

  async function seedFX() {
    const existing = await EphyraDB.getAll(STORE_FX);
    if (existing && existing.length > 0) return existing;

    const items = FX_SEEDS.map((s) => ({
      ...s,
      current: _fluctuate(s.buy, 0.2),
      change: ((s.buy - s.prev) / s.prev * 100).toFixed(2),
      updated: new Date().toISOString(),
      history: _genHistory(s.buy, 24),
    }));
    await EphyraDB.putMany(STORE_FX, items);
    return items;
  }

  async function seedCrypto() {
    const existing = await EphyraDB.getAll(STORE_CRYPTO);
    if (existing && existing.length > 0) return existing;

    const items = CRYPTO_SEEDS.map((s) => ({
      ...s,
      current: _fluctuate(s.price, 0.3),
      change: ((s.price - s.prev) / s.prev * 100).toFixed(2),
      updated: new Date().toISOString(),
      history24h: _genHistory(s.price, 24),
      history7d: _genHistory(s.price, 7 * 4),
      history30d: _genHistory(s.price, 30),
      history90d: _genHistory(s.price, 90),
      history6m: _genHistory(s.price, 180),
      history1y: _genHistory(s.price, 365),
    }));
    await EphyraDB.putMany(STORE_CRYPTO, items);
    return items;
  }

  async function refreshFX() {
    const items = await EphyraDB.getAll(STORE_FX);
    if (!items || !items.length) return seedFX();
    const updated = items.map((item) => ({
      ...item,
      prev: item.current,
      current: _fluctuate(item.current, 0.25),
      change: item.prev > 0 ? ((item.current - item.prev) / item.prev * 100).toFixed(2) : item.change,
      updated: new Date().toISOString(),
    }));
    await EphyraDB.putMany(STORE_FX, updated);
    return updated;
  }

  async function refreshCrypto() {
    const items = await EphyraDB.getAll(STORE_CRYPTO);
    if (!items || !items.length) return seedCrypto();
    const updated = items.map((item) => ({
      ...item,
      prev: item.current,
      current: _fluctuate(item.current, 0.35),
      change: item.prev > 0 ? ((item.current - item.prev) / item.prev * 100).toFixed(2) : item.change,
      updated: new Date().toISOString(),
    }));
    await EphyraDB.putMany(STORE_CRYPTO, updated);
    return updated;
  }

  /** Get FX rate BRL → target (buy side) */
  async function getRate(target) {
    const items = await EphyraDB.getAll(STORE_FX);
    const item = items.find((x) => x.code === target.toUpperCase());
    if (!item) return 1; // BRL→BRL
    return item.current; // rate in BRL per 1 unit of target
  }

  /** Convert amount FROM currency TO currency using BRL as pivot */
  async function convert(amount, from, to) {
    if (from === to) return +amount;
    const fromRate = await getRate(from);
    const toRate = await getRate(to);
    const brlAmount = amount * fromRate;
    return +(brlAmount / toRate).toFixed(8);
  }

  return {
    seedFX,
    seedCrypto,
    refreshFX,
    refreshCrypto,
    getRate,
    convert,
    STORE_FX,
    STORE_CRYPTO,
    STORE_PREFS,
    FX_SEEDS,
    CRYPTO_SEEDS
  };
})();

if (typeof window !== 'undefined') window.MarketData = MarketData;
