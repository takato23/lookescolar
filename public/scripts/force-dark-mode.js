/**
 * Force Dark Mode Application Script
 * 
 * This script ensures that dark mode is applied correctly across all admin interfaces
 * regardless of the current theme provider state.
 */

(function () {
  'use strict';

  // Debug flag (enable with localStorage 'debug:force-dark-mode' = '1' or ?forceDarkDebug=1)
  const DEBUG =
    (typeof location !== 'undefined' && location.search.includes('forceDarkDebug=1')) ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('debug:force-dark-mode') === '1');

  // Safe logger
  const log = (message, data) => {
    if (DEBUG) console.log(`[FORCE-DARK-MODE] ${message}`, data || '');
  };

  // Helpers
  const getStoredTheme = () => localStorage.getItem('lookescolar-theme');
  const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = () => {
    const stored = getStoredTheme();
    return stored === 'dark' || (stored === 'system' && systemPrefersDark());
  };
  const isDarkApplied = () => {
    const html = document.documentElement;
    const body = document.body;
    return (
      html.classList.contains('dark') &&
      body.classList.contains('dark') &&
      html.getAttribute('data-theme') === 'dark'
    );
  };

  // Guard to avoid re-entrant loops and a debouncer
  let isApplying = false;
  let applyTimer = null;
  const scheduleApply = (delay = 50) => {
    if (applyTimer) clearTimeout(applyTimer);
    applyTimer = setTimeout(applyDarkMode, delay);
  };

  function applyDarkMode() {
    if (isApplying) return; // prevent re-entrancy
    const wantDark = shouldBeDark();
    const hasDark = isDarkApplied();

    // Nothing to do
    if ((wantDark && hasDark) || (!wantDark && !hasDark)) {
      log('No theme change needed', { wantDark, hasDark });
      return;
    }

    isApplying = true;
    try {
      const html = document.documentElement;
      const body = document.body;

      log('Applying theme', { wantDark, htmlClass: html.className, bodyClass: body.className });

      if (wantDark) {
        // Only mutate when necessary to avoid mutation-observer loops
        if (!html.classList.contains('dark')) html.classList.add('dark');
        if (html.getAttribute('data-theme') !== 'dark') html.setAttribute('data-theme', 'dark');
        if (!body.classList.contains('dark')) body.classList.add('dark');

        if (html.style.backgroundColor !== '#0f172a') html.style.backgroundColor = '#0f172a';
        if (html.style.color !== '#e2e8f0') html.style.color = '#e2e8f0';
        if (body.style.backgroundColor !== '#0f172a') body.style.backgroundColor = '#0f172a';
        if (body.style.color !== '#e2e8f0') body.style.color = '#e2e8f0';

        log('Dark mode applied');
      } else {
        // Remove only if present
        if (html.classList.contains('dark')) html.classList.remove('dark');
        if (html.getAttribute('data-theme') !== 'light') html.setAttribute('data-theme', 'light');
        if (body.classList.contains('dark')) body.classList.remove('dark');

        if (html.style.backgroundColor) html.style.backgroundColor = '';
        if (html.style.color) html.style.color = '';
        if (body.style.backgroundColor) body.style.backgroundColor = '';
        if (body.style.color) body.style.color = '';

        log('Light mode applied');
      }
    } finally {
      isApplying = false;
    }
  }

  // Observe relevant changes but only act on mismatches
  let htmlObserver = null;
  function startObserver() {
    if (htmlObserver) return;
    htmlObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')
        ) {
          // Only schedule if current DOM does not match desired theme
          const mismatch = shouldBeDark() !== isDarkApplied();
          if (mismatch) {
            log('HTML attributes changed; scheduling theme reconcile');
            scheduleApply(80);
          }
        }
      }
    });

    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
  }

  function stopObserver() {
    if (htmlObserver) {
      htmlObserver.disconnect();
      htmlObserver = null;
    }
  }

  // Listen to storage and system preference changes
  function wireEvents() {
    window.addEventListener('storage', (e) => {
      if (e.key === 'lookescolar-theme') {
        log('Storage theme change detected', e.newValue);
        scheduleApply(50);
      }
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      log('System theme preference changed');
      scheduleApply(50);
    });
  }

  // Lightweight periodic check as a safety net
  function periodicThemeCheck() {
    setInterval(() => {
      const mismatch = shouldBeDark() !== isDarkApplied();
      if (mismatch) {
        log('Theme mismatch detected; correcting');
        applyDarkMode();
      }
    }, 5000); // every 5s (less aggressive)
  }

  // Bootstrap
  scheduleApply(0);
  startObserver();
  wireEvents();
  periodicThemeCheck();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduleApply(0));
  }
  window.addEventListener('load', () => scheduleApply(0));

  // Expose for manual trigger in console if needed
  window.forceDarkModeApplication = applyDarkMode;
  log('Force dark mode script initialized');
})();
