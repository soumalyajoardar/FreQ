import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { lyricShadow } from './shared';
import { animateTo, poseTransform, prefersReducedMotion, resolveTiming, REST, type Pose, type Timing } from './waapi';

export type { Pose };

export const glide: Timing = { type: 'spring', stiffness: 110, damping: 21, mass: 1 };

type KineticProps = {
  shown: boolean;
  from: Pose;
  to?: Pose;
  transition?: Timing;
  className?: string;
  style?: React.CSSProperties;
  measure?: boolean;
  children: React.ReactNode;
};

const GHOSTS = [
  { delay: 22, peak: 0.3 },
  { delay: 46, peak: 0.16 },
];

/** Compositor-animated word with trailing motion-blur ghost copies. */
export const KineticWord: React.FC<KineticProps> = ({
  shown,
  from,
  to,
  transition,
  className,
  style,
  measure = true,
  children,
}) => {
  const reduce = prefersReducedMotion();
  const mainRef = useRef<HTMLSpanElement>(null);
  const ghostA = useRef<HTMLSpanElement>(null);
  const ghostB = useRef<HTMLSpanElement>(null);
  const hidden = { ...REST, ...from };
  const visible = { ...REST, ...to };
  const mounted = useRef(false);

  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.style.transform = poseTransform(hidden);
    el.style.opacity = String(hidden.opacity);
    for (const g of [ghostA.current, ghostB.current]) if (g) g.style.opacity = '0';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const first = !mounted.current;
    mounted.current = true;
    if (first && !shown) return;
    const target = shown ? visible : hidden;
    const transform = poseTransform(target);
    const timing = reduce ? { easing: 'linear', duration: 0, delay: 0 } : resolveTiming(transition ?? glide);
    if (reduce) {
      animateTo(el, { transform, opacity: target.opacity }, timing);
      return;
    }
    const start = getComputedStyle(el).transform;
    animateTo(el, { transform, opacity: target.opacity }, timing);
    [ghostA.current, ghostB.current].forEach((ghost, i) => {
      if (!ghost) return;
      ghost.getAnimations().forEach(a => a.cancel());
      ghost.style.transform = start === 'none' ? transform : start;
      animateTo(
        ghost,
        { transform, opacity: 0 },
        { ...timing, delay: timing.delay + GHOSTS[i].delay },
        [{ offset: 0.12, value: GHOSTS[i].peak }]
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, reduce]);

  const positioned = className?.includes('ls-abs') ? {} : { position: 'relative' as const };

  return (
    <span
      data-fit={measure ? '' : undefined}
      className={className}
      style={{ ...positioned, textShadow: lyricShadow(style?.color as string | undefined), ...style }}
    >
      <span
        ref={ghostB}
        aria-hidden
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', textShadow: 'none' }}
      >
        {children}
      </span>
      <span
        ref={ghostA}
        aria-hidden
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', textShadow: 'none' }}
      >
        {children}
      </span>
      <span ref={mainRef} style={{ position: 'relative', display: 'inline-block' }}>
        {children}
      </span>
    </span>
  );
};

/** Minimal compositor-animated span (used for single letters/aksharas). */
export const KineticSpan: React.FC<{
  shown: boolean;
  from: Pose;
  transition?: Timing;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ shown, from, transition, style, children }) => {
  const reduce = prefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const mounted = useRef(false);
  const hidden = { ...REST, ...from };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = poseTransform(hidden);
    el.style.opacity = String(hidden.opacity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const first = !mounted.current;
    mounted.current = true;
    if (first && !shown) return;
    const target = shown ? REST : hidden;
    const timing = reduce ? { easing: 'linear', duration: 0, delay: 0 } : resolveTiming(transition ?? glide);
    animateTo(el, { transform: poseTransform(target), opacity: target.opacity }, timing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, reduce]);

  return (
    <span ref={ref} style={{ display: 'inline-block', ...style }}>
      {children}
    </span>
  );
};
