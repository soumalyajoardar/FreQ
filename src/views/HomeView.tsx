import React, { useEffect, useState } from 'react';
import { Play, Sparkles, Heart, Clock } from 'lucide-react';
import { CatalogSection, MediaTrack } from '../types';
import { ytMusicService } from '../services/ytmusic';
import { formatTime } from '../components/PlayerBar';

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
}

export const HomeView: React.FC<HomeViewProps> = ({
  onPlayTrack,
  onOpenAlbum,
  onOpenArtist,
  onToggleLike,
  isLiked,
  recentlyPlayed,
}) => {
  const [sections, setSections] = useState<CatalogSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getAtmosphericBackground = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return bgMorning;
    if (h >= 12 && h < 17) return bgAfternoon;
    if (h >= 17 && h < 22) return bgEvening;
    return bgNight;
  };

  useEffect(() => {
    let isMounted = true;
    ytMusicService.getHome().then(res => {
      if (isMounted) {
        setSections(res.sections);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // First track of the first section serves as the Hero track
  const heroItem = sections[0]?.items?.[0];
  const heroTrack: MediaTrack | null = heroItem
    ? {
        id: heroItem.id,
        title: heroItem.title,
        artist: heroItem.artist || 'Featured Artist',
        album: heroItem.album || 'Single',
        durationSeconds: heroItem.durationSeconds || 210,
        artworkUrl: heroItem.artworkUrl,
        provider: 'youtube_music',
      }
    : null;

  return (
    <div style={{ position: 'relative', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '36px' }}>
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
      {/* 1. Hero Featured Spotlight */}
      {heroTrack && (
        <div
          style={{
            position: 'relative',
            borderRadius: '24px',
            overflow: 'hidden',
            height: '240px',
            display: 'flex',
            alignItems: 'center',
            padding: '36px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'linear-gradient(135deg, rgba(27, 30, 46, 0.8) 0%, rgba(14, 16, 24, 0.95) 100%)',
          }}
        >
          {/* Blurred Backsplash */}
          {heroTrack.artworkUrl && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '60%',
                height: '100%',
                backgroundImage: `url(${heroTrack.artworkUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(30px) opacity(0.35)',
                maskImage: 'linear-gradient(to right, transparent, black)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black)',
              }}
            />
          )}

          <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '28px', width: '100%' }}>
            {heroTrack.artworkUrl && (
              <img
                src={heroTrack.artworkUrl}
                alt={heroTrack.title}
                style={{
                  width: '168px',
                  height: '168px',
                  borderRadius: '16px',
                  objectFit: 'cover',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                }}
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '600px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="var(--accent-cyan)" />
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                  Spotlight Track
                </span>
              </div>

              <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f8fafc', lineHeight: 1.2 }}>
                {heroTrack.title}
              </h1>

              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {heroTrack.artist} • {heroTrack.album}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={() => onPlayTrack(heroTrack)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    borderRadius: '999px',
                    background: 'linear-gradient(135deg, #00e5ff 0%, #8b5cf6 100%)',
                    color: '#090A0F',
                    fontWeight: 700,
                    fontSize: '13px',
                    boxShadow: '0 0 16px rgba(0, 229, 255, 0.45)',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <Play size={16} fill="#090A0F" />
                  <span>Play Spotlight</span>
                </button>

                <button
                  onClick={() => onToggleLike(heroTrack)}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: isLiked(heroTrack.id) ? '#ec4899' : 'var(--text-secondary)',
                  }}
                >
                  <Heart size={18} fill={isLiked(heroTrack.id) ? '#ec4899' : 'transparent'} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Recently Played Rail */}
      {recentlyPlayed.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--accent-teal)" />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Recently Played
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '16px',
            }}
          >
            {recentlyPlayed.slice(0, 6).map(track => (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track, recentlyPlayed)}
                style={{
                  padding: '12px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  group: 'card',
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
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={track.artworkUrl || ''}
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
                      background: 'linear-gradient(135deg, #00e5ff 0%, #8b5cf6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0, 229, 255, 0.5)',
                    }}
                  >
                    <Play size={16} fill="#090A0F" color="#090A0F" style={{ marginLeft: '2px' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.title}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.artist}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Catalog Rails */}
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
            <section key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {section.title}
                </h2>
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
                  const isSong = item.type === 'song';
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
                      onClick={() => {
                        if (isSong) {
                          onPlayTrack(trackObj, songs);
                        } else if (item.type === 'album') {
                          onOpenAlbum(item.id);
                        } else if (item.type === 'artist') {
                          onOpenArtist(item.id);
                        }
                      }}
                      style={{
                        width: '170px',
                        flexShrink: 0,
                        padding: '12px',
                        borderRadius: '16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
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
                          borderRadius: item.type === 'artist' ? '50%' : '12px',
                          overflow: 'hidden',
                          position: 'relative',
                          backgroundColor: '#1b1e2e',
                        }}
                      >
                        <img
                          src={item.artworkUrl || ''}
                          alt={item.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {isSong && (
                          <div
                            style={{
                              position: 'absolute',
                              right: '8px',
                              bottom: '8px',
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #00e5ff 0%, #8b5cf6 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 10px rgba(0, 229, 255, 0.5)',
                            }}
                          >
                            <Play size={14} fill="#090A0F" color="#090A0F" style={{ marginLeft: '2px' }} />
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.artist || item.type.toUpperCase()}
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
