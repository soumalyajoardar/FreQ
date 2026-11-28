export type Palette = {
  /** Three vivid accents for words and the background gradient. */
  accents: [string, string, string];
  /** Dark base tint for the background. */
  base: string;
};

/** Apple system colors (dark appearance), used when artwork is missing or gray. */
export const APPLE_COLORS = [
  '#ff375f', // pink
  '#ff9f0a', // orange
  '#ffd60a', // yellow
  '#30d158', // green
  '#64d2ff', // cyan
  '#0a84ff', // blue
  '#5e5ce6', // indigo
  '#bf5af2', // purple
];

export function fallbackPalette(seed: number): Palette {
  const n = APPLE_COLORS.length;
  return {
    accents: [APPLE_COLORS[seed % n], APPLE_COLORS[(seed + 3) % n], APPLE_COLORS[(seed + 5) % n]],
    base: '#0b0b12',
  };
}

type HSL = [number, number, number];

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h /= 6;
  return [h, s, l];
}

const hsl = ([h, s, l]: HSL) =>
  `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;

const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));

/** Extract a vivid three-hue palette from album artwork. */
export async function extractPalette(src: string, seed: number): Promise<Palette> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = src;
  try {
    await img.decode();
  } catch {
    return fallbackPalette(seed);
  }

  const size = 40;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return fallbackPalette(seed);

  let data: Uint8ClampedArray;
  try {
    ctx.drawImage(img, 0, 0, size, size);
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    return fallbackPalette(seed);
  }

  const bins = Array.from({ length: 24 }, () => ({ score: 0, h: 0, s: 0, l: 0, n: 0 }));
  let darkSum: HSL = [0, 0, 0];
  let darkN = 0;

  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (l < 0.35) {
      darkSum = [darkSum[0] + h, darkSum[1] + s, darkSum[2] + l];
      darkN++;
    }
    if (s < 0.2 || l < 0.12 || l > 0.92) continue;
    const bin = bins[Math.floor(h * 24) % 24];
    const score = s * (1 - Math.abs(l - 0.55));
    bin.score += score;
    bin.h += h * score;
    bin.s += s * score;
    bin.l += l * score;
    bin.n++;
  }

  const picks = bins
    .filter(b => b.n > 3)
    .map(b => [b.h / b.score, b.s / b.score, b.l / b.score, b.score] as const)
    .sort((a, b) => b[3] - a[3]);

  const chosen: HSL[] = [];
  for (const [h, s, l] of picks) {
    if (chosen.every(c => hueDistance(c[0], h) > 0.07)) chosen.push([h, s, l]);
    if (chosen.length === 3) break;
  }
  if (!chosen.length) return fallbackPalette(seed);

  const vivid = chosen.map(([h, s, l]): HSL => [
    h,
    Math.min(1, Math.max(0.65, s * 1.25)),
    Math.min(0.68, Math.max(0.55, l)),
  ]);
  const fb = fallbackPalette(seed).accents;
  const accents = [0, 1, 2].map(i => (vivid[i] ? hsl(vivid[i]) : fb[i])) as Palette['accents'];

  const base: HSL = darkN
    ? [darkSum[0] / darkN, Math.min(0.5, darkSum[1] / darkN), 0.07]
    : [chosen[0][0], 0.4, 0.07];

  return { accents, base: hsl(base) };
}

/** Stable small integer from a string (FNV-1a). */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
