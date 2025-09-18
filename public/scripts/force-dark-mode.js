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

  const log = (message, data) => {
    if (DEBUG) console.log(`[FORCE-DARK-MODE] ${message}`, data || '');
  };

  const getStoredTheme = () => localStorage.getItem('lookescolar-theme');
  const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = () => {
    const stored = getStoredTheme();
    return stored === 'dark' || stored === 'night' || (stored === 'system' && systemPrefersDark());
  };
  const isDarkApplied = () => {
    const html = document.documentElement;
    return (
      html.classList.contains('dark') &&
      html.getAttribute('data-theme') === 'dark'
    );
  };

  let isApplying = false;
  let applyTimer = null;
  const scheduleApply = (delay = 50) => {
    if (applyTimer) clearTimeout(applyTimer);
    applyTimer = setTimeout(applyDarkMode, delay);
  };

  function applyDarkMode() {
    if (isApplying) return;
    const wantDark = shouldBeDark();
    const hasDark = isDarkApplied();
    if ((wantDark && hasDark) || (!wantDark && !hasDark)) {
      log('No theme change needed', { wantDark, hasDark });
      return;
    }

    isApplying = true;
    try {
      const html = document.documentElement;
      const stored = getStoredTheme();
      const wantNight = stored === 'night';

      if (wantDark) {
        // Normalize classes/attributes on html only (align with ThemeProvider)
        html.classList.add('dark');
        if (wantNight) html.classList.add('night'); else html.classList.remove('night');
        html.setAttribute('data-theme', 'dark');
        log('Dark mode applied');
      } else {
        html.classList.remove('dark');
        html.classList.remove('night');
        html.setAttribute('data-theme', 'light');
        log('Light mode applied');
      }
    } finally {
      isApplying = false;
    }
  }

  let htmlObserver = null;
  function startObserver() {
    if (htmlObserver) return;
    htmlObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')
        ) {
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

  function periodicThemeCheck() {
    setInterval(() => {
      const mismatch = shouldBeDark() !== isDarkApplied();
      if (mismatch) {
        log('Theme mismatch detected; correcting');
        applyDarkMode();
      }
    }, 5000);
  }

  scheduleApply(0);
  startObserver();
  wireEvents();
  periodicThemeCheck();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduleApply(0));
  }
  window.addEventListener('load', () => scheduleApply(0));

  window.forceDarkModeApplication = applyDarkMode;
  log('Force dark mode script initialized');
})();
