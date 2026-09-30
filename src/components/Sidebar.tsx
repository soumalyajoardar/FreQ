import React from 'react';
import { Home, Search, Library, Heart, Plus, Settings, Sparkles, Music } from 'lucide-react';
import { AudioMode, UserPlaylist } from '../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
  audioMode: AudioMode;
  onAudioModeChange: (mode: AudioMode) => void;
  playlists: UserPlaylist[];
  likedCount: number;
  onCreatePlaylist: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  audioMode,
  onAudioModeChange,
  playlists,
  likedCount,
  onCreatePlaylist,
}) => {
  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        height: '100%',
        backgroundColor: 'rgba(14, 16, 24, 0.75)',
        backdropFilter: 'blur(28px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 14px',
        gap: '24px',
        overflowY: 'auto',
      }}
    >
      {/* Primary Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={() => onNavigate('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: currentView === 'home' ? 700 : 500,
            color: currentView === 'home' ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: currentView === 'home' ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
            border: currentView === 'home' ? '1px solid rgba(0, 229, 255, 0.25)' : '1px solid transparent',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => {
            if (currentView !== 'home') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={e => {
            if (currentView !== 'home') e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Home size={18} color={currentView === 'home' ? 'var(--accent-cyan)' : 'currentColor'} />
          <span>Home</span>
        </button>

        <button
          onClick={() => onNavigate('search')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: currentView === 'search' ? 700 : 500,
            color: currentView === 'search' ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: currentView === 'search' ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
            border: currentView === 'search' ? '1px solid rgba(0, 229, 255, 0.25)' : '1px solid transparent',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => {
            if (currentView !== 'search') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={e => {
            if (currentView !== 'search') e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Search size={18} color={currentView === 'search' ? 'var(--accent-cyan)' : 'currentColor'} />
          <span>Search</span>
        </button>

        <button
          onClick={() => onNavigate('library')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: currentView === 'library' ? 700 : 500,
            color: currentView === 'library' ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: currentView === 'library' ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
            border: currentView === 'library' ? '1px solid rgba(0, 229, 255, 0.25)' : '1px solid transparent',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => {
            if (currentView !== 'library') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={e => {
            if (currentView !== 'library') e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Library size={18} color={currentView === 'library' ? 'var(--accent-cyan)' : 'currentColor'} />
          <span>Library</span>
        </button>
      </nav>

      {/* Audio Flavors Switcher Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(27, 30, 46, 0.6) 0%, rgba(18, 20, 31, 0.8) 100%)',
          borderRadius: '16px',
          padding: '12px',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <Sparkles size={14} color="var(--accent-cyan)" />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Audio Flavor
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
          <button
            onClick={() => onAudioModeChange('NORMAL')}
            title="Normal: 1.0x standard fidelity"
            style={{
              padding: '6px 4px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: audioMode === 'NORMAL' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
              color: audioMode === 'NORMAL' ? '#090A0F' : 'var(--text-secondary)',
              boxShadow: audioMode === 'NORMAL' ? '0 0 10px rgba(0, 229, 255, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Normal
          </button>
          <button
            onClick={() => onAudioModeChange('SNR')}
            title="SnR: 0.8x Slowed + Lush Procedural Reverb"
            style={{
              padding: '6px 4px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: audioMode === 'SNR' ? 'var(--accent-violet)' : 'rgba(255, 255, 255, 0.05)',
              color: audioMode === 'SNR' ? '#fff' : 'var(--text-secondary)',
              boxShadow: audioMode === 'SNR' ? '0 0 10px rgba(139, 92, 246, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            SnR
          </button>
          <button
            onClick={() => onAudioModeChange('NIGHTCORE')}
            title="Nightcore: 1.2x Sped Up + High Pitch"
            style={{
              padding: '6px 4px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: audioMode === 'NIGHTCORE' ? 'var(--accent-pink)' : 'rgba(255, 255, 255, 0.05)',
              color: audioMode === 'NIGHTCORE' ? '#fff' : 'var(--text-secondary)',
              boxShadow: audioMode === 'NIGHTCORE' ? '0 0 10px rgba(236, 72, 153, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Nightcore
          </button>
        </div>
      </div>

      {/* Playlists & Collections */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '10px', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Collections
          </span>
          <button
            onClick={onCreatePlaylist}
            title="Create New Playlist"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 229, 255, 0.2)';
              e.currentTarget.style.color = 'var(--accent-cyan)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Liked Songs Tile */}
        <button
          onClick={() => onNavigate('liked')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '12px',
            background: currentView === 'liked' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            border: currentView === 'liked' ? '1px solid rgba(236, 72, 153, 0.35)' : '1px solid rgba(255, 255, 255, 0.05)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            if (currentView !== 'liked') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
          }}
          onMouseLeave={e => {
            if (currentView !== 'liked') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(236, 72, 153, 0.4)',
              flexShrink: 0,
            }}
          >
            <Heart size={16} color="#fff" fill="#fff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Liked Songs</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{likedCount} tracks</span>
          </div>
        </button>

        {/* User Created Playlists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1 }}>
          {playlists.map(pl => (
            <button
              key={pl.id}
              onClick={() => onNavigate('playlist', pl.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: '8px',
                fontSize: '13px',
                color: currentView === `playlist_${pl.id}` ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                backgroundColor: currentView === `playlist_${pl.id}` ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                textAlign: 'left',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (currentView !== `playlist_${pl.id}`) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
              }}
              onMouseLeave={e => {
                if (currentView !== `playlist_${pl.id}`) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Music size={14} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Bottom Link */}
      <button
        onClick={() => onNavigate('settings')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '13px',
          color: currentView === 'settings' ? 'var(--text-primary)' : 'var(--text-muted)',
          backgroundColor: currentView === 'settings' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        }}
        onMouseLeave={e => {
          if (currentView !== 'settings') {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <Settings size={16} />
        <span>Settings</span>
      </button>
    </aside>
  );
};
