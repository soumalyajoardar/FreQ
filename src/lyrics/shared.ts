import { TrackLyrics } from '../types';
import { Palette } from './palette';

export type KineticWordItem = {
  text: string;
  start: number;
  end: number;
  backing?: boolean;
  emphasis?: boolean;
};

export type KineticLine = {
  text: string;
  start: number;
  end: number;
  words: KineticWordItem[];
  lang: 'en' | 'ja' | 'hi' | 'other';
  repeats: number;
};

export type TemplateProps = {
  line: KineticLine;
  revealed: number;
  palette: Palette;
  seed: number;
};

export const LABEL = '#ffffff';
export const SECONDARY = 'rgba(235, 235, 245, 0.55)';

export const spring = { type: 'spring', stiffness: 150, damping: 24.5, mass: 1 } as const;
export const softSpring = { type: 'spring', stiffness: 80, damping: 18, mass: 1 } as const;

export function detectLang(text: string): KineticLine['lang'] {
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(text)) return 'ja';
  if (/[\u0900-\u097f]/.test(text)) return 'hi';
  if (/[a-z]/i.test(text)) return 'en';
  return 'other';
}

export const langAttr = (lang: KineticLine['lang']) => (lang === 'other' ? undefined : lang);

const normText = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

export function toKineticLines(lyrics: TrackLyrics | null, durationSeconds = 180): KineticLine[] {
  if (!lyrics) return [];

  if (lyrics.synced.length > 0) {
    const counts = new Map<string, number>();
    for (const s of lyrics.synced) {
      const k = normText(s.text);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    return lyrics.synced.map((cue, idx) => {
      const start = cue.timeMs / 1000;
      const nextRaw = lyrics.synced[idx + 1];
      const nextStart = nextRaw ? nextRaw.timeMs / 1000 : Math.max(start + 4, durationSeconds);
      const words: KineticWordItem[] =
        cue.words && cue.words.length > 0
          ? cue.words.map(w => ({
              text: w.text,
              start: w.startMs / 1000,
              end: w.endMs / 1000,
              backing: w.backing,
              emphasis: w.emphasis,
            }))
          : cue.text
              .split(/\s+/)
              .filter(Boolean)
              .map((t, wi, arr) => {
                const span = Math.max(0.6, Math.min(nextStart - start, arr.length * 0.42));
                const step = span / arr.length;
                return { text: t, start: start + wi * step, end: start + (wi + 1) * step };
              });

      const lastWordEnd = words[words.length - 1]?.end ?? start + 1;
      const end =
        !nextRaw || nextStart - lastWordEnd > 14
          ? Math.min(nextStart, Math.max(lastWordEnd + 5, start + 9))
          : nextStart;

      return {
        text: cue.text,
        start,
        end,
        words,
        lang: detectLang(cue.text),
        repeats: counts.get(normText(cue.text)) ?? 1,
      };
    });
  }

  // Plain (unsynced) fallback: distribute evenly across track duration
  const rows = lyrics.lines.filter(l => l.trim() && !/^\[[^\]]*\]$/.test(l.trim()));
  if (rows.length === 0) return [];
  const intro = Math.min(8, durationSeconds * 0.06);
  const outro = Math.min(8, durationSeconds * 0.05);
  const usable = Math.max(12, durationSeconds - intro - outro);
  const step = usable / rows.length;
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = normText(r);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return rows.map((text, idx) => {
    const start = intro + idx * step;
    const end = start + step;
    const tokens = text.split(/\s+/).filter(Boolean);
    const wStep = Math.max(0.2, (step * 0.9) / Math.max(1, tokens.length));
    return {
      text,
      start,
      end,
      words: tokens.map((t, wi) => ({
        text: t,
        start: start + wi * wStep,
        end: start + (wi + 1) * wStep,
      })),
      lang: detectLang(text),
      repeats: counts.get(normText(text)) ?? 1,
    };
  });
}

