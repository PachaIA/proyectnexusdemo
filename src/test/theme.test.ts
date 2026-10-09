import { describe, expect, it } from 'vitest';
import { applyTheme, resolveTheme } from '@/lib/theme';
import { fmtEur } from '@/hooks/useOpportunityLines';

describe('Nexus theme preference', () => {
  it('formats money with Spanish grouping, two decimals and trailing euro', () => {
    expect(fmtEur(1234.56).replace(/\s/g, ' ')).toBe('1.234,56 €');
  });
  it('defaults to Noche with a dark system preference', () => expect(resolveTheme(null, false)).toBe('noche'));
  it('respects a light system preference on first load', () => expect(resolveTheme(null, true)).toBe('caliza'));
  it('retains an explicit Noche choice over a light system preference', () => expect(resolveTheme('noche', true)).toBe('noche'));
  it('retains an explicit Caliza choice over a dark system preference', () => expect(resolveTheme('caliza', false)).toBe('caliza'));
  it('migrates prior saved choices', () => {
    expect(resolveTheme('light', false)).toBe('caliza');
    expect(resolveTheme('dark', true)).toBe('noche');
  });
  it('keeps theme, native controls and legacy map appearance synchronized', () => {
    applyTheme('caliza');
    expect(document.documentElement.dataset.theme).toBe('caliza');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
    applyTheme('noche');
    expect(document.documentElement.dataset.theme).toBe('noche');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});