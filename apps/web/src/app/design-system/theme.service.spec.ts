import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { parseTheme, resolveTheme, THEME_STORAGE_KEY, ThemeService } from './theme.service';

@Component({ template: '' })
class ThemeHostComponent {
  readonly theme = inject(ThemeService);
}

describe('ThemeService', () => {
  it('parses persisted preferences and resolves system mode', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('unexpected')).toBe('system');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('persists and applies an explicit preference', async () => {
    localStorage.clear();
    const fixture = TestBed.createComponent(ThemeHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.theme.setPreference('dark');

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(fixture.componentInstance.theme.resolved()).toBe('dark');
  });
});
