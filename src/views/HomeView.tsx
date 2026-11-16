import React, { useEffect, useState } from 'react';
import { Play, Heart, Clock, Search, Disc3, Shuffle, Sun, Coffee, Sunrise, Music, Headphones, Zap, Sunset, Sparkles, Moon, Star, ArrowRight, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CatalogSection, MediaTrack } from '../types';
import { ytMusicService } from '../services/ytmusic';
import { regionDef } from '../services/regions';
import { formatTime } from '../components/PlayerBar';
import { useExitTransition } from '../components/useExitTransition';
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

// Icon slots stay positional; text + query come from the region def.
const MOOD_ICONS: Record<'morning' | 'afternoon' | 'evening' | 'night', LucideIcon[]> = {
  morning: [Sun, Coffee, Sunrise, Music],
  afternoon: [Headphones, Coffee, Zap, Sun],
  evening: [Sunset, Sun, Sparkles, Music],
  night: [Moon, Headphones, Star, Moon],
};

function daypart(): keyof typeof MOOD_ICONS {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

const HomeViewComponent: React.FC<HomeViewProps> = ({
  onPlayTrack,
  onToggleLike,
  isLiked,
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
  const [homeQuery, setHomeQuery] = useState('');
  const [suggestTracks, setSuggestTracks] = useState<MediaTrack[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestAnim = useExitTransition(suggestOpen && homeQuery.trim().length >= 2, 160);
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

  // Live suggestions dropdown (debounced song/artist matches)
  useEffect(() => {
    const trimmed = homeQuery.trim();
    if (trimmed.length < 2) {
      setSuggestTracks([]);
      setSuggestLoading(false);
      return;
    }
    setSuggestLoading(true);
    const timeout = setTimeout(() => {
      ytMusicService.search(trimmed).then(res => {
        setSuggestTracks(res.slice(0, 8));
        setSuggestLoading(false);
      }).catch(() => {
        setSuggestLoading(false);
      });
    }, 280);
    return () => clearTimeout(timeout);
  }, [homeQuery]);

  const suggestArtists = Array.from(
    suggestTracks.reduce((map, t) => {
      const art = (t.artist || '').trim();
      if (art && art !== 'Unknown Artist' && !map.has(art)) {
        map.set(art, { name: art, artworkUrl: t.artworkUrl });
      }
      return map;
    }, new Map<string, { name: string; artworkUrl: string | null }>()).values()
  ).slice(0, 2);

  // Rotate the mood line every 25s for a dynamic greeting
  useEffect(() => {
    const t = setInterval(() => {
      setMoodIdx(Math.floor(Math.random() * 4));
    }, 25000);
    return () => clearInterval(t);
  }, []);

  const part = daypart();
  const defLines = regionDef(region).moods[part];
  const line = defLines[moodIdx % defLines.length];
  const mood: MoodLine = { text: line.text, query: line.query, Icon: MOOD_ICONS[part][moodIdx % MOOD_ICONS[part].length] };

  // Albums aggregated from every rail + your own history (real YT Music
  // album metadata). Singles are kept too — requiring 2+ songs leaves a
  // normal library with only a handful of groups and a half-empty row.
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
    albumSource.reduce((map, t) => {
      const key = (t.album || '').trim();
      if (!key || key.toLowerCase() === 'single') return map;
      if (!map.has(key)) map.set(key, { title: key, artist: t.artist, artworkUrl: t.artworkUrl, tracks: [t] });
      else {
        const g = map.get(key)!;
        if (!g.tracks.some(x => x.id === t.id)) g.tracks.push(t);
        if (!g.artworkUrl && t.artworkUrl) g.artworkUrl = t.artworkUrl;
      }
      return map;
    }, new Map<string, { title: string; artist: string; artworkUrl: string | null; tracks: MediaTrack[] }>()).values()
  )
    .filter(g => g.tracks.length >= 1 && g.artworkUrl)
    .sort((a, b) => b.tracks.length - a.tracks.length)
    .slice(0, 14);

  return (
    <div style={{ position: 'relative', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '32px' }} className="view-enter">
      {/* Time-of-Day Atmospheric Background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '420px',
          backgroundImage: `url(${getAtmosphericBackground()})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.16,
          maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* 0. Search Bar (sticky nav — stays put while rails scroll) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'sticky', top: 0, zIndex: 25, margin: '-24px -32px 0', padding: '16px 32px', backgroundColor: 'rgba(9, 10, 15, 0.86)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
      {/* FreQ wordmark — sits beside the whole search bar */}
      <span
        aria-hidden="true"
        className="freq-wordmark"
        style={{
          marginRight: '18px',
          flexShrink: 0,
          fontSize: '32px',
          fontWeight: 900,
          letterSpacing: '-0.05em',
          lineHeight: 1,
          paddingBottom: '2px',
          background: 'linear-gradient(135deg, #ffffff 0%, #c9ffe3 38%, #1ed760 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 0 16px rgba(30, 215, 96, 0.30))',
          userSelect: 'none',
        }}
      >
        FreQ
      </span>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (homeQuery.trim()) {
            setSuggestOpen(false);
            onSearchSubmit(homeQuery.trim());
          }
        }}
        style={{ position: 'relative', flex: '0 1 640px', width: '100%', minWidth: 0 }}
      >
        <div style={{ position: 'absolute', left: '8px', top: '25px', transform: 'translateY(-50%)', width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.10)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 1 }}>
          <Search size={17} strokeWidth={2.5} />
        </div>
        <input
          type="text"
          placeholder="Search songs, artists, albums..."
          value={homeQuery}
          onChange={e => { setHomeQuery(e.target.value); setSuggestOpen(true); }}
          onFocus={() => setSuggestOpen(true)}
          onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
          onKeyDown={e => { if (e.key === 'Escape') setSuggestOpen(false); }}
          className="search-input-field"
          style={{
            width: '100%',
            height: '50px',
            padding: '0 235px 0 50px',
            borderRadius: suggestOpen && homeQuery.trim().length >= 2 ? '16px 16px 0 0' : '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderBottom: suggestOpen && homeQuery.trim().length >= 2 ? '1px solid transparent' : '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            outline: 'none',
          }}
        />
        {/* Powered by ORIGIN SOUNDS */}
        <div
          className="origin-sounds-badge"
          style={{
            position: 'absolute',
            right: '52px',
            top: '25px',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <Sparkles size={11} color="#38bdf8" />
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              background: 'linear-gradient(90deg, #a78bfa, #38bdf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              whiteSpace: 'nowrap',
            }}
          >
            Powered by ORIGIN SOUNDS
          </span>
        </div>
        <button
          type="submit"
          title="Search"
          style={{
            position: 'absolute',
            right: '6px',
            top: '25px',
            transform: 'translateY(-50%)',
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            backgroundColor: '#f8fafc',
            color: '#090A0F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)',
          }}
        >
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>

        {/* Suggestions dropdown: related songs + artists */}
        {suggestAnim.visible && (
          <div
            style={{
              position: 'absolute',
              top: '50px',
              left: 0,
              right: 0,
              borderRadius: '0 0 16px 16px',
              backgroundColor: 'rgba(16, 18, 28, 0.94)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.55)',
              overflow: 'hidden',
              animation: suggestAnim.closing ? 'freqFadeScaleOut 0.14s ease' : 'freqPopIn 0.18s ease',
            }}
          >
            {suggestArtists.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', padding: '12px 12px 4px 12px' }}>
                {suggestArtists.map(a => (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => { setSuggestOpen(false); onSearchSubmit(a.name); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px 6px 6px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.10)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {a.artworkUrl ? (
                      <SquareArt src={a.artworkUrl} alt={a.name} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                    ) : (
                      <User size={14} color="var(--text-secondary)" style={{ margin: '0 4px' }} />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{a.name}</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '6px' }}>
              {suggestLoading && suggestTracks.length === 0 && (
                <div style={{ padding: '14px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Finding matches...
                </div>
              )}
              {suggestTracks.slice(0, 6).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setSuggestOpen(false); onPlayTrack(t); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <SquareArt
                    src={t.artworkUrl}
                    videoId={t.id}
                    alt={t.title}
                    style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, backgroundColor: '#1b1e2e' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.artist}
                    </span>
                  </div>
                  <Play size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                </button>
              ))}
              {!suggestLoading && suggestTracks.length === 0 && (
                <div style={{ padding: '14px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No quick matches — hit → for full search
                </div>
              )}
            </div>
          </div>
        )}
      </form>
      </div>

            {/* 1. Stunning Hero Banner */}
      <div 
        onClick={() => onSearchSubmit(mood.query)}
        style={{
          marginTop: '16px',
          position: 'relative',
          zIndex: 1,
          background: 'linear-gradient(135deg, rgba(248,250,252,0.30) 0%, rgba(139,92,246,0.65) 52%, rgba(6,182,212,0.45) 100%)',
          borderRadius: '24px',
          padding: '2px', // Thin colorful border effect
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <div style={{
          background: 'rgba(18, 20, 31, 0.84)',
          backdropFilter: 'blur(16px)',
          borderRadius: '22px',
          padding: '32px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative glowing orbs */}
          <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(139,92,246,0.16) 0%, transparent 70%)', filter: 'blur(32px)' }} />
          <div style={{ position: 'absolute', bottom: '-50%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', filter: 'blur(32px)' }} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 2 }}>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '2px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
              Made For You
            </span>
            <span key={mood.text} style={{ fontSize: '40px', fontWeight: 900, color: '#fff', letterSpacing: '-1px', animation: 'freqRiseIn 0.4s ease' }}>
              {mood.text}
            </span>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>
              Jump into a custom mix based on your mood.
            </span>
          </div>

          <div key={mood.text + '-icon'} style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', animation: 'freqPopIn 0.4s ease' }}>
            <mood.Icon size={36} color="#fff" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* 2. Recently Played Rail */}
      {recentlyPlayed.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#fff" />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Recently Played
            </h2>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              overflowX: 'auto',
              paddingBottom: '8px',
            }}
          >
            {recentlyPlayed.slice(0, 8).map(track => {
              const isCurrent = !!currentTrackId && track.id === currentTrackId;
              return (
              <div
                key={track.id}
                onClick={() => { if (isCurrent) onOpenPlayer?.(); else onPlayTrack(track); }} onContextMenu={e => onTrackContextMenu?.(e, track)}
                style={{
                  width: '170px',
                  flexShrink: 0,
                  padding: '12px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                } as any}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', position: 'relative', backgroundColor: '#1b1e2e' }}>
                  <SquareArt
                    src={track.artworkUrl}
                    videoId={track.id}
                    alt={track.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '10px',
                      bottom: '10px',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: isCurrent ? 'rgba(9, 10, 15, 0.72)' : '#f8fafc',
                      backdropFilter: isCurrent ? 'blur(8px)' : undefined,
                      WebkitBackdropFilter: isCurrent ? 'blur(8px)' : undefined,
                      border: isCurrent ? '1px solid rgba(255, 255, 255, 0.25)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {isCurrent && isPlaying ? (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{ width: 3, height: 14, borderRadius: 2, background: '#fff', transformOrigin: 'bottom', animation: `freqEq 0.9s ease-in-out ${i * 0.15}s infinite` }} />
                        ))}
                      </div>
                    ) : (
                      <Play size={16} fill={isCurrent ? '#fff' : '#090A0F'} color={isCurrent ? '#fff' : '#090A0F'} style={{ marginLeft: '2px' }} />
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: isCurrent ? '#fff' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.title}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.artist}
                  </span>
                </div>
              </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Popular Albums (grouped from rails) */}
      {albumGroups.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Disc3 size={18} color="#fff" />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Popular Albums
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
            {albumGroups.map(alb => (
              <div
                key={alb.title}
                onClick={() => alb.tracks.length > 0 && onPlayTrack(alb.tracks[0], alb.tracks)}
                style={{
                  width: '170px',
                  flexShrink: 0,
                  padding: '12px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', position: 'relative', backgroundColor: '#1b1e2e' }}>
                  <SquareArt
                    src={alb.artworkUrl}
                    alt={alb.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '8px',
                      bottom: '8px',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    <Play size={14} fill="#090A0F" color="#090A0F" style={{ marginLeft: '2px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {alb.title}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {alb.artist} • {alb.tracks.length} {alb.tracks.length === 1 ? 'song' : 'songs'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Mood / Genre Catalog Rails */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <span>Loading FreQ discovery rails...</span>
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
            <section key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {section.title}
                </h2>
                {songs.length > 0 && (
                  <button
                    onClick={() => {
                      const shuffled = shuffle(songs);
                      onPlayTrack(shuffled[0], shuffled);
                    }}
                    title={`Shuffle ${section.title}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <Shuffle size={13} />
                    <span>Shuffle</span>
                  </button>
                )}
              </div>

              {/* Horizontal Scrollable Rail */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                }}
              >
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
                    <div
                      key={iIdx}
                      onClick={() => onPlayTrack(trackObj)} onContextMenu={e => onTrackContextMenu?.(e, trackObj)}
                      style={{
                        width: '170px',
                        flexShrink: 0,
                        padding: '12px',
                        borderRadius: '16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.4)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          position: 'relative',
                          backgroundColor: '#1b1e2e',
                        }}
                      >
                        <SquareArt
                          src={item.artworkUrl}
                          videoId={item.id}
                          alt={item.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            right: '8px',
                            bottom: '8px',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
                          }}
                        >
                          <Play size={14} fill="#090A0F" color="#090A0F" style={{ marginLeft: '2px' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.artist || 'SONG'}
                        </span>
                      </div>
                    </div>
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










