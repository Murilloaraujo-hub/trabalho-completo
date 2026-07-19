/**
 * Ephyra Finance — Bootstrap
 * Boots after all modules are loaded.
 * The inline script in index.html handles the primary init.
 */
document.addEventListener('DOMContentLoaded', () => {
  // All modules are loaded as regular scripts (no ES modules)
  // App.init() is called inline in index.html after DOMContentLoaded
  // Sidebar auto-inits after 100ms to wait for App shell render

  if (typeof EphyraSidebar !== 'undefined') {
    // EphyraSidebar already self-inits via setTimeout
  }

  // Register offline/online listeners for Market module
  window.addEventListener('offline', () => {
    if (typeof Toast !== 'undefined') Toast.w('Modo offline — cotações podem estar desatualizadas');
  });
  window.addEventListener('online', () => {
    if (typeof Toast !== 'undefined') Toast.s('Conexão restaurada');
    // Trigger market refresh
    if (typeof MarketAPI !== 'undefined') {
      MarketAPI.fetchFX(true).catch(() => {});
      MarketAPI.fetchCrypto(true).catch(() => {});
    }
  });
});
