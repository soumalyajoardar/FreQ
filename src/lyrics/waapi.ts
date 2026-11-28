/**
 * Compositor-thread Web Animations API helpers with pre-computed spring linear() curves.
 * Adapted from LyricalStudio (MIT).
 */

export type Pose = {
  x?: number;
  y?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  skewX?: number;
  rotate?: number;
  rotateX?: number;
  opacity?: number;
};

export const REST: Required<Pose> = {
  x: 0,
  y: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  rotate: 0,
  rotateX: 0,
  opacity: 1,
};

export function poseTransform(p: Required<Pose>, with3d = p.rotateX !== 0): string {
  const flip = with3d ? ` rotateX(${p.rotateX}deg)` : '';
  return `translate(${p.x}em, ${p.y}em) rotate(${p.rotate}deg)${flip} skewX(${p.skewX}deg) scale(${p.scale * p.scaleX}, ${p.scale * p.scaleY})`;
}

export type Timing = {
  type?: 'spring' | string;
  stiffness?: number;
  damping?: number;
  mass?: number;
  duration?: number;
  ease?: readonly number[] | string;
  delay?: number;
};

type Resolved = { easing: string; duration: number; delay: number };

let linearSupport: boolean | null = null;
const supportsLinear = () =>
  (linearSupport ??= typeof CSS !== 'undefined' && CSS.supports('animation-timing-function', 'linear(0, 1)'));

const springCache = new Map<string, { easing: string; duration: number }>();

export function springTiming(stiffness = 100, damping = 10, mass = 1) {
  const key = `${stiffness}/${damping}/${mass}`;
  const hit = springCache.get(key);
  if (hit) return hit;

  const dt = 1 / 600;
  let x = 0;
  let v = 0;
  let t = 0;
  const xs: number[] = [0];
  while (t < 4) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt;
    x += v * dt;
    t += dt;
    xs.push(x);
    if (Math.abs(1 - x) < 0.0008 && Math.abs(v) < 0.0008) break;
  }
  const n = 64;
  const pts = Array.from({ length: n + 1 }, (_, i) => xs[Math.round((i / n) * (xs.length - 1))]);
  pts[n] = 1;

  const out = {
    easing: supportsLinear()
      ? `linear(${pts.map(p => +p.toFixed(4)).join(', ')})`
      : 'cubic-bezier(0.22, 1, 0.36, 1)',
    duration: Math.round(t * 1000),
  };
  springCache.set(key, out);
  return out;
}

const NAMED: Record<string, string> = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
  easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
};

export function resolveTiming(t?: Timing): Resolved {
  const delay = (t?.delay ?? 0) * 1000;
  if (!t || t.type === 'spring' || t.duration === undefined) {
    const s = springTiming(t?.stiffness ?? 110, t?.damping ?? 21, t?.mass ?? 1);
    return { ...s, delay };
  }
  const easing = Array.isArray(t.ease)
    ? `cubic-bezier(${t.ease.join(', ')})`
    : NAMED[(t.ease as string) ?? 'easeOut'] ?? 'ease-out';
  return { easing, duration: t.duration * 1000, delay };
}

export function animateTo(
  el: HTMLElement,
  target: { transform?: string; opacity?: number },
  timing: Resolved,
  extraOpacity?: { offset: number; value: number }[]
) {
  if (timing.duration <= 0) {
    el.getAnimations().forEach(a => a.cancel());
    if (target.transform !== undefined) el.style.transform = target.transform;
    if (target.opacity !== undefined) el.style.opacity = String(target.opacity);
    return null;
  }

  const cs = getComputedStyle(el);
  const from: Keyframe = {};
  const to: Keyframe = {};
  if (target.transform !== undefined) {
    from.transform = cs.transform === 'none' ? target.transform : cs.transform;
    to.transform = target.transform;
  }
  if (target.opacity !== undefined && !extraOpacity) {
    from.opacity = cs.opacity;
    to.opacity = String(target.opacity);
  }

  el.getAnimations().forEach(a => a.cancel());
  if (target.transform !== undefined) el.style.transform = target.transform;
  if (target.opacity !== undefined) el.style.opacity = String(target.opacity);

  const frames: Keyframe[] = extraOpacity
    ? [
        { ...from, opacity: '0', offset: 0 },
        ...extraOpacity.map(o => ({ opacity: String(o.value), offset: o.offset })),
        { ...to, opacity: String(target.opacity ?? 0), offset: 1 },
      ]
    : [from, to];

  return el.animate(frames, {
    duration: timing.duration,
    delay: timing.delay,
    easing: timing.easing,
    fill: 'backwards',
  });
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
