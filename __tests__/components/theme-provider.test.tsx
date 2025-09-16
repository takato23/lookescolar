import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from '@/components/providers/theme-provider';

function ThemeToggleButton() {
  const { setTheme, resolvedTheme } = useTheme();
  return (
    <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
      toggle
    </button>
  );
}

describe('ThemeProvider', () => {
  it('applies classes and data-theme on mount and toggle', async () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey="test-theme-key">
        <ThemeToggleButton />
      </ThemeProvider>
    );

    // Initial light
    const html = document.documentElement;
    expect(html.classList.contains('light') || !html.classList.contains('dark')).toBe(true);
    expect(html.getAttribute('data-theme')).toBe('light');

    // Toggle to dark
    const btn = screen.getByText('toggle');
    fireEvent.click(btn);

    expect(html.classList.contains('dark')).toBe(true);
    expect(html.getAttribute('data-theme')).toBe('dark');

    // Toggle back to light
    fireEvent.click(btn);
    expect(html.classList.contains('light') || !html.classList.contains('dark')).toBe(true);
    expect(html.getAttribute('data-theme')).toBe('light');
  });
});

