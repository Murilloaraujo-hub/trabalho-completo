/**
 * Ephyra Finance — Shared Helpers
 * Mirrors the inline U/Toast helpers in index.html.
 * Useful for external modules (market, sidebar, etc.)
 */
const Helpers = {
  qs: (s) => document.querySelector(s),
  qsa: (s) => document.querySelectorAll(s),
  money: (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  on: (el, ev, fn) => el && el.addEventListener(ev, fn)
};

if (typeof window !== 'undefined') window.Helpers = Helpers;
