import React, { useEffect, useState } from 'react';
import { Search, X, Play, Heart, PlusCircle, Clock, Music, Disc, User } from 'lucide-react';
import { MediaTrack } from '../types';
import { ytMusicService } from '../services/ytmusic';
import { formatTime } from '../components/PlayerBar';
import { SafeArtwork } from '../components/SafeArtwork';
import { SquareArt } from '../components/SquareArt';

interface SearchViewProps {
  onPlayTrack: (track: MediaTrack, queue?: MediaTrack[]) => void;
  onToggleLike: (track: MediaTrack) => void;
  isLiked: (trackId: string) => boolean;
  onOpenAddToPlaylist: (track: MediaTrack) => void;
  searchHistory: string[];
  onAddSearchHistory: (q: string) => void;
  onClearSearchHistory: () => void;
  initialQuery?: string;
}

export const SearchView: React.FC<SearchViewProps> = ({
  onPlayTrack,
  onToggleLike,
  isLiked,
  onOpenAddToPlaylist,
  searchHistory,
  onAddSearchHistory,
  onClearSearchHistory,
  initialQuery,
}) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState<MediaTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SONGS' | 'ARTISTS' | 'ALBUMS'>('ALL');

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

  const renderTrackItem = (track: MediaTrack, idx: number, trackList: MediaTrack[]) => (
    <div
      key={track.id}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderRadius: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'; }}
    >
      <div
        onClick={() => handlePlayFromSearch(track)}
        style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, cursor: 'pointer', overflow: 'hidden' }}
      >
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', width: '20px', textAlign: 'center' }}>
          {idx + 1}
        </span>

        <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, position: 'relative', backgroundColor: '#1b1e2e' }}>
          <SquareArt
            src={track.artworkUrl}
            videoId={track.id}
            alt={track.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
          >
            <Play size={16} fill="#fff" color="#fff" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {track.title}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {track.artist} • {track.album}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(track.durationSeconds)}
        </span>

        <button
          onClick={() => onToggleLike(track)}
          style={{
            color: isLiked(track.id) ? '#ec4899' : 'var(--text-muted)',
            padding: '6px',
          }}
        >
          <Heart size={16} fill={isLiked(track.id) ? '#ec4899' : 'transparent'} />
        </button>

        <button
          onClick={() => onOpenAddToPlaylist(track)}
          title="Add to playlist"
          style={{
            color: 'var(--text-muted)',
            padding: '6px',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-cyan)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <PlusCircle size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }} className="view-enter">
      {/* Search Input Bar */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '640px' }}>
        <div
          style={{
            position: 'absolute',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '36px',
            height: '36px',
            borderRadius: '11px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <Search size={18} strokeWidth={2.5} />
        </div>

        <input
          type="text"
          placeholder="Search songs, artists, albums, or lyrics..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              submitSearch(query);
            }
          }}
          autoFocus
          style={{
            width: '100%',
            height: '52px',
            padding: '0 48px 0 52px',
            borderRadius: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 500,
            backdropFilter: 'blur(20px)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--accent-cyan)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.25)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {(['ALL', 'SONGS', 'ARTISTS', 'ALBUMS'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            style={{
              padding: '6px 16px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: activeFilter === tab ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
              color: activeFilter === tab ? '#090A0F' : 'var(--text-secondary)',
              border: '1px solid ' + (activeFilter === tab ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.08)'),
              transition: 'all 0.15s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Recent Searches Pills (if query is empty) */}
      {!query && searchHistory.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Recent Searches
            </span>
            <button
              onClick={onClearSearchHistory}
              style={{ fontSize: '11px', color: 'var(--text-muted)' }}
            >
              Clear History
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {searchHistory.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleQuerySelect(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                }}
              >
                <Clock size={13} />
                <span>{item}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Content */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--text-muted)', gap: '10px' }}>
          <div style={{ width: '18px', height: '18px', border: '2px solid var(--accent-cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span>Searching in FreQ database...</span>
        </div>
      ) : activeFilter === 'ARTISTS' ? (
        uniqueArtists.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Artists ({uniqueArtists.length})
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
              {uniqueArtists.map((art, idx) => (
                <div
                  key={idx}
                  onClick={() => art.tracks.length > 0 && handlePlayCollectionFromSearch(art.tracks[0], art.tracks)}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'; }}
                >
                  <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#1b1e2e' }}>
                    {art.artworkUrl ? (
                      <SquareArt src={art.artworkUrl} alt={art.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={40} color="var(--text-muted)" style={{ margin: '30px auto' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{art.name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{art.tracks.length} songs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : query.trim() ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            No artists found for "{query}"
          </div>
        ) : null
      ) : activeFilter === 'ALBUMS' ? (
        uniqueAlbums.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Albums ({uniqueAlbums.length})
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
              {uniqueAlbums.map((alb, idx) => (
                <div
                  key={idx}
                  onClick={() => alb.tracks.length > 0 && handlePlayCollectionFromSearch(alb.tracks[0], alb.tracks)}
                  style={{
                    padding: '14px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'; }}
                >
                  <div style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#1b1e2e' }}>
                    {alb.artworkUrl ? (
                      <SquareArt src={alb.artworkUrl} alt={alb.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Disc size={40} color="var(--text-muted)" style={{ margin: '40px auto' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {alb.title}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{alb.artist}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : query.trim() ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            No albums found for "{query}"
          </div>
        ) : null
      ) : activeFilter === 'ALL' && topResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Result + Top Songs split layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '24px', alignItems: 'start' }}>
            {/* Top Result Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Top Result
              </span>
              <div
                onClick={() => handlePlayFromSearch(topResult)}
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ width: '88px', height: '88px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', position: 'relative', backgroundColor: '#1b1e2e' }}>
                  <SquareArt src={topResult.artworkUrl} videoId={topResult.id} alt={topResult.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {topResult.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.08)', marginRight: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)' }}>SONG</span>
                    {topResult.artist}
                  </p>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    right: '20px',
                    bottom: '20px',
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(255, 255, 255, 0.4)',
                  }}
                >
                  <Play size={20} fill="#090A0F" color="#090A0F" style={{ marginLeft: '2px' }} />
                </div>
              </div>
            </div>

            {/* Songs Quick List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Songs
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.slice(0, 4).map((track, idx) => renderTrackItem(track, idx, results))}
              </div>
            </div>
          </div>

          {/* Full Songs list under */}
          {results.length > 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                More Songs
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.slice(4).map((track, idx) => renderTrackItem(track, idx + 4, results))}
              </div>
            </div>
          )}
        </div>
      ) : results.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Songs ({results.length})
          </span>
          {results.map((track, idx) => renderTrackItem(track, idx, results))}
        </div>
      ) : query.trim() ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          No tracks found for "{query}"
        </div>
      ) : null}
    </div>
  );
};
