export type ThemePreference = 'system' | 'light' | 'dark';
const KEY = 'lamid-theme';

export function getStoredTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(preference: ThemePreference) {
  if (preference === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = preference;
  try {
    localStorage.setItem(KEY, preference);
  } catch {
    // Storage may be unavailable (private browsing, blocked cookies); the
    // theme still applies for this page load, it just won't persist.
  }
}
