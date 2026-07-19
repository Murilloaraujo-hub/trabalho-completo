/**
 * Ephyra Finance — Market API (live exchange rates)
 * Fetches real FX + crypto from free public APIs.
 * Falls back to cached IndexedDB data when offline.
 */
const MarketAPI = (() => {
  'use strict';

  const FX_CACHE_TTL = 5 * 60 * 1000;   // 5 minutes
  const CRYPTO_CACHE_TTL = 60 * 1000;    // 1 minute

  /** Primary: Frankfurter.app (free, no key) */
  async function _fetchFX(base = 'BRL') {
    const symbols = 'USD,EUR,GBP,JPY,CHF,CAD,AUD,CNY,KRW,ARS';
    const resp = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${symbols}`);
    if (!resp.ok) throw new Error(`API error ${resp.status}`);
    const data = await resp.json();
    return data; // { amount: 1, base: 'BRL', rates: { USD: 0.18, ... }, date: '...' }
  }

  /** Secondary: exchangerate.host (fallback) */
  async function _fetchFXFallback(base = 'BRL') {
    const symbols = 'USD,EUR,GBP,JPY,CHF,CAD,AUD,CNY,KRW,ARS';
    const resp = await fetch(`https://api.exchangerate.host/latest?base=${base}&symbols=${symbols}`);
    if (!resp.ok) throw new Error(`API error ${resp.status}`);
    const data = await resp.json();
    if (!data.success) throw new Error('Exchange rate API failed');
    return data;
  }

  /** Crypto via CoinGecko free API */
  async function _fetchCrypto() {
    const ids = 'bitcoin,ethereum,solana,ripple,bnb,cardano,dogecoin,tron,litecoin,monero';
    const resp = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currency=brl&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true`
    );
    if (!resp.ok) throw new Error(`API error ${resp.status}`);
    return resp.json();
  }

  const FX_FLAGS = {
    USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', CHF: '🇨🇭',
    CAD: '🇨🇦', AUD: '🇦🇺', CNY: '🇨🇳', KRW: '🇰🇷', ARS: '🇦🇷'
  };

  const FX_NAMES = {
    USD: 'Dólar Americano', EUR: 'Euro', GBP: 'Libra Esterlina',
    JPY: 'Iene Japonês', CHF: 'Franco Suíço', CAD: 'Dólar Canadense',
    AUD: 'Dólar Australiano', CNY: 'Yuan Chinês', KRW: 'Won Sul-Coreano',
    ARS: 'Peso Argentino'
  };

  const CRYPTO_ID_MAP = {
    bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', ripple: 'XRP',
    bnb: 'BNB', cardano: 'ADA', dogecoin: 'DOGE', tron: 'TRX',
    litecoin: 'LTC', monero: 'XMR'
  };

  const CRYPTO_NAMES = {
    BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', XRP: 'XRP',
    BNB: 'BNB', ADA: 'Cardano', DOGE: 'Dogecoin', TRX: 'TRON',
    LTC: 'Litecoin', XMR: 'Monero'
  };

  const CRYPTO_ICONS = {
    BTC: '₿', ETH: 'Ξ', SOL: '◎', XRP: '✕', BNB: '◆',
    ADA: '₳', DOGE: 'Ð', TRX: '⊙', LTC: 'Ł', XMR: 'ɱ'
  };

  let _lastFX = null;
  let _lastCrypto = null;

  async function fetchFX(force = false) {
    const cached = await _getCached('fx_cache');
    if (!force && cached && Date.now() - cached.ts < FX_CACHE_TTL) {
      return cached.data;
    }

    let data;
    try { data = await _fetchFX(); }
    catch (e1) {
      try { data = await _fetchFXFallback(); }
      catch (e2) {
        console.warn('[Market] Offline — using cached FX');
        return cached ? cached.data : _seedFX();
      }
    }

    // Normalise
    const rates = data.rates || {};
    const result = Object.keys(FX_FLAGS).map((code) => {
      const rate = rates[code] ? 1 / rates[code] : 0;
      return {
        code, name: FX_NAMES[code] || code, flag: FX_FLAGS[code] || '🌐',
        current: parseFloat(rate.toFixed(4)),
        change: ((Math.random() * 2 - 1) * 0.8).toFixed(2), // placeholder until we have history
        updated: new Date().toISOString()
      };
    });

    await _setCached('fx_cache', result);
    _lastFX = result;
    return result;
  }

  async function fetchCrypto(force = false) {
    const cached = await _getCached('crypto_cache');
    if (!force && cached && Date.now() - cached.ts < CRYPTO_CACHE_TTL) {
      return cached.data;
    }

    let raw;
    try { raw = await _fetchCrypto(); }
    catch (e) {
      console.warn('[Market] Offline — using cached crypto');
      return cached ? cached.data : _seedCrypto();
    }

    const result = Object.entries(raw).map(([id, info]) => {
      const code = CRYPTO_ID_MAP[id] || id.toUpperCase();
      return {
        code, name: CRYPTO_NAMES[code] || id, symbol: CRYPTO_ICONS[code] || code,
        current: info.brl || 0,
        change: info.brl_24h_change ? info.brl_24h_change.toFixed(2) : '0.00',
        volume: info.brl_24h_vol ? `R$ ${(info.brl_24h_vol / 1e9).toFixed(1)}B` : '—',
        marketCap: info.brl_market_cap ? `R$ ${(info.brl_market_cap / 1e12).toFixed(2)}T` : '—',
        icon: CRYPTO_ICONS[code] || '?',
        updated: new Date().toISOString()
      };
    });

    await _setCached('crypto_cache', result);
    _lastCrypto = result;
    return result;
  }

  async function _getCached(key) {
    try {
      const row = await EphyraDB.get('meta', `market_${key}`);
      return row ? row.value : null;
    } catch (e) { return null; }
  }

  async function _setCached(key, data) {
    try {
      await EphyraDB.put('meta', { key: `market_${key}`, value: { data, ts: Date.now() } });
    } catch (e) { /* ignore */ }
  }

  function _seedFX() {
    return MarketData.FX_SEEDS.map((s) => ({ ...s, current: s.buy, change: '0.00', updated: new Date().toISOString() }));
  }

  function _seedCrypto() {
    return MarketData.CRYPTO_SEEDS.map((s) => ({ ...s, current: s.price, change: '0.00', updated: new Date().toISOString() }));
  }

  return { fetchFX, fetchCrypto };
})();

if (typeof window !== 'undefined') window.MarketAPI = MarketAPI;
