import React from 'react';
import { SafeArtwork } from './SafeArtwork';

interface SquareArtProps {
  src: string | null | undefined;
  videoId?: string;
  alt: string;
  /** Outer box: size, radius, borders, shadows. Position/overflow/bg managed internally. */
  style?: React.CSSProperties;
  /** 'contain' shows the whole image (large art); 'cover' fills the cube edge-to-edge (small thumbs). */
  fit?: 'contain' | 'cover';
}

// Every song thumbnail renders through here: 'cover' fills the cube
// edge-to-edge (default); 'contain' shows the whole image with a blurred
// ambience fill behind it (large artwork).
export const SquareArt: React.FC<SquareArtProps> = ({ src, videoId, alt, style, fit = 'cover' }) => (
  <div
    style={{
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#12141f',
      flexShrink: 0,
      ...style,
    }}
  >
    {src ? (
      <SafeArtwork src={src} videoId={videoId} alt="" style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'blur(20px) brightness(0.6) saturate(1.3)',
          transform: 'scale(1.2)',
          pointerEvents: 'none',
        }} />
    ) : null}
    <SafeArtwork
      src={src}
      videoId={videoId}
      alt={alt}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: fit,
      }}
    />
  </div>
);

