import { MediaTrack } from '../types';

// Now-Playing share card: 1080x1440 PNG (artwork + title + FreQ mark),
// monochrome, no gradients. Download only — predictable on desktop.

const W = 1080;
const H = 1440;
const ART = 1080;

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  basePx: number,
  weight: number,
): void {
  let px = basePx;
  ctx.font = `${weight} ${px}px Inter, system-ui, sans-serif`;
  while (px > 28 && ctx.measureText(text).width > maxWidth) {
    px -= 4;
    ctx.font = `${weight} ${px}px Inter, system-ui, sans-serif`;
  }
}

function coverDraw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const scale = Math.max(dw / img.naturalWidth, dh / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
}

export async function renderShareCard(track: MediaTrack): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');

  ctx.fillStyle = '#090A0F';
  ctx.fillRect(0, 0, W, H);

  if (track.artworkUrl) {
    const img = await loadImage(track.artworkUrl);
    if (img) {
      coverDraw(ctx, img, 0, 0, W, ART);
    } else {
      ctx.fillStyle = '#171A26';
      ctx.fillRect(0, 0, W, ART);
    }
  } else {
    ctx.fillStyle = '#171A26';
    ctx.fillRect(0, 0, W, ART);
  }

  // Hairline separator.
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(0, ART, W, 2);

  const pad = 72;
  let y = ART + 104;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  fitText(ctx, track.title || 'Unknown Title', W - pad * 2, 68, 800);
  ctx.fillText(track.title || 'Unknown Title', pad, y, W - pad * 2);

  y += 76;
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  fitText(ctx, track.artist || 'Unknown Artist', W - pad * 2, 46, 500);
  ctx.fillText(track.artist || 'Unknown Artist', pad, y, W - pad * 2);

  // Wordmark bottom-left, muted.
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  ctx.fillText('FreQ', pad, H - 64);

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('card render failed');
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
