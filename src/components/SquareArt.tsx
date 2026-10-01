import React from 'react';
import { SafeArtwork } from './SafeArtwork';

interface SquareArtProps {
  src: string | null | undefined;
  videoId?: string;
  alt: string;
  /** Outer box: size, radius, borders, shadows. Position/overflow/bg managed internally. */
  style?: React.CSSProperties;
}

// Every song thumbnail renders through here: the full image is always
// visible (contain, never cropped) with a blurred ambience fill behind it,
// so any source aspect fits any square/circle box with no bars or cuts.
export const SquareArt: React.FC<SquareArtProps> = ({ src, videoId, alt, style }) => (
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
      <img
        src={src}
        alt=""
        aria-hidden="true"
        onError={e => {
          e.currentTarget.style.display = 'none';
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'blur(20px) brightness(0.6) saturate(1.3)',
          transform: 'scale(1.2)',
          pointerEvents: 'none',
        }}
      />
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
        objectFit: 'contain',
      }}
    />
  </div>
);
