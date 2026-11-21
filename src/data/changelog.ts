// Release notes shown by the "What's new" window after an update.
//
// Add an entry for every shipped version: the window looks up the entries newer
// than the last version the user actually ran, so a missing entry means that
// release ships without a change list.
export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
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

const SEEN_KEY = 'freq_last_seen_version';

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
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function markVersionSeen(version: string) {
  try {
    localStorage.setItem(SEEN_KEY, version);
  } catch {
    // Storage is unavailable — the window simply shows again next launch.
  }
}

/**
 * Entries the user has not seen yet: newer than `lastSeen`, but not newer than
 * the version actually running. Returns nothing on a first run so new users are
 * not greeted by a changelog for a release they never upgraded from.
 */
export function getPendingReleaseNotes(
  currentVersion: string,
  lastSeen: string | null = getLastSeenVersion(),
  limit = 3
): ChangelogEntry[] {
  if (!lastSeen) return [];
  if (compareVersions(lastSeen, currentVersion) >= 0) return [];

  return CHANGELOG.filter(
    entry =>
      compareVersions(entry.version, lastSeen) > 0 &&
      compareVersions(entry.version, currentVersion) <= 0
  )
    .sort((a, b) => compareVersions(b.version, a.version))
    .slice(0, limit);
}
