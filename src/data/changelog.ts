// Release notes shown by the "What's new" window after an update.
//
// Add an entry for every shipped version. The window is keyed on the *build*
// (version + commit), not just the version: re-uploading a release under the
// same number, or reinstalling a build the user already dismissed, must still
// surface the notes.
export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.0.0',
    date: '2026-11-28',
    title: 'FreQ 3.0 — Instant track startup, kinetic lyrics & desktop integration',
    items: [
      'Replaced sequential local extraction with a parallel Cloud + local race so tracks begin playing in under a second while keeping full Web Audio DSP and local fallbacks intact.',
      'Added debounced single-slot hover prefetch and bounded LRU stream caching across Home, Search, Library, Album, Artist and Stats views.',
      'Added kinetic word-synced full-screen lyrics in Now Playing via LRCLIB and word-level timing.',
      'Additional contents: major and minor bugs fixed.',
    ],
  },
  {
    version: '2.7.1',
    date: '2026-11-28',
    title: 'Slimmer mini player',
    items: [
      'Redesigned the mini player into a slimmer single-row strip showing only thumbnail, title, artist, album and FreQ.',
      'Hovering the mini player reveals quick expand and close controls while keeping the resting layout clean.',
      'Additional contents: major and minor bugs fixed.',
    ],
  },
  {
    version: '2.7.0',
    date: '2026-11-28',
    title: 'Desktop integration, theme polish and cleaner controls',
    items: [
      'System tray icon updated to the official FreQ logo with playback menu and current‑track tooltip.',
      'Minimize‑to‑tray and close‑to‑tray options in Settings.',
      'Taskbar thumbnail toolbar (prev / pause / next).',
      'Jump list (right‑click taskbar) with recent tracks, search, party and mini player.',
      'Configurable global hotkeys in Settings → Desktop integration.',
      'Compact always‑on‑top mini player — now accessible directly from the bottom player bar.',
      'Command palette (Ctrl+K) — searchable actions and library tracks.',
      'Track‑change toast notifications (optional, with artwork).',
      'Desktop integration section in Settings (toggle + hotkey editor + reset).',
      'Mini player and bottom player bar Play button now follow the active accent theme.',
      'Removed Spatial audio from Settings and the Origin toggle from the bottom player bar.',
      'Fixed "Create party room" and primary buttons turning pink on hover instead of using the active theme.',
      'Search badge now reads "Powered by Origin Sounds" with a gradient wordmark.',
      'PNG icons (tray + thumbar glyphs) included in packaged build.',
      '"Studio" flavour renamed to "Normal" everywhere.',
      'Discord presence leads with room size and privacy, e.g. 2/5 (Public).',
      'Additional contents: major and minor bugs fixed.',
    ],
  },
  {
    version: '2.6.2',
    date: '2026-11-23',
    title: 'Reactions behave, Normal is Normal, and party status leads the presence',
    items: [
      'Live party reactions keep their position instead of jumping sideways mid-flight.',
      'Floating reactions start above the reaction bar, so they no longer land on the buttons.',
      'The "Studio" flavour is now simply "Normal", matching the rail and Discord.',
      'Discord presence leads with the room size and privacy, e.g. 2/5 (Public).',
    ],
  },
  {
    version: '2.6.1',
    date: '2026-11-23',
    title: 'Party rooms connect again',
    items: [
      'Fixed party creation and joining, which could sit on "connecting" until they timed out.',
      'Party rooms now fall back to a working backup server when the main one is unreachable.',
      'A failed connection says so immediately instead of waiting for the timeout.',
    ],
  },
  {
    version: '2.6.0',
    date: '2026-11-22',
    title: 'One entry per device, wider stereo and release notes that always show',
    items: [
      'The audio output picker now lists each speaker or headset once instead of three times.',
      '"What\'s new" appears after every update — including reinstalls and re-uploads of the same version.',
      'The 3D stereo spatializer is noticeably wider across the whole slider.',
      'Developer mode in Settings, locked behind a pass key and a clear warning.',
      'Party invite state and the installer cleanup from 2.5.0 are unchanged.',
    ],
  },
  {
    version: '2.5.0',
    date: '2026-11-21',
    title: 'Party invites, white accent and a cleaner update flow',
    items: [
      'Discord Rich Presence now shows a working “Join party” action for public parties.',
      'New “What’s new” window after every update, listing exactly what changed.',
      'White joins the rainbow accent themes in Settings.',
      'Downloaded update installers are deleted automatically once applied.',
      'Party privacy changes now take effect immediately instead of lying in the UI.',
      'Playlist covers: upload a custom thumbnail for any playlist.',
      'Audio output picker in the top bar for speakers, headphones and other devices.',
      'Lighter Now Playing tint so the artwork blur shows through.',
      'Security pass: strict CSP, validated IPC inputs and bounded logs.',
    ],
  },
];

