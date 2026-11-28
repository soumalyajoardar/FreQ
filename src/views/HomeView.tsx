import React, { useEffect, useState } from 'react';
import {
  Play,
  Disc3,
  Shuffle,
  Sun,
  Coffee,
  Sunrise,
  Music,
  Headphones,
  Zap,
  Sunset,
  Sparkles,
  Moon,
  Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CatalogSection, MediaTrack } from '../types';
import { ytMusicService } from '../services/ytmusic';
import { playbackManager } from '../services/playbackManager';
import { regionDef } from '../services/regions';
import { SafeArtwork } from '../components/SafeArtwork';
import { SquareArt } from '../components/SquareArt';
import { shuffle } from '../utils/shuffle';

import bgMorning from '../assets/backgrounds/app_background_morning.jpg';
import bgAfternoon from '../assets/backgrounds/app_background_afternoon.jpg';
import bgEvening from '../assets/backgrounds/app_background_evening.jpg';
import bgNight from '../assets/backgrounds/app_background_night.jpg';

interface HomeViewProps {
  onPlayTrack: (track: MediaTrack, playlist?: MediaTrack[]) => void;
  onOpenAlbum: (albumId: string) => void;
  onOpenArtist: (artistId: string) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onToggleLike: (track: MediaTrack) => void;
  isLiked: (trackId: string) => boolean;
  recentlyPlayed: MediaTrack[];
  onSearchSubmit: (query: string) => void;
  currentTrackId?: string | null;
  isPlaying?: boolean;
  onOpenPlayer?: () => void;
  onTrackContextMenu?: (e: React.MouseEvent, track: MediaTrack) => void;
  region?: string;
}

interface MoodLine {
  text: string;
  Icon: LucideIcon;
  query: string;
}

const MOOD_ICONS: Record<'morning' | 'afternoon' | 'evening' | 'night', LucideIcon[]> = {
  morning: [Sun, Coffee, Sunrise, Music],
  afternoon: [Headphones, Coffee, Zap, Sun],
  evening: [Sunset, Sun, Sparkles, Music],
  night: [Moon, Headphones, Star, Moon],
};

const DAYPART_LABEL: Record<string, string> = {
  morning: 'Morning edition',
  afternoon: 'Afternoon edition',
  evening: 'Evening edition',
  night: 'Late night edition',
};

