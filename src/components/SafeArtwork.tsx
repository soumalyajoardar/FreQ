import React, { useState } from 'react';

interface SafeArtworkProps {
  src: string | null | undefined;
  videoId?: string;
  alt: string;
  style?: React.CSSProperties;
}

// Image with automatic fallback: broken artwork URLs swap to the
// guaranteed YouTube thumbnail for the track, then hide gracefully.
export const SafeArtwork: React.FC<SafeArtworkProps> = ({ src, videoId, alt, style }) => {
  const [stage, setStage] = useState(0);
  const ytFallback =
    videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : null;

  if ((!src || stage > 1) && !ytFallback) return null;
  if (stage > 1) return null;
  const current = stage === 0 ? src || ytFallback : ytFallback;
  if (!current) return null;

  return (
    <img
      src={current}
      alt={alt}
      style={style}
      loading="lazy"
      onError={() => setStage(s => Math.min(s + 1, 2))}
    />
  );
};
