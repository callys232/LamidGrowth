export type ThemePreference = 'system' | 'light' | 'dark';
const KEY = 'lamid-theme';

// No stored preference (first visit, or storage unavailable) defaults to light regardless of the
// visitor's OS setting — "system" here means the user explicitly chose "System" in Settings, not
// "nothing chosen yet"; those two cases used to be conflated, so a dark-OS visitor who'd never
// touched the toggle silently got dark mode instead of the site's actual default.
export function getStoredTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'light';
  } catch {
    return 'light';
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
