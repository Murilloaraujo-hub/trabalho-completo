/**
 * Ephyra Finance — Sidebar Controller
 * Intelligent collapsible sidebar with hover-expand and keyboard accessibility.
 * Does NOT change any existing visual identity — only adds behavior + new CSS classes.
 */
const EphyraSidebar = (() => {
  'use strict';

  const SIDEBAR_EL = '.sidebar';
  const SB_ITEM_EL = '.sb-item';
  const NAV_LINKS = '.sb-item, [data-nav]';
  const ICON_TEXT_GAP = 0.75; // rem, matches existing gap

  let sidebar;
  let isOpen = false;
  let hoverTimer = null;
  let isMobile = false;
  const MOBILE_BREAKPOINT = 1024;

  function _checkMobile() {
    isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    if (isMobile) {
      sidebar.classList.add('sb-sm');
      sidebar.classList.remove('sb-hover-expand');
    } else {
      sidebar.classList.remove('sb-sm');
    }
  }

  /** Open sidebar */
  function open() {
    if (isOpen || !sidebar) return;
    isOpen = true;
    sidebar.classList.add('sb-expanded');
    sidebar.classList.remove('sb-collapsed');
    document.documentElement.style.setProperty('--sb-width', '260px');
    if (document.querySelector('.main')) {
      document.querySelector('.main').style.marginLeft = '260px';
    }
    // reveal text labels
    sidebar.querySelectorAll(SB_ITEM_EL).forEach((el) => {
      el.style.setProperty('--sb-text-opacity', '1');
      el.style.setProperty('--sb-text-width', 'auto');
    });
  }

  /** Close sidebar to icon-only */
  function close() {
    if (!isOpen || !sidebar || isMobile) return;
    isOpen = false;
    sidebar.classList.add('sb-collapsed');
    sidebar.classList.remove('sb-expanded');
    document.documentElement.style.setProperty('--sb-width', '68px');
    if (document.querySelector('.main')) {
      document.querySelector('.main').style.marginLeft = '68px';
    }
    sidebar.querySelectorAll(SB_ITEM_EL).forEach((el) => {
      el.style.setProperty('--sb-text-opacity', '0');
      el.style.setProperty('--sb-text-width', '0');
    });
  }

  /** Toggle (used by mobile menu button) */
  function toggle(force) {
    if (force !== undefined) {
      force ? open() : close();
    } else {
      isOpen ? close() : open();
    }
  }

  function _onMouseEnter() {
    if (isMobile) return;
    clearTimeout(hoverTimer);
    open();
  }

  function _onMouseLeave() {
    if (isMobile) return;
    hoverTimer = setTimeout(() => close(), 250);
  }

  function _initNavKeyboard() {
    sidebar.querySelectorAll(SB_ITEM_EL).forEach((el) => {
      el.setAttribute('tabindex', '0');
      if (!el.getAttribute('role')) el.setAttribute('role', 'button');
    });
  }

  /** Attach listeners */
  function init() {
    sidebar = document.querySelector(SIDEBAR_EL);
    if (!sidebar) {
      console.warn('[EphyraSidebar] sidebar element not found');
      return;
    }

    sidebar.classList.add('sb-collapsed'); // start collapsed
    sidebar.classList.remove('sb-hover-expand');
    sidebar.classList.remove('sb-expanded');
    isOpen = false;
    // force margin recalculation
    document.documentElement.style.setProperty('--sb-width', '68px');
    if (document.querySelector('.main')) {
      document.querySelector('.main').style.marginLeft = '68px';
    }

    _checkMobile();

    // Desktop hover-expand
    sidebar.addEventListener('mouseenter', _onMouseEnter);
    sidebar.addEventListener('mouseleave', _onMouseLeave);

    // Focus-expand (accessibility)
    sidebar.addEventListener('focusin', () => {
      if (!isMobile && !isOpen) open();
    });

    // Collapse on outside click (mobile overlay already handles this)
    document.addEventListener('click', (e) => {
      if (isMobile && isOpen && !sidebar.contains(e.target)) {
        close();
      }
    });

    // Resize
    window.addEventListener('resize', () => {
      _checkMobile();
      if (!isMobile && !isOpen) close();
    });

    // Init hidden text state
    sidebar.querySelectorAll(SB_ITEM_EL).forEach((el) => {
      el.style.setProperty('--sb-text-opacity', '0');
      el.style.setProperty('--sb-text-width', '0');
    });

    _initNavKeyboard();

    // Ensure settings gear button exists
    _ensureSettingsBtn();

    // Expose globally for inline onclick
    window.Sidebar = { open, close, toggle };
  }

  /** Inject settings gear above profile if not present */
  function _ensureSettingsBtn() {
    if (document.querySelector('.sb-settings-btn')) return;
    const footer = sidebar.querySelector('.sb-footer');
    if (!footer) return;
    const btn = document.createElement('div');
    btn.className = 'sb-settings-btn';
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-label', 'Configurações');
    btn.setAttribute('data-nav', 'configuracoes');
    btn.innerHTML = '<i class="fas fa-cog"></i>';
    btn.addEventListener('click', () => {
      if (typeof App !== 'undefined') App.nav('configuracoes');
      if (isMobile) close();
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (typeof App !== 'undefined') App.nav('configuracoes');
      }
    });
    footer.parentNode.insertBefore(btn, footer);
  }

  return { init, open, close, toggle };
})();

document.addEventListener('DOMContentLoaded', () => {
  // Delay to let Auth decide which screen to show
  setTimeout(() => EphyraSidebar.init(), 100);
});
