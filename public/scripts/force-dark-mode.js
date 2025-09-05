/**
 * Force Dark Mode Application Script
 * 
 * This script ensures that dark mode is applied correctly across all admin interfaces
 * regardless of the current theme provider state.
 */

(function() {
  'use strict';
  
  // Debug logging
  const log = (message, data) => {
    console.log(`[FORCE-DARK-MODE] ${message}`, data || '');
  };
  
  // Function to apply dark mode classes and attributes
  function applyDarkMode() {
    const html = document.documentElement;
    const body = document.body;
    
    log('Current theme state:', {
      htmlClass: html.className,
      htmlDataTheme: html.getAttribute('data-theme'),
      bodyClass: body.className
    });
    
    // Get current theme from localStorage
    const storedTheme = localStorage.getItem('lookescolar-theme');
    log('Stored theme:', storedTheme);
    
    // Check if we should be in dark mode
    const shouldBeDark = storedTheme === 'dark' || 
                        (storedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    log('Should be dark:', shouldBeDark);
    
    if (shouldBeDark) {
      // Apply all possible dark mode indicators
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
      body.classList.add('dark');
      
      // Force background colors using inline styles as fallback
      html.style.backgroundColor = '#0f172a';
      html.style.color = '#e2e8f0';
      body.style.backgroundColor = '#0f172a';
      body.style.color = '#e2e8f0';
      
      log('Dark mode applied');
    } else {
      // Remove dark mode classes
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
      body.classList.remove('dark');
      
      // Reset inline styles
      html.style.backgroundColor = '';
      html.style.color = '';
      body.style.backgroundColor = '';
      body.style.color = '';
      
      log('Light mode applied');
    }
  }
  
  // Function to observe theme changes
  function observeThemeChanges() {
    // Watch for changes to the theme in localStorage
    window.addEventListener('storage', (e) => {
      if (e.key === 'lookescolar-theme') {
        log('Theme changed via storage event:', e.newValue);
        setTimeout(applyDarkMode, 100);
      }
    });
    
    // Watch for changes to the HTML class attribute
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
          log('HTML attributes changed, re-checking theme');
          setTimeout(applyDarkMode, 100);
        }
      });
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });
    
    // Watch for prefers-color-scheme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      log('System theme preference changed');
      setTimeout(applyDarkMode, 100);
    });
  }
  
  // Function to force theme application periodically
  function periodicThemeCheck() {
    setInterval(() => {
      const currentTheme = localStorage.getItem('lookescolar-theme');
      const htmlHasDark = document.documentElement.classList.contains('dark');
      const shouldBeDark = currentTheme === 'dark' || 
                          (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      if (shouldBeDark !== htmlHasDark) {
        log('Theme mismatch detected, forcing correction');
        applyDarkMode();
      }
    }, 2000); // Check every 2 seconds
  }
  
  // Initialize immediately
  applyDarkMode();
  
  // Set up observers and periodic checks
  observeThemeChanges();
  periodicThemeCheck();
  
  // Apply theme after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyDarkMode);
  }
  
  // Apply theme after all resources are loaded
  window.addEventListener('load', applyDarkMode);
  
  // Expose function globally for manual triggering
  window.forceDarkModeApplication = applyDarkMode;
  
  log('Force dark mode script initialized');
})();
