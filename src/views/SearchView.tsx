import React, { useEffect, useState } from 'react';
import { Search, X, Play, Heart, PlusCircle, Clock } from 'lucide-react';
import { MediaTrack } from '../types';
import { ytMusicService } from '../services/ytmusic';
import { formatTime } from '../components/PlayerBar';

interface SearchViewProps {
  onPlayTrack: (track: MediaTrack, queue?: MediaTrack[]) => void;
  onToggleLike: (track: MediaTrack) => void;
  isLiked: (trackId: string) => boolean;
  onOpenAddToPlaylist: (track: MediaTrack) => void;
  searchHistory: string[];
  onAddSearchHistory: (q: string) => void;
  onClearSearchHistory: () => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  onPlayTrack,
  onToggleLike,
  isLiked,
  onOpenAddToPlaylist,
  searchHistory,
  onAddSearchHistory,
  onClearSearchHistory,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SONGS' | 'ARTISTS' | 'ALBUMS'>('ALL');

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(() => {
      ytMusicService.search(trimmed).then(res => {
        setResults(res);
        setIsLoading(false);
        onAddSearchHistory(trimmed);
      });
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleQuerySelect = (item: string) => {
    setQuery(item);
  };

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Search Input Bar */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '640px' }}>
        <div
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search size={20} />
        </div>

        <input
          type="text"
          placeholder="Search songs, artists, albums, or lyrics..."
          value={query}
          onChange={e => setQuery(e.target.value)}
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
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.25)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        {query && (
          <button
            onClick={() => setQuery('')}
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

      {/* Results List */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <span>Searching YouTube Music...</span>
        </div>
      ) : results.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Results ({results.length})
          </span>

          {results.map((track, idx) => (
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
                onClick={() => onPlayTrack(track, results)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, cursor: 'pointer', overflow: 'hidden' }}
              >
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', width: '20px', textAlign: 'center' }}>
                  {idx + 1}
                </span>

                <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                  <img
                    src={track.artworkUrl || ''}
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
          ))}
        </div>
      ) : query.trim().length >= 2 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          No tracks found for "{query}"
        </div>
      ) : null}
    </div>
  );
};
