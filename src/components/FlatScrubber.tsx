import React, { useRef } from 'react';

interface FlatScrubberProps {
  value: number;
  max: number;
  min?: number;
  step?: number;
  height?: number;
  fillColor?: string;
  ariaLabel?: string;
  onSeek: (v: number) => void;
  onScrub?: (v: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: (v: number) => void;
}

// Flat solid-color scrubber (no gradients): translucent track + solid fill
// + white thumb, with an invisible native range input on top for drag/a11y.
export const FlatScrubber: React.FC<FlatScrubberProps> = ({
  value,
  max,
  min = 0,
  step = 0.5,
  height = 5,
  fillColor = '#f8fafc',
  ariaLabel = 'Seek',
  onSeek,
  onScrub,
  onScrubStart,
  onScrubEnd,
}) => {
  const safeMax = max > min ? max : min + 1;
  const clamped = Math.min(Math.max(value, min), safeMax);
  const pct = safeMax > min ? ((clamped - min) / (safeMax - min)) * 100 : 0;
  const barRef = useRef<HTMLDivElement>(null);

  // Direct tap anywhere on the timeline: jump there immediately, then the
  // song continues from that position.
  const seekFromPointer = (clientX: number) => {
    const el = barRef.current;
    if (!el || safeMax <= min) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = min + ratio * (safeMax - min);
    // Snap to the step grid so sliders move in fixed increments.
    const v = Math.min(safeMax, Math.max(min, Math.round(raw / step) * step));
    if (onScrubEnd) {
      onScrub?.(v);
      onScrubEnd(v);
    } else {
      onSeek(v);
    }
  };

  return (
    <div
      ref={barRef}
      onClick={e => seekFromPointer(e.clientX)}
      style={{ position: 'relative', flex: 1, height: Math.max(height, 18), display: 'flex', alignItems: 'center' }}
    >
      <div style={{
        position: 'absolute', left: 0, right: 0, height, borderRadius: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(6px) saturate(150%)',
        WebkitBackdropFilter: 'blur(6px) saturate(150%)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.45), inset 0 -1px 0 rgba(255, 255, 255, 0.12)',
      }} />
      {/* Solid fill */}
      <div style={{ position: 'absolute', left: 0, height, width: `${pct}%`, borderRadius: 999, backgroundColor: fillColor }} />
      {/* Liquid thumb */}
      <div style={{
        position: 'absolute', left: `calc(${pct}% - 6px)`,
        width: 12, height: 12, borderRadius: '50%',
        backgroundColor: '#fff',
        boxShadow: '0 1px 5px rgba(0, 0, 0, 0.5)',
        pointerEvents: 'none',
      }} />
      <input
        type="range"
        aria-label={ariaLabel}
        min={min}
        max={safeMax}
        step={step}
        value={clamped}
        onChange={e => (onScrub ?? onSeek)(parseFloat(e.target.value))}
        onMouseDown={() => onScrubStart?.()}
        onMouseUp={e => onScrubEnd?.(parseFloat((e.target as HTMLInputElement).value))}
        onTouchEnd={e => onScrubEnd?.(parseFloat((e.target as HTMLInputElement).value))}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
      />
    </div>
  );
};
