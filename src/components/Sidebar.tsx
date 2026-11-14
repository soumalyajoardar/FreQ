import React from 'react';
import { Home, Library, Search, Heart, Plus, Settings, Sparkles, Music2, BarChart3, Radio } from 'lucide-react';
import { AudioMode, UserPlaylist } from '../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
  audioMode: AudioMode;
  onAudioModeChange: (mode: AudioMode) => void;
  playlists: UserPlaylist[];
  likedCount: number;
  onCreatePlaylist: () => void;
  hasUpdate?: boolean;
  onOpenParty?: () => void;
  isInParty?: boolean;
  partyMembersCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  audioMode,
  onAudioModeChange,
  playlists,
  likedCount,
  onCreatePlaylist,
  hasUpdate,
  onOpenParty,
  isInParty,
  partyMembersCount = 0,
}) => {
  return (
    <aside
      style={{
        width: 'var(--sidebar-width, 250px)',
        height: '100%',
        backgroundColor: 'rgba(10, 12, 18, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 12px',
        gap: '18px',
        overflowY: 'auto',
        userSelect: 'none',
      }}
    >
      {/* Primary Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'search', label: 'Search', icon: Search },
          { id: 'library', label: 'Your Library', icon: Library },
          { id: 'stats', label: 'Insights & Stats', icon: BarChart3 },
        ].map(item => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#f0f2f5' : 'var(--text-secondary, #8b93a6)',
                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent-cyan, #1ed760)' : '3px solid transparent',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = '#f0f2f5';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary, #8b93a6)';
                }
              }}
            >
              <Icon size={17} color={isActive ? 'var(--accent-cyan, #1ed760)' : 'currentColor'} strokeWidth={isActive ? 2.3 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Listen Together Party Entry */}
        {onOpenParty && (
          <button
            onClick={onOpenParty}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: isInParty ? 700 : 500,
              color: isInParty ? '#1ed760' : 'var(--text-secondary, #8b93a6)',
              backgroundColor: isInParty ? 'rgba(30, 215, 96, 0.12)' : 'transparent',
              border: isInParty ? '1px solid rgba(30, 215, 96, 0.3)' : '1px solid transparent',
              transition: 'background-color 0.15s ease, color 0.15s ease',
              marginTop: '4px',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              if (!isInParty) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.color = '#f0f2f5';
              }
            }}
            onMouseLeave={e => {
              if (!isInParty) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary, #8b93a6)';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Radio size={17} color={isInParty ? '#1ed760' : 'currentColor'} strokeWidth={isInParty ? 2.4 : 1.8} />
              <span>Listen Together</span>
            </div>
            {isInParty ? (
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  backgroundColor: '#1ed760',
                  color: '#000',
                  fontWeight: 800,
                }}
              >
                {partyMembersCount}/5
              </span>
            ) : (
              <span
                style={{
                  fontSize: '9px',
                  padding: '2px 5px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  letterSpacing: '0.4px',
                }}
              >
                PARTY
              </span>
            )}
          </button>
        )}
      </nav>

      {/* Audio Flavors Switcher Card */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '10px 10px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', paddingLeft: '2px' }}>
          <Sparkles size={13} color="var(--accent-cyan, #1ed760)" />
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-muted, #5c6478)', textTransform: 'uppercase' }}>
            Audio Flavor
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
          {[
            { id: 'SNR' as AudioMode, label: 'SnR', title: 'SnR: Slowed + Lush Reverb', activeBg: 'var(--accent-violet, #8b5cf6)', glow: 'rgba(139, 92, 246, 0.35)' },
            { id: 'NORMAL' as AudioMode, label: 'Normal', title: 'Normal: Pure 1.0x studio sound', activeBg: 'var(--accent-cyan, #1ed760)', glow: 'rgba(30, 215, 96, 0.35)' },
            { id: 'NIGHTCORE' as AudioMode, label: 'Nightcore', title: 'Nightcore: 1.2x Up-tempo', activeBg: 'var(--accent-pink, #ec4899)', glow: 'rgba(236, 72, 153, 0.35)' },
          ].map(f => {
            const active = audioMode === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onAudioModeChange(f.id)}
                title={f.title}
                style={{
                  padding: '5px 2px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: active ? f.activeBg : 'rgba(255, 255, 255, 0.04)',
                  color: active ? '#fff' : 'var(--text-secondary, #8b93a6)',
                  boxShadow: active ? `0 2px 8px ${f.glow}` : 'none',
                  transition: 'background-color 0.15s ease, color 0.15s ease, transform 0.1s ease',
                  textAlign: 'center',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Playlists & Collections */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '6px', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 4px 4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-muted, #5c6478)', textTransform: 'uppercase' }}>
            Playlists
          </span>
          <button
            onClick={onCreatePlaylist}
            title="Create New Playlist"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary, #8b93a6)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = 'var(--text-secondary, #8b93a6)';
            }}
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Liked Songs Tile */}
        <button
          onClick={() => onNavigate('liked')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: '8px',
            background: currentView === 'liked' ? 'rgba(236, 72, 153, 0.14)' : 'rgba(255, 255, 255, 0.02)',
            border: currentView === 'liked' ? '1px solid rgba(236, 72, 153, 0.3)' : '1px solid transparent',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={e => {
            if (currentView !== 'liked') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={e => {
            if (currentView !== 'liked') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(236, 72, 153, 0.3)',
            }}
          >
            <Heart size={14} color="#fff" fill="#fff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden', minWidth: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f0f2f5', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%' }}>Liked Songs</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted, #5c6478)' }}>{likedCount} tracks</span>
          </div>
        </button>

        {/* User Created Playlists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', flex: 1, marginTop: '4px' }}>
          {playlists.map(pl => {
            const isPlActive = currentView === 'playlist' && pl.id === pl.id;
            return (
              <button
                key={pl.id}
                onClick={() => onNavigate('playlist', pl.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: '7px 9px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  color: 'var(--text-secondary, #8b93a6)',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#f0f2f5';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary, #8b93a6)';
                }}
              >
                <Music2 size={13} style={{ flexShrink: 0, opacity: 0.7 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Bottom Link */}
      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px' }}>
        <button
          onClick={() => onNavigate('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: '8px',
            fontSize: '12.5px',
            width: '100%',
            fontWeight: currentView === 'settings' ? 600 : 500,
            color: currentView === 'settings' ? '#f0f2f5' : 'var(--text-secondary, #8b93a6)',
            backgroundColor: currentView === 'settings' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            transition: 'background-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#f0f2f5';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={e => {
            if (currentView !== 'settings') {
              e.currentTarget.style.color = 'var(--text-secondary, #8b93a6)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Settings size={15} />
          <span>Settings</span>
          {hasUpdate && (
            <span
              title="Update available"
              style={{
                marginLeft: 'auto',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.7)',
                flexShrink: 0,
              }}
            />
          )}
        </button>
      </div>
    </aside>
  );
};
