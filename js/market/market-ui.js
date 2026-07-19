/**
 * Ephyra Finance — Market UI Renderer
 * Builds the Mercado page cards, tabs, converter & favorites.
 */
const MarketUI = (() => {
  'use strict';

  let activeTab = 'fx';
  let refreshInterval = null;

  /* ---- helpers ---- */
  function _money(v) { return U.money(v); }

  function _changeBadge(pct) {
    const n = parseFloat(pct);
    const dir = n >= 0 ? 'up' : 'down';
    const cls = n >= 0 ? 'tg' : 'td';
    const arrow = n >= 0 ? '▲' : '▼';
    return `<span class="badge ${dir === 'up' ? 'bds' : 'bdd'}">${arrow} ${Math.abs(n).toFixed(2)}%</span>`;
  }

  function _favBtn(code, isFav) {
    return `<button class="market-fav-btn ${isFav ? 'active' : ''}" onclick="MarketUI.toggleFav('${code}')" aria-label="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">${isFav ? '★' : '☆'}</button>`;
  }

  function _updated(time) {
    if (!time) return '';
    const d = new Date(time);
    return `<div class="market-updated">Atualizado: ${d.toLocaleTimeString('pt-BR')}</div>`;
  }

  /* ---- Tabs ---- */
  function switchTab(tab) {
    activeTab = tab;
    const tabs = document.querySelectorAll('.market-tab');
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    render(activeTab);
  }

  /* ---- Render ---- */
  async function render(tab) {
    const container = document.getElementById('pg-mercado');
    if (!container) return;
    container.classList.add('a');

    switch (tab || activeTab) {
      case 'fx': await renderFX(container); break;
      case 'crypto': await renderCrypto(container); break;
      case 'converter': await renderConverter(container); break;
      case 'alerts': await renderAlerts(container); break;
    }
  }

  /* ---- Moedas ---- */
  async function renderFX(container) {
    let items;
    try { items = await MarketAPI.fetchFX(); }
    catch (e) { items = await MarketData.seedFX(); }
    container.innerHTML = `
      <div class="ph"><div><h2 class="pt">💱 Moedas</h2><p class="psub">Cotações em tempo real</p></div></div>
      <div class="tabs market-tabs" id="market-tabs">
        <button class="tab market-tab active" data-tab="fx" onclick="MarketUI.switchTab('fx')">Moedas</button>
        <button class="tab market-tab" data-tab="crypto" onclick="MarketUI.switchTab('crypto')">Cripto</button>
        <button class="tab market-tab" data-tab="converter" onclick="MarketUI.switchTab('converter')">Conversor</button>
        <button class="tab market-tab" data-tab="alerts" onclick="MarketUI.switchTab('alerts')">Alertas</button>
      </div>
      <div class="market-grid">
        ${items.map((item) => `
          <div class="card market-card">
            <div class="market-card-head">
              <span style="font-size:1.5rem">${item.flag}</span>
              <div style="flex:1;text-align:left;margin-left:.75rem">
                <div class="market-coin-name">${item.name}</div>
                <div class="market-coin-ticker">${item.code}/BRL</div>
              </div>
              ${_favBtn(item.code, false)}
            </div>
            <div class="market-price-row">
              <span class="market-price">${_money(item.current)}</span>
              ${_changeBadge(item.change)}
            </div>
            ${_updated(item.updated)}
          </div>
        `).join('')}
      </div>`;
  }

  /* ---- Cripto ---- */
  async function renderCrypto(container) {
    let items;
    try { items = await MarketAPI.fetchCrypto(); }
    catch (e) { items = await MarketData.seedCrypto(); }
    container.innerHTML = `
      <div class="ph"><div><h2 class="pt">₿ Criptomoedas</h2><p class="psub">Principais criptos do mercado</p></div></div>
      <div class="tabs market-tabs" id="market-tabs">
        <button class="tab market-tab" data-tab="fx" onclick="MarketUI.switchTab('fx')">Moedas</button>
        <button class="tab market-tab active" data-tab="crypto" onclick="MarketUI.switchTab('crypto')">Cripto</button>
        <button class="tab market-tab" data-tab="converter" onclick="MarketUI.switchTab('converter')">Conversor</button>
        <button class="tab market-tab" data-tab="alerts" onclick="MarketUI.switchTab('alerts')">Alertas</button>
      </div>
      <div class="market-grid">
        ${items.map((item) => `
          <div class="card market-card">
            <div class="market-card-head">
              <span style="font-size:1.3rem;font-weight:800;color:var(--cp)">${item.icon}</span>
              <div style="flex:1;text-align:left;margin-left:.75rem">
                <div class="market-coin-name">${item.name}</div>
                <div class="market-coin-ticker">${item.code}/BRL</div>
              </div>
              ${_favBtn(item.code, false)}
            </div>
            <div class="market-price-row">
              <span class="market-price">${_money(item.current)}</span>
              ${_changeBadge(item.change)}
            </div>
            <div class="market-extra">
              <span>Máx: ${_money(item.high)}</span>
              <span>Mín: ${_money(item.low)}</span>
            </div>
            ${_updated(item.updated)}
          </div>
        `).join('')}
      </div>`;
  }

  /* ---- Conversor ---- */
  async function renderConverter(container) {
    const all = [...CurrencyConverter.ALL_CURRENCIES, ...CurrencyConverter.ALL_CRYPTO];
    container.innerHTML = `
      <div class="ph"><div><h2 class="pt">🔄 Conversor</h2><p class="psub">Converta entre qualquer moeda ou criptomoeda</p></div></div>
      <div class="tabs market-tabs" id="market-tabs">
        <button class="tab market-tab" data-tab="fx" onclick="MarketUI.switchTab('fx')">Moedas</button>
        <button class="tab market-tab" data-tab="crypto" onclick="MarketUI.switchTab('crypto')">Cripto</button>
        <button class="tab market-tab active" data-tab="converter" onclick="MarketUI.switchTab('converter')">Conversor</button>
        <button class="tab market-tab" data-tab="alerts" onclick="MarketUI.switchTab('alerts')">Alertas</button>
      </div>
      <div class="card" style="max-width:520px;margin:0 auto">
        <div class="fg">
          <label class="form-label">Valor</label>
          <input class="form-input" id="conv-amount" type="number" step="any" min="0" value="100" oninput="MarketUI.doConvert()">
        </div>
        <div class="g2" style="margin-top:.5rem">
          <div class="fg">
            <label class="form-label">De</label>
            <select class="form-input" id="conv-from" onchange="MarketUI.doConvert()">${all.map(c => `<option value="${c}" ${c==='BRL'?'selected':''}>${c}</option>`).join('')}</select>
          </div>
          <div class="fg">
            <label class="form-label">Para</label>
            <select class="form-input" id="conv-to" onchange="MarketUI.doConvert()">${all.map(c => `<option value="${c}" ${c==='USD'?'selected':''}>${c}</option>`).join('')}</select>
          </div>
        </div>
        <div style="text-align:center;margin-top:1.5rem">
          <div class="market-conv-result" id="conv-result">—</div>
        </div>
      </div>`;
    setTimeout(() => this.doConvert(), 100);
  }

  async function doConvert() {
    const amount = parseFloat(document.getElementById('conv-amount')?.value || 0);
    const from = document.getElementById('conv-from')?.value;
    const to = document.getElementById('conv-to')?.value;
    const el = document.getElementById('conv-result');
    if (!el || !amount || amount <= 0 || !from || !to) { if (el) el.textContent = '—'; return; }
    const result = await CurrencyConverter.convert(amount, from, to);
    const sym = CurrencyConverter.symbol(to);
    el.innerHTML = `<span style="font-size:2rem;font-weight:800">${sym} ${parseFloat(result).toLocaleString('pt-BR', { maximumFractionDigits: 8 })}</span>
      <div style="font-size:.85rem;color:var(--tm);margin-top:.25rem">${CurrencyConverter.format(amount, from)} → ${sym} ${parseFloat(result).toLocaleString('pt-BR', { maximumFractionDigits: 8 })}</div>`;
  }

  /* ---- Alertas ---- */
  async function renderAlerts(container) {
    const alerts = await MarketAlerts.getAll();
    const all = [...CurrencyConverter.ALL_CURRENCIES, ...CurrencyConverter.ALL_CRYPTO];
    container.innerHTML = `
      <div class="ph"><div><h2 class="pt">🔔 Alertas de Preço</h2><p class="psub">Receba notificações quando o preço atingir seu alvo</p></div></div>
      <div class="tabs market-tabs" id="market-tabs">
        <button class="tab market-tab" data-tab="fx" onclick="MarketUI.switchTab('fx')">Moedas</button>
        <button class="tab market-tab" data-tab="crypto" onclick="MarketUI.switchTab('crypto')">Cripto</button>
        <button class="tab market-tab" data-tab="converter" onclick="MarketUI.switchTab('converter')">Conversor</button>
        <button class="tab market-tab active" data-tab="alerts" onclick="MarketUI.switchTab('alerts')">Alertas</button>
      </div>
      <div class="card" style="max-width:520px;margin:0 auto 1.5rem">
        <h3 class="f7" style="margin-bottom:1rem">Novo Alerta</h3>
        <div class="g2">
          <div class="fg"><label class="form-label">Ativo</label>
            <select class="form-input" id="alert-code">${all.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
          <div class="fg"><label class="form-label">Condição</label>
            <select class="form-input" id="alert-cond"><option value="gt">Maior que</option><option value="lt">Menor que</option></select></div>
        </div>
        <div class="fg" style="margin-top:.75rem"><label class="form-label">Valor Alvo (R$)</label>
          <input class="form-input" id="alert-target" type="number" step="0.01" min="0.01" placeholder="Ex: 6.00"></div>
        <button class="btn btn-primary bb" style="margin-top:1rem" onclick="MarketUI.createAlert()">Criar Alerta</button>
      </div>
      <div class="market-alerts-list">
        ${alerts.length ? alerts.map(a => `
          <div class="card market-alert-item">
            <div class="flx jb aic">
              <div>
                <strong>${a.code}</strong> ${a.condition === 'gt' ? '>' : '<'} ${_money(a.target)}
                ${a.triggered ? '<span class="badge bds" style="margin-left:.5rem">Disparado</span>' : ''}
              </div>
              <button class="btn btn-ghost btn-sm" onclick="MarketUI.deleteAlert('${a.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        `).join('') : '<div class="es"><div class="ei">🔔</div><h3>Nenhum alerta</h3><p>Crie alertas para acompanhar seus ativos</p></div>'}
      </div>`;
  }

  async function createAlert() {
    const code = document.getElementById('alert-code').value;
    const cond = document.getElementById('alert-cond').value;
    const target = parseFloat(document.getElementById('alert-target').value);
    if (isNaN(target) || target <= 0) { Toast.e('Valor alvo inválido'); return; }
    await MarketAlerts.create(code.includes('/') || code.length <= 3 ? 'fx' : 'crypto', code, cond, target);
    Toast.s('Alerta criado!');
    this.render('alerts');
  }

  async function deleteAlert(id) {
    await MarketAlerts.remove(id);
    Toast.s('Alerta removido');
    this.render('alerts');
  }

  /* ---- Favorites (global toggle) ---- */
  async function toggleFav(code) {
    const isFav = await MarketFavorites.isFav(code);
    if (isFav) { await MarketFavorites.remove(code); Toast.i(`${code} removido dos favoritos`); }
    else { await MarketFavorites.add(code); Toast.s(`${code} adicionado aos favoritos ★`); }
    this.render(activeTab);
  }

  /* ---- Auto-refresh ---- */
  function startAutoRefresh() {
    if (refreshInterval) return;
    const run = async () => {
      try {
        if (activeTab === 'fx') { await MarketAPI.fetchFX(true); render('fx'); }
        if (activeTab === 'crypto') { await MarketAPI.fetchCrypto(true); render('crypto'); }
        await MarketAlerts.check();
      } catch (e) { /* ignore auto-refresh errors */ }
    };
    refreshInterval = setInterval(run, 60000); // FX every 60s, crypto every 60s
  }

  function stopAutoRefresh() {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }

  return {
    switchTab,
    render,
    doConvert,
    createAlert,
    deleteAlert,
    toggleFav,
    startAutoRefresh,
    stopAutoRefresh
  };
})();
