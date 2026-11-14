import React, { useRef, useState } from 'react';

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

export const FlatScrubber: React.FC<FlatScrubberProps> = ({
  value,
  max,
  min = 0,
  step = 0.5,
  height = 4,
  fillColor = 'var(--accent-cyan, #1ed760)',
  ariaLabel = 'Seek',
  onSeek,
  onScrub,
  onScrubStart,
  onScrubEnd,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const safeMax = max > min ? max : min + 1;
  const clamped = Math.min(Math.max(value, min), safeMax);
  const pct = safeMax > min ? ((clamped - min) / (safeMax - min)) * 100 : 0;
  const barRef = useRef<HTMLDivElement>(null);

  const seekFromPointer = (clientX: number) => {
    const el = barRef.current;
    if (!el || safeMax <= min) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = min + ratio * (safeMax - min);
    const v = Math.min(safeMax, Math.max(min, Math.round(raw / step) * step));
    if (onScrubEnd) {
      onScrub?.(v);
      onScrubEnd(v);
    } else {
      onSeek(v);
    }
  };

  const showThumb = isHovered || isDragging;
  const activeHeight = isHovered || isDragging ? height + 2 : height;

  return (
    <div
      ref={barRef}
      onClick={e => seekFromPointer(e.clientX)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        flex: 1,
        height: Math.max(height, 20),
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
      }}
    >
      {/* Background Track */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: activeHeight,
          borderRadius: 999,
          backgroundColor: 'rgba(255, 255, 255, 0.14)',
          transition: 'height 0.15s ease',
        }}
      />
      {/* Filled Track */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          height: activeHeight,
          width: `${pct}%`,
          borderRadius: 999,
          backgroundColor: isHovered ? 'var(--accent-cyan, #1ed760)' : fillColor,
          transition: 'height 0.15s ease, background-color 0.15s ease',
        }}
      />
      {/* Thumb handle */}
      <div
        style={{
          position: 'absolute',
          left: `calc(${pct}% - 6px)`,
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: '#fff',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.6)',
          transform: showThumb ? 'scale(1)' : 'scale(0)',
          opacity: showThumb ? 1 : 0,
          transition: 'transform 0.15s ease, opacity 0.15s ease',
          pointerEvents: 'none',
        }}
      />
      <input
        type="range"
        aria-label={ariaLabel}
        min={min}
        max={safeMax}
        step={step}
        value={clamped}
        onChange={e => (onScrub ?? onSeek)(parseFloat(e.target.value))}
        onMouseDown={() => {
          setIsDragging(true);
          onScrubStart?.();
        }}
        onMouseUp={e => {
          setIsDragging(false);
          onScrubEnd?.(parseFloat((e.target as HTMLInputElement).value));
        }}
        onTouchEnd={e => {
          setIsDragging(false);
          onScrubEnd?.(parseFloat((e.target as HTMLInputElement).value));
        }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
      />
    </div>
  );
};
