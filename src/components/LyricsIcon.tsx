import React from 'react';

interface LyricsIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

// "Song lyrics" glyph in the Flaticon style: an eighth-note beside three
// lyric lines. Inline SVG so it always renders (no hotlink, no license
// baggage) and inherits the surrounding color.
export const LyricsIcon: React.FC<LyricsIconProps> = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 2,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    aria-hidden="true"
  >
    <ellipse cx="6.5" cy="17.5" rx="2.7" ry="2.1" fill={color} stroke="none" />
    <line x1="9" y1="17.5" x2="9" y2="5" />
    <path d="M9 5c3.2 0 4.4 1.6 4.4 4.2" />
    <line x1="15" y1="9" x2="21" y2="9" />
    <line x1="15" y1="13" x2="21" y2="13" />
    <line x1="15" y1="17" x2="19" y2="17" />
  </svg>
);
