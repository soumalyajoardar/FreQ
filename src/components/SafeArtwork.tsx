import React, { useState } from 'react';
import freqIcon from '../assets/freq-icon.png';

interface SafeArtworkProps {
  src: string | null | undefined;
  videoId?: string;
  alt: string;
  style?: React.CSSProperties;
  fallbackIcon?: string | null;
}

const VALID_ID = /^[A-Za-z0-9_-]{11}$/;

function buildCandidates(
  src: string | null | undefined,
  videoId: string | undefined,
  fallbackIcon: string | null | undefined,
): string[] {
  const out: string[] = [];
  const push = (u: string | null | undefined) => {
    if (u && !out.includes(u)) out.push(u);
  };

  let isYtImg = false;
  let extractedId = videoId;
  
  if (src) {
    const m = /https?:\/\/i\.ytimg\.com\/vi\/([^/]+)\//.exec(src);
    if (m) {
      isYtImg = true;
      extractedId = m[1];
    } else {
      push(src);
    }
  }

  if (extractedId && VALID_ID.test(extractedId)) {
    push('https://i.ytimg.com/vi/' + extractedId + '/maxresdefault.jpg');
    push('https://i.ytimg.com/vi/' + extractedId + '/hq720.jpg');
    push('https://i.ytimg.com/vi/' + extractedId + '/mqdefault.jpg');
    push('https://i.ytimg.com/vi/' + extractedId + '/hqdefault.jpg');
  }

  if (src) push(src);
  
  push(fallbackIcon || null);
  return out;
}

export const SafeArtwork: React.FC<SafeArtworkProps> = ({
  src,
  videoId,
  alt,
  style,
  fallbackIcon = freqIcon,
}) => {
  const [stage, setStage] = useState(0);
  const candidates = buildCandidates(src, videoId, fallbackIcon);
  if (candidates.length === 0) return null;
  const current = candidates[Math.min(stage, candidates.length - 1)];

  return (
    <img
      src={current}
      alt={alt}
      style={style}
      loading="lazy"
      onError={() => setStage(s => (s + 1 >= candidates.length ? s : s + 1))}
    />
  );
};
