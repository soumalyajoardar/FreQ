import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { MediaTrack, TrackLyrics } from '../types';
import { audioEngine } from '../services/audioEngine';
import { getLyricsOffsetMs, setLyricsOffsetMs } from '../services/lyrics';
import { formatTime } from '../components/PlayerBar';
import { FlatScrubber } from '../components/FlatScrubber';
import { SquareArt } from '../components/SquareArt';
import freqIcon from '../assets/freq-icon.png';
import { AmbientBackground } from './AmbientBackground';
import { FitBox } from './FitBox';
import { extractPalette, fallbackPalette, hashString, Palette } from './palette';
import { fitFont, KineticLine, LABEL, langAttr, lineAt, lyricShadow, toKineticLines, vivid } from './shared';
import { chooseScene, GraphStream, isGraph, Scene, TemplateChoice, TEMPLATES } from './templates';
import { prefersReducedMotion, springTiming } from './waapi';

const LEAD_SECONDS = 0.15;
const TEMPLATE_KEY = 'freq_lyrical_template_v1';

const TEMPLATE_OPTIONS: { id: TemplateChoice; label: string }[] = [
  { id: 'auto', label: 'Auto style' },
  { id: 'stack', label: 'Stack' },
  { id: 'slide', label: 'Slide' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'letters', label: 'Letters' },
  { id: 'scatter', label: 'Scatter' },
  { id: 'graph', label: 'Graph' },
  { id: 'flow', label: 'Flow' },
];

type Position = { mode: 'intro' | 'line' | 'gap' | 'outro'; line: number; revealed: number };