export function lineAt(lines: KineticLine[], t: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].start <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function visualLength(s: string): number {
  let n = 0;
  for (const ch of s.toUpperCase()) {
    if (/[\u3000-\u30ff\u4e00-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch)) n += 1;
    else if (/[\u0900-\u097f]/.test(ch)) n += 0.62;
    else if (/[MW@]/.test(ch)) n += 0.98;
    else if (/[I.,'!|:;]/.test(ch)) n += 0.3;
    else if (ch === 'J') n += 0.56;
    else if (ch === ' ') n += 0.26;
    else if (/[0-9]/.test(ch)) n += 0.66;
    else n += 0.72;
  }
  return Math.max(n, 0.5);
}

type FitOpts = { widthVw?: number; heightVh?: number; maxVw?: number };

export function fitFontLen(longest: number, rowCount: number, opts: FitOpts = {}): string {
  const { widthVw = 82, heightVh = 62, maxVw = 16 } = opts;
  const vw = Math.min(maxVw, widthVw / Math.max(0.5, longest));
  const vh = heightVh / Math.max(1, rowCount) / 1.05;
  return `min(${vw.toFixed(2)}cqw, ${vh.toFixed(2)}cqh)`;
}

export function fitFont(rows: string[], opts: FitOpts = {}): string {
  return fitFontLen(Math.max(...rows.map(visualLength)), rows.length, opts);
}

export function groupRows(words: KineticWordItem[], maxRows: number): KineticWordItem[][] {
  if (words.length <= maxRows) return words.map(w => [w]);
  const total = words.reduce((a, w) => a + visualLength(w.text) + 0.3, 0);
  const target = total / maxRows;
  const rows: KineticWordItem[][] = [[]];
  let width = 0;
  for (const w of words) {
    const len = visualLength(w.text) + 0.3;
    if (width > 0 && width + len / 2 > target && rows.length < maxRows) {
      rows.push([]);
      width = 0;
    }
    rows[rows.length - 1].push(w);
    width += len;
  }
  return rows;
}

const TINY_WORDS = /^(a|an|the|to|of|in|on|at|by|for|and|or|but|so|is|am|are|be|i|i'm|me|my|we|it|oh|ooh|ah|yeah)$/i;
const highlightCache = new Map<string, Set<number>>();

export function highlightSet(line: KineticLine, seed: number): Set<number> {
  const key = `${seed}|${line.text}`;
  const hit = highlightCache.get(key);
  if (hit) return hit;

  const r = rng(seed ^ 0x51ed27);
  const usable = line.words.map((w, i) => ({ w, i })).filter(({ w }) => !w.backing);
  let pool = usable.filter(({ w }) => !TINY_WORDS.test(w.text.replace(/[^\p{L}']/gu, '')));
  if (!pool.length) pool = usable;
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const count = Math.max(1, Math.min(4, pool.length, Math.round(line.words.length * (0.18 + r() * 0.17))));
  const out = new Set(pool.slice(0, count).map(({ i }) => i));
  if (highlightCache.size > 2000) highlightCache.clear();
  highlightCache.set(key, out);
  return out;
}

export function wordColor(line: KineticLine, index: number, palette: Palette, rawSeed: number): string {
  const seed = rawSeed >>> 0;
  const w = line.words[index];
  if (w?.backing) return SECONDARY;
  return highlightSet(line, seed).has(index) ? vivid(palette.accents[(seed >>> 3) % 3]) : LABEL;
}

const graphemes =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' })
    : null;
const VIRAMA = /[\u094D\u09CD\u0A4D\u0ACD\u0B4D\u0BCD\u0C4D\u0CCD\u0D4D]$/;
const JOINER = /^[\u200C\u200D]/;

export function splitLetters(word: string): string[] {
  const clusters: string[] = graphemes
    ? Array.from(graphemes.segment(word), (s: any) => s.segment)
    : (word.match(/\P{M}\p{M}*/gu) ?? [word]);
  const out: string[] = [];
  for (const c of clusters) {
    const prev = out[out.length - 1];
    if (prev && (VIRAMA.test(prev) || JOINER.test(c))) out[out.length - 1] = prev + c;
    else out.push(c);
  }
  return out;
}

type RGBA = [number, number, number, number];

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

export function parseColor(c: string): RGBA {
  const hex = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map(x => x + x).join('') : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const nums = (c.match(/-?[\d.]+/g) ?? []).map(Number);
  if (/^hsla?/i.test(c.trim())) {
    const [r, g, b] = hslToRgb(nums[0] ?? 0, (nums[1] ?? 0) / 100, (nums[2] ?? 100) / 100);
    return [r, g, b, nums[3] ?? 1];
  }
  if (/^rgba?/i.test(c.trim())) return [nums[0] ?? 255, nums[1] ?? 255, nums[2] ?? 255, nums[3] ?? 1];
  return [245, 245, 247, 1];
}

export function pastel(color: string, lightness = 0.84, saturation?: number): string {
  const [r, g, b] = parseColor(color).map(v => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const [nr, ng, nb] = hslToRgb(h, saturation ?? Math.min(0.85, Math.max(0.45, s)), lightness);
  return `rgb(${Math.round(nr)}, ${Math.round(ng)}, ${Math.round(nb)})`;
}

export function vivid(color: string, lightness = 0.7): string {
  return pastel(color, lightness, 0.95);
}

export function lyricShadow(color?: string): string {
  const depth = '0 0.035em 0.22em rgba(0, 0, 0, 0.5)';
  if (!color || color === LABEL || color === SECONDARY) return depth;
  const [r, g, b] = parseColor(color);
  return `${depth}, 0 0 0.6em rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.5)`;
}
