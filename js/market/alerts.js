/**
 * Ephyra Finance — Market Alerts
 * Persisted in IndexedDB. Non-intrusive in-app notifications.
 */
const MarketAlerts = (() => {
  'use strict';
  const STORE = 'market_alerts';

  /**
   * @param {'fx'|'crypto'} type
   * @param {string} code
   * @param {'gt'|'lt'} condition  (greater than / less than)
   * @param {number} target
   */
  async function create(type, code, condition, target) {
    const id = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const alert = { id, type, code, condition, target, createdAt: new Date().toISOString(), triggered: false };
    await EphyraDB.put(STORE, alert);
    return alert;
  }

  async function getAll() {
    return EphyraDB.getAll(STORE);
  }

  async function remove(id) {
    await EphyraDB.remove(STORE, id);
  }

  /** Check all alerts against current prices; trigger notifications */
  async function check() {
    const alerts = await getAll();
    if (!alerts.length) return;

    const fx = await MarketData.seedFX();
    const crypto = await MarketData.seedCrypto();

    for (const alert of alerts) {
      if (alert.triggered) continue;
      let current = 0;
      if (alert.type === 'fx') {
        const item = fx.find((x) => x.code === alert.code);
        if (item) current = item.current;
      } else {
        const item = crypto.find((x) => x.code === alert.code);
        if (item) current = item.current;
      }
      if (!current) continue;

      const hit = alert.condition === 'gt' ? current >= alert.target : current <= alert.target;
      if (hit) {
        alert.triggered = true;
        alert.triggeredAt = new Date().toISOString();
        await EphyraDB.put(STORE, alert);
        if (typeof Toast !== 'undefined') {
          Toast.s(`🔔 Alerta: ${alert.code} ${alert.condition === 'gt' ? 'subiu' : 'caiu'} para ${U.money(alert.target)}`);
        }
      }
    }
  }

  return { create, getAll, remove, check };
})();
