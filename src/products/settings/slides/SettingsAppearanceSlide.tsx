import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { applyTheme, getStoredTheme, type ThemePreference } from '../../../shared/lib/theme';

const options: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Appearance: system/light/dark, applied immediately and remembered per device. */
export function SettingsAppearanceSlide() {
  const [preference, setPreference] = useState<ThemePreference>(getStoredTheme());
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Appearance</h2>
          <span>Follow your system, or choose a theme for this device.</span>
        </div>
      </div>
      <div className="theme-toggle" role="group" aria-label="Appearance">
        {options.map((option) => (
          <Button
            key={option.value}
            variant={preference === option.value ? 'primary' : 'secondary'}
            onClick={() => {
              setPreference(option.value);
              applyTheme(option.value);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </section>
  );
}