function daypart(): keyof typeof MOOD_ICONS {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

const TrackCard: React.FC<{
  track: MediaTrack;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}> = ({ track, isCurrent, isPlaying, onPlay, onContextMenu }) => (
  <div
    className={`fq-card${isCurrent ? ' is-current' : ''}`}
    onClick={onPlay}
    onContextMenu={onContextMenu}
    onMouseEnter={() => playbackManager.scheduleHoverPrefetch(track)}
    onMouseLeave={() => playbackManager.cancelHoverPrefetch(track.id)}
    role="button"
    tabIndex={0}
  >
    <div className="fq-card-media">
      <SquareArt
        src={track.artworkUrl}
        videoId={track.id}
        alt={track.title}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {isCurrent && (
        <span className="fq-eq" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
      <span className="fq-card-play">
        {isCurrent && isPlaying ? (
          <span style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  width: '2.5px',
                  height: '100%',
                  borderRadius: '2px',
                  background: 'currentColor',
                  transformOrigin: 'bottom',
                  animation: `freqEq 0.9s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </span>
        ) : (
          <Play size={15} fill="currentColor" style={{ marginLeft: '2px' }} />
        )}
      </span>
    </div>
    <div className="fq-card-title">{track.title}</div>
    <div className="fq-card-meta">{track.artist}</div>
  </div>
);

const HomeViewComponent: React.FC<HomeViewProps> = ({
  onPlayTrack,
  recentlyPlayed,
  onSearchSubmit,
  currentTrackId,
  isPlaying = false,
  onOpenPlayer,
  onTrackContextMenu,
  region = 'IN',
}) => {
  const [sections, setSections] = useState<CatalogSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [moodIdx, setMoodIdx] = useState(() => Math.floor(Math.random() * 4));

  const getAtmosphericBackground = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return bgMorning;
    if (h >= 12 && h < 17) return bgAfternoon;
    if (h >= 17 && h < 22) return bgEvening;
    return bgNight;
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    ytMusicService.getRegionalHome(region).then(res => {
      if (isMounted) {
        setSections(res.sections);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [region]);

  useEffect(() => {
    const t = setInterval(() => setMoodIdx(Math.floor(Math.random() * 4)), 25000);
    return () => clearInterval(t);
  }, []);

  const part = daypart();
  const defLines = regionDef(region).moods[part];
  const line = defLines[moodIdx % defLines.length];
  const mood: MoodLine = {
    text: line.text,
    query: line.query,
    Icon: MOOD_ICONS[part][moodIdx % MOOD_ICONS[part].length],
  };

  // Album groups from every rail plus your own history.
  const albumSource: MediaTrack[] = [
    ...sections.flatMap(s =>
      s.items
        .filter(i => i.type === 'song')
        .map(i => ({
          id: i.id,
          title: i.title,
          artist: i.artist || 'Unknown Artist',
          album: i.album || 'Single',
          durationSeconds: i.durationSeconds || 194,
          artworkUrl: i.artworkUrl,
          provider: 'youtube_music',
        } as MediaTrack))
    ),
    ...recentlyPlayed,
  ];

  const albumGroups = Array.from(
    albumSource
      .reduce((map, t) => {
        const key = (t.album || '').trim();
        if (!key || key.toLowerCase() === 'single') return map;
        if (!map.has(key))
          map.set(key, { title: key, artist: t.artist, artworkUrl: t.artworkUrl, tracks: [t] });
        else {
          const g = map.get(key)!;
          if (!g.tracks.some(x => x.id === t.id)) g.tracks.push(t);
          if (!g.artworkUrl && t.artworkUrl) g.artworkUrl = t.artworkUrl;
        }
        return map;
      }, new Map<string, { title: string; artist: string; artworkUrl: string | null; tracks: MediaTrack[] }>())
      .values()
  )
    .filter(g => g.tracks.length >= 1 && g.artworkUrl)
    .sort((a, b) => b.tracks.length - a.tracks.length)
    .slice(0, 14);

  // Collage art for the hero: recent history first, then catalog art.
  const collage = Array.from(
    new Map(
      [...recentlyPlayed, ...albumSource]
        .filter(t => !!t.artworkUrl)
        .map(t => [t.id, t.artworkUrl as string])
    ).values()
  ).slice(0, 3);

  const heroSongs = sections.flatMap(s =>
    s.items
      .filter(i => i.type === 'song')
      .map(
        i =>
          ({
            id: i.id,
            title: i.title,
            artist: i.artist || 'Unknown Artist',
            album: i.album || 'Single',
            durationSeconds: i.durationSeconds || 194,
            artworkUrl: i.artworkUrl,
            provider: 'youtube_music',
          } as MediaTrack)
      )
  );

  const shuffleSomething = () => {
    const pool = recentlyPlayed.length > 0 ? recentlyPlayed : heroSongs;
    if (pool.length === 0) return;
    const shuffled = shuffle(pool);
    onPlayTrack(shuffled[0], shuffled);
  };

  return (
    <div className="fq-view view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '34px' }}>
      {/* Hero */}
      <section
        className="fq-hero"
        onClick={() => onSearchSubmit(mood.query)}
        aria-label={`Made for you: ${mood.text}`}
      >
        <div
          className="fq-hero-bg"
          style={{ backgroundImage: `url(${getAtmosphericBackground()})` }}
        />
        <div className="fq-hero-scrim" />

        <div className="fq-hero-content">
          <span className="fq-kicker" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Made for you · {DAYPART_LABEL[part] || 'Today'}
          </span>

          <h1 className="fq-hero-title" key={mood.text} style={{ animation: 'freqRiseIn 0.45s ease' }}>
            {mood.text}
          </h1>

          <p className="fq-hero-sub">
            A live mix pulled from your region and tuned to right now — press play and let FreQ
            keep it going.
          </p>

          <div className="fq-hero-actions">
            <button
              className="fq-btn fq-btn-primary"
              onClick={e => {
                e.stopPropagation();
                onSearchSubmit(mood.query);
              }}
            >
              <Play size={13} fill="currentColor" />
              Play this mood
            </button>
            <button
              className="fq-btn"
              onClick={e => {
                e.stopPropagation();
                shuffleSomething();
              }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.14)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Shuffle size={13} />
              Shuffle something
            </button>
            <span
              className="fq-chip"
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.65)',
                height: '30px',
              }}
            >
              <mood.Icon size={12} />
              {part}
            </span>
          </div>
        </div>

        {collage.length > 0 && (
          <div className="fq-hero-art" aria-hidden="true">
            {collage.map((src, i) => (
              <img key={`${src}-${i}`} src={src} alt="" loading="lazy" />
            ))}
          </div>
        )}
      </section>

      {/* Recently played */}
      {recentlyPlayed.length > 0 && (
        <section className="fq-section">
          <div className="fq-section-head">
            <div className="fq-section-title-wrap">
              <h2 className="fq-h2">Recently played</h2>
              <span className="fq-muted" style={{ fontSize: '12px' }}>
                Pick up where you left off
              </span>
            </div>
            <span className="fq-kicker">{recentlyPlayed.slice(0, 8).length} tracks</span>
          </div>

          <div className="fq-rail">
            {recentlyPlayed.slice(0, 8).map(track => {
              const isCurrent = !!currentTrackId && track.id === currentTrackId;
              return (
                <TrackCard
                  key={track.id}
                  track={track}
                  isCurrent={isCurrent}
                  isPlaying={isPlaying}
                  onPlay={() => {
                    if (isCurrent) onOpenPlayer?.();
                    else onPlayTrack(track);
                  }}
                  onContextMenu={e => onTrackContextMenu?.(e, track)}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Popular albums */}
      {albumGroups.length > 0 && (
        <section className="fq-section">
          <div className="fq-section-head">
            <div className="fq-section-title-wrap">
              <h2 className="fq-h2">Popular albums</h2>
              <span className="fq-muted" style={{ fontSize: '12px' }}>
                Gathered from today&apos;s rails and your history
              </span>
            </div>
            <span className="fq-kicker">{albumGroups.length} albums</span>
          </div>

          <div className="fq-rail">
            {albumGroups.map(alb => (
              <div
                key={alb.title}
                className="fq-card"
                onClick={() => alb.tracks.length > 0 && onPlayTrack(alb.tracks[0], alb.tracks)}
                onMouseEnter={() => alb.tracks.length > 0 && playbackManager.scheduleHoverPrefetch(alb.tracks[0])}
                onMouseLeave={() => alb.tracks.length > 0 && playbackManager.cancelHoverPrefetch(alb.tracks[0].id)}
              >
                <div className="fq-card-media">
                  <SquareArt
                    src={alb.artworkUrl}
                    alt={alb.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span className="fq-card-play">
                    <Play size={15} fill="currentColor" style={{ marginLeft: '2px' }} />
                  </span>
                </div>
                <div className="fq-card-title">{alb.title}</div>
                <div className="fq-card-meta">
                  {alb.artist} · {alb.tracks.length} {alb.tracks.length === 1 ? 'song' : 'songs'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catalog rails */}
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 0',
            color: 'var(--text-muted)',
            fontSize: '12.5px',
          }}
        >
          Loading discovery rails…
        </div>
      ) : (
        sections.map((section, sIdx) => {
          const songs = section.items
            .filter(item => item.type === 'song')
            .map(item => ({
              id: item.id,
              title: item.title,
              artist: item.artist || 'Unknown Artist',
              album: item.album || 'Single',
              durationSeconds: item.durationSeconds || 194,
              artworkUrl: item.artworkUrl,
              provider: 'youtube_music',
            }));

          return (
            <section key={sIdx} className="fq-section">
              <div className="fq-section-head">
                <div className="fq-section-title-wrap">
                  <h2 className="fq-h2">{section.title}</h2>
                </div>
                {songs.length > 0 && (
                  <button
                    className="fq-btn fq-btn-ghost"
                    onClick={() => {
                      const shuffled = shuffle(songs);
                      onPlayTrack(shuffled[0], shuffled);
                    }}
                    title={`Shuffle ${section.title}`}
                  >
                    <Shuffle size={13} />
                    Shuffle
                  </button>
                )}
              </div>

              <div className="fq-rail">
                {section.items.map((item, iIdx) => {
                  const trackObj: MediaTrack = {
                    id: item.id,
                    title: item.title,
                    artist: item.artist || 'Unknown Artist',
                    album: item.album || 'Single',
                    durationSeconds: item.durationSeconds || 194,
                    artworkUrl: item.artworkUrl,
                    provider: 'youtube_music',
                  };
                  return (
                    <TrackCard
                      key={iIdx}
                      track={trackObj}
                      isCurrent={!!currentTrackId && item.id === currentTrackId}
                      isPlaying={isPlaying}
                      onPlay={() => onPlayTrack(trackObj)}
                      onContextMenu={e => onTrackContextMenu?.(e, trackObj)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
};

export const HomeView = React.memo(HomeViewComponent);