const TitleCard: React.FC<{ track: MediaTrack; palette: Palette; caption?: string; small?: boolean }> = ({
  track,
  palette,
  caption,
  small,
}) => {
  const words = track.title.split(/\s+/);
  const fontSize = fitFont(
    [track.title.length > 18 ? words.slice(0, Math.ceil(words.length / 2)).join(' ') : track.title],
    { maxVw: small ? 6 : 10, heightVh: 40 }
  );

  return (
    <div style={{ display: 'flex', maxWidth: '84cqw', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <h2
        data-fit=""
        style={{
          fontSize,
          fontWeight: 900,
          lineHeight: 1.02,
          letterSpacing: '-0.04em',
          color: LABEL,
          textShadow: lyricShadow(vivid(palette.accents[0])),
          margin: 0,
          animation: 'freqRiseIn 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {track.title}
      </h2>
      <p
        data-fit=""
        style={{
          marginTop: '2cqh',
          fontSize: 'clamp(18px, 2.2cqw, 34px)',
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.78)',
          marginBottom: 0,
          animation: 'freqRiseIn 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {track.artist}
      </p>
      {caption && (
        <p style={{ marginTop: 18, fontSize: 14, color: 'rgba(235, 235, 245, 0.6)', marginBottom: 0 }}>
          {caption}
        </p>
      )}
    </div>
  );
};

const LineText: React.FC<{
  line: KineticLine;
  scene: Scene;
  revealed: number;
  palette: Palette;
  seed: number;
}> = ({ line, scene, revealed, palette, seed }) => {
  const Template = TEMPLATES[scene.template].component;
  const camRef = useRef<HTMLDivElement>(null);
  const reduce = prefersReducedMotion();

  useLayoutEffect(() => {
    const el = camRef.current;
    if (!el) return;
    el.style.rotate = scene.tilt ? `${scene.tilt}deg` : '';
    if (reduce || !scene.tilt) return;
    const settle = springTiming(40, 13, 1);
    const tilt = el.animate(
      [{ rotate: `${scene.tilt * 1.3}deg` }, { rotate: `${scene.tilt}deg` }],
      { duration: settle.duration, easing: settle.easing, fill: 'backwards' }
    );
    return () => tilt.cancel();
  }, [scene.tilt, reduce]);

  return (
    <div ref={camRef} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <FitBox disabled={isGraph(scene.template)} tilt={scene.tilt * 1.3} zoom={1}>
        <Template line={line} revealed={revealed} palette={palette} seed={seed} />
      </FitBox>
    </div>
  );
};

interface LyricalStageViewProps {
  track: MediaTrack;
  lyrics: TrackLyrics | null;
  isLyricsLoading: boolean;
  isPlaying: boolean;
  position: number;
  duration: number;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onCloseLyrics: () => void;
  onCollapsePlayer: () => void;
}

/**
 * Full-screen kinetic lyrics stage modeled directly on LyricalStudio (MIT).
 * Triggered when tapping the Lyrics icon inside FreQ's player screen.
 */
export const LyricalStageView: React.FC<LyricalStageViewProps> = ({
  track,
  lyrics,
  isLyricsLoading,
  isPlaying,
  position,
  duration,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onCloseLyrics,
  onCollapsePlayer,
}) => {
  const songSeed = useMemo(() => hashString(`${track.id}:${track.title}:${track.artist}`), [track.id, track.title, track.artist]);
  const [palette, setPalette] = useState<Palette>(() => fallbackPalette(songSeed));
  const [templateChoice, setTemplateChoice] = useState<TemplateChoice>(() => {
    try {
      const saved = localStorage.getItem(TEMPLATE_KEY) as TemplateChoice | null;
      if (saved && TEMPLATE_OPTIONS.some(o => o.id === saved)) return saved;
    } catch {}
    return 'auto';
  });
  const [offsetSec, setOffsetSec] = useState<number>(() => getLyricsOffsetMs(track.id) / 1000);
  const [pos, setPos] = useState<Position>({ mode: 'intro', line: -1, revealed: 0 });
  const [idleUi, setIdleUi] = useState(false);

  const posRef = useRef(pos);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastRipple = useRef({ line: -1, revealed: 0 });
  const idleTimer = useRef<number | null>(null);

  useEffect(() => {
    setOffsetSec(getLyricsOffsetMs(track.id) / 1000);
  }, [track.id]);

  // Extract album-art palette per track
  useEffect(() => {
    let alive = true;
    setPalette(fallbackPalette(songSeed));
    if (!track.artworkUrl) return;
    extractPalette(track.artworkUrl, songSeed).then(p => {
      if (alive) setPalette(p);
    });
    return () => {
      alive = false;
    };
  }, [track.artworkUrl, songSeed]);

  const lines = useMemo(
    () => toKineticLines(lyrics, duration || track.durationSeconds || 180),
    [lyrics, duration, track.durationSeconds]
  );

  // 60fps word-by-word sync loop reading live HTMLAudioElement.currentTime
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const liveTime = audioEngine.getCurrentTime() || position;
      const t = liveTime + LEAD_SECONDS - offsetSec;
      const li = lineAt(lines, t);
      let next: Position;
      if (li < 0 || !lines[li]) {
        next = { mode: 'intro', line: -1, revealed: 0 };
      } else {
        const line = lines[li];
        if (t > line.end) {
          next = { mode: li === lines.length - 1 ? 'outro' : 'gap', line: li, revealed: 0 };
        } else {
          let revealed = 0;
          while (revealed < line.words.length && line.words[revealed].start <= t) revealed++;
          next = { mode: 'line', line: li, revealed: Math.max(1, revealed) };
        }
      }
      const p = posRef.current;
      if (p.mode !== next.mode || p.line !== next.line || p.revealed !== next.revealed) {
        posRef.current = next;
        setPos(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lines, offsetSec, position]);

  // Trigger WebGL glass ripples on every word
  useEffect(() => {
    if (pos.mode !== 'line' || !lines[pos.line]) return;
    const prev = lastRipple.current;
    if (pos.line === prev.line && pos.revealed <= prev.revealed) return;
    lastRipple.current = { line: pos.line, revealed: pos.revealed };
    const newLine = pos.line !== prev.line;
    const word = lines[pos.line]?.words[pos.revealed - 1];
    const id = requestAnimationFrame(() => {
      const els = rootRef.current?.querySelectorAll<HTMLElement>(`[data-line="${pos.line}"] [data-fit]`);
      const el = els?.length ? els[Math.min(pos.revealed - 1, els.length - 1)] : null;
      const r = el?.getBoundingClientRect();
      window.dispatchEvent(
        new CustomEvent('ls:word', {
          detail: {
            x: r ? (r.left + r.width / 2) / window.innerWidth : 0.5,
            y: r ? (r.top + r.height / 2) / window.innerHeight : 0.5,
            strength: word?.emphasis ? 1.5 : newLine ? 1.2 : 0.85,
            newLine,
          },
        })
      );
    });
    return () => cancelAnimationFrame(id);
  }, [pos, lines]);

  // `[` / `]` keyboard nudge support
  const nudgeOffset = (deltaSec: number) => {
    setOffsetSec(prev => {
      const next = Math.round((prev + deltaSec) * 100) / 100;
      setLyricsOffsetMs(track.id, Math.round(next * 1000));
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === '[') nudgeOffset(-0.25);
      else if (e.key === ']') nudgeOffset(0.25);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Gentle auto-fade for chrome during Graph / playback after 3.5s idle
  const bumpIdle = () => {
    setIdleUi(false);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      if (isPlaying) setIdleUi(true);
    }, 3500);
  };

  useEffect(() => {
    bumpIdle();
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [isPlaying]);

  const forced = templateChoice === 'auto' ? undefined : templateChoice;
  const scenes = useMemo(() => lines.map(l => chooseScene(l, songSeed, forced)), [lines, songSeed, forced]);
  const currentLine = pos.line >= 0 ? lines[pos.line] : undefined;
  const hasSynced = (lyrics?.synced?.length ?? 0) > 0;
  const noLyrics = lines.length === 0;
  const caption = isLyricsLoading
    ? 'Finding lyrics…'
    : noLyrics
      ? 'No lyrics available for this song'
      : !hasSynced
        ? 'Approximate timing (plain lyrics)'
        : undefined;

  let content: React.ReactNode;
  let stageKey: string;
  let unclipped = false;

  if (pos.mode === 'intro' || pos.mode === 'outro' || !currentLine || noLyrics) {
    stageKey = noLyrics ? 'none' : pos.mode;
    content = (
      <FitBox>
        <TitleCard track={track} palette={palette} caption={noLyrics ? caption : undefined} small={pos.mode === 'outro'} />
      </FitBox>
    );
  } else if (pos.mode === 'gap') {
    stageKey = `gap-${pos.line}`;
    content = (
      <FitBox>
        <TitleCard track={track} palette={palette} small />
      </FitBox>
    );
  } else if (isGraph(scenes[pos.line]?.template)) {
    const kind = scenes[pos.line].template;
    const joined = (a: number) =>
      scenes[a]?.template === kind && scenes[a + 1]?.template === kind && lines[a].end >= lines[a + 1].start - 0.05;
    let from = pos.line;
    while (from > 0 && joined(from - 1)) from--;
    let to = pos.line;
    while (to < lines.length - 1 && joined(to)) to++;
    stageKey = `${kind}-${from}`;
    unclipped = true;
    content = (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textTransform: 'uppercase' }}>
        <GraphStream lines={lines} from={from} to={to} current={pos.line} revealed={pos.revealed} palette={palette} seed={songSeed} />
      </div>
    );
  } else {
    const lineSeed = (songSeed ^ hashString(currentLine.text)) >>> 0;
    const scene = scenes[pos.line];
    stageKey = `line-${pos.line}`;
    content = (
      <div
        data-line={pos.line}
        lang={langAttr(currentLine.lang)}
        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textTransform: 'uppercase' }}
      >
        <LineText line={currentLine} scene={scene} revealed={pos.revealed} palette={palette} seed={lineSeed} />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      onMouseMove={bumpIdle}
      onClick={bumpIdle}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: idleUi ? 'none' : 'default',
      }}
    >
      {/* 1. WebGL Liquid Glass shader background */}
      <AmbientBackground palette={palette} artwork={track.artworkUrl} />

      {/* 2. Top Floating Header */}
      <div
        style={{
          position: 'relative',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 28px 6px',
          opacity: idleUi ? 0 : 1,
          transition: 'opacity 0.35s ease',
        }}
      >
        <button
          type="button"
          onClick={onCollapsePlayer}
          title="Minimize player"
          className="ls-glass"
          style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', color: '#fff', cursor: 'pointer' }}
        >
          <ChevronDown size={18} />
        </button>

        <div className="ls-glass" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 14px', borderRadius: 999 }}>
          <SquareArt
            src={track.artworkUrl || freqIcon}
            videoId={track.id}
            alt={track.title}
            style={{ width: 24, height: 24, borderRadius: 6 }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, maxWidth: '38vw', overflow: 'hidden' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {track.title}
            </span>
            <span style={{ fontSize: 11.5, color: 'rgba(235,235,245,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {track.artist}
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.1)',
              color: lyrics?.wordSynced ? vivid(palette.accents[0]) : 'rgba(235,235,245,0.75)',
            }}
          >
            {lyrics?.wordSynced ? 'Word Sync' : hasSynced ? 'Synced' : 'Plain'}
          </span>
        </div>

        <button
          type="button"
          onClick={onCloseLyrics}
          title="Back to album artwork"
          className="ls-glass"
          style={{ height: 36, padding: '0 13px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          <X size={15} />
          <span>Close lyrics</span>
        </button>
      </div>

      {/* 3. Kinetic Typography Stage */}
      <div
        className="ls-stage-root"
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          width: '100%',
          overflow: unclipped ? 'visible' : 'hidden',
          zIndex: 10,
        }}
      >
        <div className="ls-drift" style={{ position: 'absolute', inset: 0 }}>
          <div className="ls-drift-inner" style={{ position: 'absolute', inset: 0 }}>
            <div key={stageKey} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'freqFadeIn 0.3s ease' }}>
              {content}
            </div>
          </div>
        </div>
        {!noLyrics && caption && (
          <p style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: 'rgba(235,235,245,0.6)', margin: 0 }}>
            {caption}
          </p>
        )}
      </div>

      {/* 4. Floating Bottom Glass Control Bar */}
      <div
        style={{
          position: 'relative',
          zIndex: 20,
          padding: '8px 28px 20px',
          display: 'flex',
          justifyContent: 'center',
          opacity: idleUi ? 0 : 1,
          transition: 'opacity 0.35s ease',
        }}
      >
        <div
          className="ls-glass"
          style={{
            width: '100%',
            maxWidth: 880,
            borderRadius: 18,
            padding: '10px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {/* Transport */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={onPrev} title="Previous" style={{ color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={onPlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#ffffff',
                color: '#09090d',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>
            <button type="button" onClick={onNext} title="Next" style={{ color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <SkipForward size={18} fill="currentColor" />
            </button>
          </div>

          {/* Scrubber */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 180 }}>
            <span style={{ fontSize: 11, color: 'rgba(235,235,245,0.65)', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(position)}
            </span>
            <FlatScrubber value={position} max={duration} height={4} ariaLabel="Seek" onSeek={onSeek} />
            <span style={{ fontSize: 11, color: 'rgba(235,235,245,0.65)', fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(duration)}
            </span>
          </div>

          {/* Template Picker */}
          <select
            aria-label="Lyric style"
            value={templateChoice}
            onChange={e => {
              const v = e.target.value as TemplateChoice;
              setTemplateChoice(v);
              try {
                localStorage.setItem(TEMPLATE_KEY, v);
              } catch {}
            }}
            style={{
              height: 30,
              borderRadius: 10,
              padding: '0 10px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {TEMPLATE_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id} style={{ background: '#18181f', color: '#fff' }}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Sync Nudge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(235,235,245,0.75)' }}>
            <button
              type="button"
              title="Lyrics earlier ([)"
              onClick={() => nudgeOffset(-0.25)}
              style={{ padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer' }}
            >
              -0.25s
            </button>
            <button
              type="button"
              title="Reset sync offset"
              onClick={() => nudgeOffset(-offsetSec)}
              style={{ minWidth: 44, textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: '#fff', cursor: 'pointer' }}
            >
              {offsetSec === 0 ? '0.0s' : `${offsetSec > 0 ? '+' : ''}${offsetSec.toFixed(2)}s`}
            </button>
            <button
              type="button"
              title="Lyrics later (])"
              onClick={() => nudgeOffset(0.25)}
              style={{ padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer' }}
            >
              +0.25s
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
