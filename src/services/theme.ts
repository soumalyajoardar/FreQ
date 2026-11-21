// Rainbow accent themes. Each preset flips the single FreQ signal colour while
// keeping the obsidian canvas, hairlines and type scale untouched.
export interface ThemePreset {
  id: string;
  name: string;
  accent: string;
  /** "r, g, b" for rgba() composition. */
  rgb: string;
  /** Readable ink for text/icons placed on top of the accent. */
  ink: string;
}

const STORAGE_KEY = 'freq_accent_theme';

export const DEFAULT_THEME_ID = 'violet';

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'red', name: 'Red', accent: '#ef4444', rgb: '239, 68, 68', ink: '#1a0505' },
  { id: 'orange', name: 'Orange', accent: '#f97316', rgb: '249, 115, 22', ink: '#1a0b02' },
  { id: 'yellow', name: 'Yellow', accent: '#eab308', rgb: '234, 179, 8', ink: '#1a1403' },
  { id: 'green', name: 'Green', accent: '#22c55e', rgb: '34, 197, 94', ink: '#03210f' },
  { id: 'cyan', name: 'Cyan', accent: '#06b6d4', rgb: '6, 182, 212', ink: '#041a1e' },
  { id: 'blue', name: 'Blue', accent: '#3b82f6', rgb: '59, 130, 246', ink: '#061229' },
  { id: 'indigo', name: 'Indigo', accent: '#6366f1', rgb: '99, 102, 241', ink: '#0a0825' },
  { id: 'violet', name: 'Violet', accent: '#a855f7', rgb: '168, 85, 247', ink: '#12041f' },
  { id: 'white', name: 'White', accent: '#ffffff', rgb: '255, 255, 255', ink: '#0b0b0e' },
];

export const THEME_EVENT = 'freq-accent-theme-change';

export function getThemePreset(id: string): ThemePreset {
  return (
    THEME_PRESETS.find(t => t.id === id) ||
    THEME_PRESETS.find(t => t.id === DEFAULT_THEME_ID) ||
    THEME_PRESETS[0]
  );
}

export function getThemeId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEME_PRESETS.some(t => t.id === saved)) return saved;
  } catch {}
  return DEFAULT_THEME_ID;
}

/** Apply a preset to the live document. Safe to call before React mounts. */
export function applyTheme(id: string) {
  const preset = getThemePreset(id);
  const root = document.documentElement;
  root.style.setProperty('--accent-cyan', preset.accent);
  root.style.setProperty('--accent-teal', preset.accent);
  root.style.setProperty('--accent-green', preset.accent);
  root.style.setProperty('--accent-rgb', preset.rgb);
  root.style.setProperty('--accent-ink', preset.ink);
  root.style.setProperty('--accent-glow', `rgba(${preset.rgb}, 0.22)`);
  root.style.setProperty('--accent-soft', `rgba(${preset.rgb}, 0.12)`);
  root.setAttribute('data-accent', preset.id);

  try {
    localStorage.setItem(STORAGE_KEY, preset.id);
  } catch {}

  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: preset }));
}

/** Restore the saved theme on startup. */
export function initTheme() {
  applyTheme(getThemeId());
}
