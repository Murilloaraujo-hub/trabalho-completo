/**
 * Ephyra Finance — Currency Converter Engine
 * Uses MarketData for BRL pivot conversion.
 */
const CurrencyConverter = (() => {
  'use strict';

  const ALL_CURRENCIES = [
    'BRL', 'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'KRW', 'ARS'
  ];

  const ALL_CRYPTO = [
    'BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'TRX', 'LTC', 'XMR'
  ];

  const SYMBOLS = {
    BRL: 'R$', USD: '$', EUR: '€', GBP: '£', JPY: '¥', CHF: 'Fr',
    CAD: 'C$', AUD: 'A$', CNY: '¥', KRW: '₩', ARS: '$',
    BTC: '₿', ETH: 'Ξ', SOL: '◎', XRP: '✕', BNB: '◆',
    ADA: '₳', DOGE: 'Ð', TRX: '⊙', LTC: 'Ł', XMR: 'ɱ'
  };

  async function getRate(code) {
    if (code === 'BRL') return 1;
    // First try live MarketAPI data
    if (ALL_CRYPTO.includes(code)) {
      const cData = await MarketAPI.fetchCrypto();
      const item = cData.find(x => x.code === code);
      if (item && item.current) return item.current; // BRL price per unit
    } else {
      const fData = await MarketAPI.fetchFX();
      const item = fData.find(x => x.code === code);
      if (item && item.current) return item.current; // BRL price per unit
    }
    return 1; // fallback
  }

  async function convert(amount, from, to) {
    if (!amount || isNaN(amount) || amount <= 0) return null;
    if (isNaN(amount)) return null;
    if (from === to) return +amount;
    try {
      // Convert via BRL pivot
      const fromRate = await getRate(from);
      const toRate = await getRate(to);
      if (!fromRate || !toRate || toRate === 0) return null;
      const brlAmount = parseFloat(amount) * fromRate;
      return +(brlAmount / toRate).toFixed(8);
    } catch (e) {
      console.error('[Converter] error', e);
      return null;
    }
  }

  function symbol(code) {
    return SYMBOLS[code?.toUpperCase()] || '';
  }

  function format(val, code) {
    const sym = symbol(code);
    return `${sym} ${parseFloat(val).toLocaleString('pt-BR', { maximumFractionDigits: 8 })}`;
  }

  return {
    ALL_CURRENCIES,
    ALL_CRYPTO,
    convert,
    symbol,
    format
  };
})();
