import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Play, Heart, PlusCircle, Clock, Music, Disc, User, Sparkles } from 'lucide-react';
import { MediaTrack } from '../types';
import { ytMusicService } from '../services/ytmusic';
import { formatTime } from '../components/PlayerBar';
import { SquareArt } from '../components/SquareArt';

interface SearchViewProps {
  onPlayTrack: (track: MediaTrack, queue?: MediaTrack[]) => void;
  onToggleLike: (track: MediaTrack) => void;
  isLiked: (trackId: string) => boolean;
  onOpenAddToPlaylist: (track: MediaTrack) => void;
  searchHistory: string[];
  recentlyPlayed?: MediaTrack[];
  onAddSearchHistory: (q: string) => void;
  onClearSearchHistory: () => void;
  initialQuery?: string;
  onTrackContextMenu?: (e: React.MouseEvent, track: MediaTrack) => void;
}

const SearchViewComponent: React.FC<SearchViewProps> = ({
  onPlayTrack,
  onToggleLike,
  isLiked,
  onOpenAddToPlaylist,
  searchHistory,
  recentlyPlayed = [],
  onAddSearchHistory,
  onClearSearchHistory,
  initialQuery,
  onTrackContextMenu,
}) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState<MediaTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SONGS' | 'ARTISTS' | 'ALBUMS'>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // The chrome command bar is hidden on this view, so keep the same
  // "/" and Ctrl/Cmd+K focus shortcut working against this input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (!typing && (e.key === '/' || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)))) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const executeSearch = (trimmed: string) => {
    if (trimmed.length < 1) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    ytMusicService.search(trimmed).then(res => {
      setResults(res);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  };

  // Explicit search submit (Enter/button): the ONLY writer of history,
  // plus playing a song from results.
  const submitSearch = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    onAddSearchHistory(trimmed);
    executeSearch(trimmed);
  };

  // Song taps play single (not the results list) so Up Next is built
  // from vibe/continuation instead of echoing similar titles.
  const handlePlayFromSearch = (track: MediaTrack) => {
    const trimmed = query.trim();
    if (trimmed) onAddSearchHistory(trimmed);
    onPlayTrack(track);
  };

  // Artist/album cards keep their grouped list (same artist/album = same vibe).
  const handlePlayCollectionFromSearch = (track: MediaTrack, list: MediaTrack[]) => {
    const trimmed = query.trim();
    if (trimmed) onAddSearchHistory(trimmed);
    onPlayTrack(track, list);
  };

  // Run once when arriving with a query from Home.
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      executeSearch(initialQuery.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(() => {
      executeSearch(trimmed);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleQuerySelect = (item: string) => {
    setQuery(item);
    executeSearch(item);
  };

  // Group unique artists from results
  const uniqueArtists = Array.from(
    results.reduce((map, t) => {
      const art = t.artist.trim();
      if (!map.has(art)) {
        map.set(art, { name: art, artworkUrl: t.artworkUrl, tracks: [t] });
      } else {
        map.get(art)!.tracks.push(t);
      }
      return map;
    }, new Map<string, { name: string; artworkUrl: string | null; tracks: MediaTrack[] }>()).values()
  );

  // Group unique albums from results
  const uniqueAlbums = Array.from(
    results.reduce((map, t) => {
      const alb = (t.album || 'Single').trim();
      if (!map.has(alb)) {
        map.set(alb, { title: alb, artist: t.artist, artworkUrl: t.artworkUrl, tracks: [t] });
      } else {
        map.get(alb)!.tracks.push(t);
      }
      return map;
    }, new Map<string, { title: string; artist: string; artworkUrl: string | null; tracks: MediaTrack[] }>()).values()
  );

  const topResult = results[0];
  const hadQuery = query.trim().length > 0;

  const renderTrackItem = (track: MediaTrack, idx: number, trackList: MediaTrack[]) => (
    <div
      key={`${track.id}-${idx}`}
      className="fq-trow"
      onContextMenu={e => onTrackContextMenu?.(e, track)}
    >
      <span className="fq-tnum">{String(idx + 1).padStart(2, '0')}</span>

      <div className="fq-tmain" onClick={() => handlePlayFromSearch(track)} style={{ cursor: 'pointer' }}>
        <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#14141b' }}>
          <SquareArt
            src={track.artworkUrl}
            videoId={track.id}
            alt={track.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span className="fq-ttitle">{track.title}</span>
          <span className="fq-tsub">{track.artist} · {track.album}</span>
        </div>
      </div>

      <span className="fq-tdur">{formatTime(track.durationSeconds)}</span>

      <div className="fq-tact" style={{ width: '70px' }}>
        <button
          onClick={() => onToggleLike(track)}
          title={isLiked(track.id) ? 'Unlike' : 'Like'}
          className="fq-icon-btn"
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '7px',
            color: isLiked(track.id) ? 'var(--accent-cyan)' : 'var(--text-muted)',
          }}
        >
          <Heart size={14} fill={isLiked(track.id) ? 'currentColor' : 'transparent'} />
        </button>
        <button
          onClick={() => onOpenAddToPlaylist(track)}
          title="Add to playlist"
          className="fq-icon-btn"
          style={{ width: '26px', height: '26px', borderRadius: '7px' }}
        >
          <PlusCircle size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fq-view view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '22px', paddingTop: '18px' }}>
      <header className="fq-page-head" style={{ paddingBottom: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span className="fq-kicker">Catalogue</span>
          <h1 className="fq-h1">Search</h1>
        </div>
      </header>

      {/* Search input */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '720px' }}>
        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
          <Search size={17} strokeWidth={2.2} />
        </span>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search songs, artists, albums, or lyrics…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') submitSearch(query);
          }}
          autoFocus
          spellCheck={false}
          style={{
            width: '100%',
            height: '46px',
            padding: '0 210px 0 46px',
            borderRadius: '14px',
            background: 'rgba(255, 255, 255, 0.045)',
            border: '1px solid var(--line)',
            color: 'var(--text-primary)',
            fontSize: '13.5px',
            fontWeight: 450,
            letterSpacing: '-0.005em',
            transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb), 0.4)';
            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(var(--accent-rgb), 0.07)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--line)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.045)';
          }}
        />

        <div
          className="origin-sounds-badge"
          style={{ position: 'absolute', right: query ? '46px' : '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <Sparkles size={10} color="var(--text-secondary)" />
          <span>Powered by ORIGIN SOUNDS</span>
        </div>

        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="fq-icon-btn"
            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '30px', height: '30px' }}
            title="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        {(['ALL', 'SONGS', 'ARTISTS', 'ALBUMS'] as const).map(tab => {
          const active = activeFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`fq-chip${active ? ' fq-chip-accent' : ''}`}
              style={{ height: '30px', padding: '0 13px', fontSize: '10.5px', letterSpacing: '0.06em' }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Idle state: recent searches + recently played */}
      {!hadQuery && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '6px' }}>
          {searchHistory.length > 0 && (
            <section className="fq-section">
              <div className="fq-section-head">
                <div className="fq-section-title-wrap">
                  <h2 className="fq-h3">Recent searches</h2>
                </div>
                <button className="fq-btn fq-btn-ghost" onClick={onClearSearchHistory}>
                  Clear history
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {searchHistory.slice(0, 15).map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuerySelect(item)}
                    className="fq-chip"
                    style={{ height: '32px', padding: '0 13px', fontSize: '12px', fontWeight: 520, color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--line-strong)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--line)'; }}
                  >
                    <Clock size={12} />
                    {item}
                  </button>
                ))}
              </div>
            </section>
          )}

          {recentlyPlayed.length > 0 && (
            <section className="fq-section">
              <div className="fq-section-head">
                <div className="fq-section-title-wrap">
                  <h2 className="fq-h3">Recently played</h2>
                </div>
                <span className="fq-kicker">{recentlyPlayed.length} tracks</span>
              </div>
              <div className="fq-table">
                {recentlyPlayed.map((track, idx) => renderTrackItem(track, idx, recentlyPlayed))}
              </div>
            </section>
          )}

          {searchHistory.length === 0 && recentlyPlayed.length === 0 && (
            <div className="fq-panel" style={{ padding: '56px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <Search size={24} color="var(--text-muted)" />
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Find your next favourite</div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Search any song, artist, album or lyric.</div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 0', color: 'var(--text-muted)', gap: '10px', fontSize: '12.5px' }}>
          <div style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Searching…
        </div>
      ) : activeFilter === 'ARTISTS' ? (
        uniqueArtists.length > 0 ? (
          <section className="fq-section">
            <div className="fq-section-head">
              <div className="fq-section-title-wrap">
                <h2 className="fq-h3">Artists</h2>
              </div>
              <span className="fq-kicker">{uniqueArtists.length}</span>
            </div>
            <div className="fq-rail">
              {uniqueArtists.map((art, idx) => (
                <div
                  key={idx}
                  className="fq-card"
                  onClick={() => art.tracks.length > 0 && handlePlayCollectionFromSearch(art.tracks[0], art.tracks)}
                  style={{ width: '184px' }}
                >
                  <div className="fq-card-media" style={{ borderRadius: '50%' }}>
                    {art.artworkUrl ? (
                      <SquareArt src={art.artworkUrl} alt={art.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                        <User size={38} color="var(--text-muted)" />
                      </div>
                    )}
                  </div>
                  <div className="fq-card-title" style={{ textAlign: 'center' }}>{art.name}</div>
                  <div className="fq-card-meta" style={{ textAlign: 'center' }}>{art.tracks.length} songs</div>
                </div>
              ))}
            </div>
          </section>
        ) : hadQuery ? (
          <div style={{ padding: '56px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            No artists found for “{query}”.
          </div>
        ) : null
      ) : activeFilter === 'ALBUMS' ? (
        uniqueAlbums.length > 0 ? (
          <section className="fq-section">
            <div className="fq-section-head">
              <div className="fq-section-title-wrap">
                <h2 className="fq-h3">Albums</h2>
              </div>
              <span className="fq-kicker">{uniqueAlbums.length}</span>
            </div>
            <div className="fq-rail">
              {uniqueAlbums.map((alb, idx) => (
                <div
                  key={idx}
                  className="fq-card"
                  onClick={() => alb.tracks.length > 0 && handlePlayCollectionFromSearch(alb.tracks[0], alb.tracks)}
                >
                  <div className="fq-card-media">
                    {alb.artworkUrl ? (
                      <SquareArt src={alb.artworkUrl} alt={alb.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                        <Disc size={38} color="var(--text-muted)" />
                      </div>
                    )}
                    <span className="fq-card-play">
                      <Play size={15} fill="currentColor" style={{ marginLeft: '2px' }} />
                    </span>
                  </div>
                  <div className="fq-card-title">{alb.title}</div>
                  <div className="fq-card-meta">{alb.artist}</div>
                </div>
              ))}
            </div>
          </section>
        ) : hadQuery ? (
          <div style={{ padding: '56px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            No albums found for “{query}”.
          </div>
        ) : null
      ) : activeFilter === 'ALL' && topResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
          <div className="search-grid-hero" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: '26px', alignItems: 'start' }}>
            {/* Top result */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 className="fq-kicker" style={{ color: 'var(--text-muted)' }}>Top result</h2>
              <div
                onClick={() => handlePlayFromSearch(topResult)}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '22px',
                  borderRadius: '20px',
                  border: '1px solid var(--line)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.012))',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  transition: 'border-color 0.2s ease, transform 0.25s cubic-bezier(0.16,1,0.3,1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--line-strong)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--line)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ width: '96px', height: '96px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 12px 30px rgba(0,0,0,0.5)', background: '#14141b' }}>
                  <SquareArt src={topResult.artworkUrl} videoId={topResult.id} alt={topResult.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ minWidth: 0, paddingRight: '52px' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', lineHeight: 1.05, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {topResult.title}
                  </h3>
                  <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span className="fq-chip fq-chip-accent" style={{ height: '20px', fontSize: '9px', marginRight: '8px' }}>SONG</span>
                    {topResult.artist}
                  </p>
                </div>
                <span className="fq-card-play" style={{ opacity: 1, transform: 'none' }}>
                  <Play size={16} fill="currentColor" style={{ marginLeft: '2px' }} />
                </span>
              </div>
            </section>

            {/* Quick songs */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 className="fq-kicker" style={{ color: 'var(--text-muted)' }}>Songs</h2>
              <div className="fq-table">
                {results.slice(0, 4).map((track, idx) => renderTrackItem(track, idx, results))}
              </div>
            </section>
          </div>

          {results.length > 4 && (
            <section className="fq-section">
              <div className="fq-section-head">
                <div className="fq-section-title-wrap">
                  <h2 className="fq-h3">More songs</h2>
                </div>
                <span className="fq-kicker">{results.length - 4} more</span>
              </div>
              <div className="fq-table">
                {results.slice(4).map((track, idx) => renderTrackItem(track, idx + 4, results))}
              </div>
            </section>
          )}
        </div>
      ) : results.length > 0 ? (
        <section className="fq-section">
          <div className="fq-section-head">
            <div className="fq-section-title-wrap">
              <h2 className="fq-h3">Songs</h2>
            </div>
            <span className="fq-kicker">{results.length}</span>
          </div>
          <div className="fq-table">
            {results.map((track, idx) => renderTrackItem(track, idx, results))}
          </div>
        </section>
      ) : hadQuery ? (
        <div style={{ padding: '56px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
          No tracks found for “{query}”.
        </div>
      ) : null}
    </div>
  );
};

export const SearchView = React.memo(SearchViewComponent);
