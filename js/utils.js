/**
 * Shared utilities (optional external module).
 * Core app currently embeds U/Toast in index.html for zero-latency boot.
 * This file documents the canonical helpers for future modular splits.
 */
const EphyraUtils = {
  id: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  money: (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  debounce(fn, ms = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  },
  throttle(fn, ms = 200) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= ms) {
        last = now;
        fn(...args);
      }
    };
  },
  sanitize(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }
};

if (typeof window !== 'undefined') window.EphyraUtils = EphyraUtils;