const SEEN_VERSION_KEY = 'freq_last_seen_version';
const SEEN_BUILD_KEY = 'freq_last_seen_build';
const JUST_UPDATED_KEY = 'freq_just_updated';

/** Identifies this exact build, e.g. "2.6.0+1a2b3c4". */
export const BUILD_ID: string =
  typeof __BUILD_ID__ !== 'undefined' && __BUILD_ID__ ? __BUILD_ID__ : 'dev';

const read = (key: string): string | null => {
  try {
    const value = localStorage.getItem(key);
    return value && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — the window simply shows again next launch.
  }
};

const parseVersion = (value: string): number[] =>
  value
    .replace(/^v/i, '')
    .split('.')
    .map(part => parseInt(part, 10) || 0);

export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l > r) return 1;
    if (l < r) return -1;
  }
  return 0;
}

export function getLastSeenVersion(): string | null {
  return read(SEEN_VERSION_KEY);
}

/**
 * Called right before the app quits to install an update, so the *next* launch
 * shows the notes even if the version number did not change.
 */
export function setJustUpdatedFlag() {
  write(JUST_UPDATED_KEY, 'true');
}

function consumeJustUpdatedFlag(): boolean {
  const forced = read(JUST_UPDATED_KEY) === 'true';
  if (forced) write(JUST_UPDATED_KEY, null);
  return forced;
}

export function markVersionSeen(version: string) {
  write(SEEN_VERSION_KEY, version);
  write(SEEN_BUILD_KEY, BUILD_ID);
  write(JUST_UPDATED_KEY, null);
}

/**
 * Entries to show after an update. Returns nothing on a first ever launch, and
 * nothing when this exact build has already been acknowledged. Otherwise the
 * newest notes up to the running version are returned — including when the
 * version is unchanged but the build differs.
 */
export function getPendingReleaseNotes(currentVersion: string, limit = 3): ChangelogEntry[] {
  const lastBuild = read(SEEN_BUILD_KEY);
  const lastVersion = read(SEEN_VERSION_KEY);
  const forced = consumeJustUpdatedFlag();

  // Genuine first run: remember the build silently instead of greeting a brand
  // new user with notes for a release they never upgraded from.
  if (!lastBuild && !lastVersion && !forced) {
    markVersionSeen(currentVersion);
    return [];
  }

  if (!forced && lastBuild === BUILD_ID) return [];

  const available = CHANGELOG.filter(
    entry => compareVersions(entry.version, currentVersion) <= 0
  ).sort((a, b) => compareVersions(b.version, a.version));

  // Prefer whatever is newer than the version the user last ran. If nothing is
  // (a reinstall or a rebuild of the same version), fall back to the current
  // release notes so the window is never empty.
  const newer = lastVersion
    ? available.filter(entry => compareVersions(entry.version, lastVersion) > 0)
    : available;
  const selected = newer.length > 0 ? newer : available.slice(0, 1);

  return selected.slice(0, Math.max(1, limit));
}
