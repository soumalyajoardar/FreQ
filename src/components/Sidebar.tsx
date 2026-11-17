import React, { useState } from 'react';
import {
  Home,
  Library,
  Search,
  Heart,
  Plus,
  Settings,
  Music2,
  BarChart3,
  Radio,
  DownloadCloud,
  Sparkles,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { AudioMode, UserPlaylist } from '../types';
import freqIcon from '../assets/freq-icon.png';

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

const COLLAPSE_KEY = 'freq_sidebar_collapsed';

const FLAVORS: { id: AudioMode; label: string; short: string; title: string }[] = [
  { id: 'SNR', label: 'SnR', short: 'S', title: 'SnR — slowed with lush reverb' },
  { id: 'NORMAL', label: 'Normal', short: 'N', title: 'Normal — pure 1.0× studio sound' },
  { id: 'NIGHTCORE', label: 'Nightcore', short: 'NC', title: 'Nightcore — 1.2× up-tempo' },
];

const SidebarComponent: React.FC<SidebarProps> = ({
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
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Your Library', icon: Library },
    { id: 'stats', label: 'Insights', icon: BarChart3 },
  ];

  return (
    <aside className={`fq-sidebar${collapsed ? ' is-collapsed' : ''}`}>
      {/* Brand + collapse */}
      <div className="fq-sidebar-brand">
        <button
          onClick={() => onNavigate('home')}
          className="fq-sidebar-mark"
          title="FreQ — Home"
          style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}
        >
          <img
            src={freqIcon}
            alt=""
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '7px',
              objectFit: 'cover',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.45)',
              flexShrink: 0,
            }}
          />
          <span className="fq-sidebar-wordmark">
            FreQ<em>.</em>
          </span>
        </button>

        <button
          onClick={toggleCollapsed}
          className="fq-sidebar-collapse fq-icon-btn"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ width: '26px', height: '26px', borderRadius: '7px' }}
        >
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </button>
      </div>

      {/* Primary navigation */}
      <nav className="fq-nav-group">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`fq-nav${active ? ' is-active' : ''}`}
              title={item.label}
            >
              <Icon size={17} strokeWidth={active ? 2.2 : 1.7} />
              <span className="fq-label">{item.label}</span>
            </button>
          );
        })}

        {onOpenParty && (
          <button
            onClick={onOpenParty}
            className={`fq-nav${currentView === 'party' ? ' is-active' : ''}${isInParty ? ' is-party' : ''}`}
            title={isInParty ? `Listen Together — ${partyMembersCount}/5 listeners` : 'Listen Together'}
          >
            <Radio size={17} strokeWidth={isInParty ? 2.2 : 1.7} />
            <span className="fq-label">Listen Together</span>
            {isInParty ? (
              <span
                className="fq-count"
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '999px',
                  backgroundColor: 'var(--accent-cyan)',
                  color: 'var(--accent-ink)',
                }}
              >
                {partyMembersCount}/5
              </span>
            ) : (
              <span
                className="fq-count"
                style={{
                  fontSize: '8.5px',
                  fontWeight: 700,
                  letterSpacing: '0.09em',
                  padding: '2px 5px',
                  borderRadius: '5px',
                  border: '1px solid rgba(30, 215, 96, 0.28)',
                  color: 'rgba(30, 215, 96, 0.85)',
                }}
              >
                PARTY
              </span>
            )}
          </button>
        )}
      </nav>

      {/* Audio flavor */}
      <div className="fq-sidebar-section">
        <div className="fq-sidebar-section-head">
          <span className="fq-kicker" style={{ fontSize: '9px' }}>Audio flavor</span>
          <Sparkles size={11} color="var(--text-muted)" />
        </div>
        <div className="fq-flavor">
          {FLAVORS.map(f => (
            <button
              key={f.id}
              onClick={() => onAudioModeChange(f.id)}
              className={`fq-flavor-btn${audioMode === f.id ? ' is-active' : ''}`}
              title={f.title}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Collapsed flavor control */}
      <div className="fq-sidebar-flavor-mini">
        {FLAVORS.map(f => (
          <button
            key={f.id}
            onClick={() => onAudioModeChange(f.id)}
            className={audioMode === f.id ? 'is-active' : ''}
            title={f.title}
          >
            {f.short}
          </button>
        ))}
      </div>

      {/* Library */}
      <div className="fq-sidebar-section" style={{ flex: 1, minHeight: 0 }}>
        <div className="fq-sidebar-section-head">
          <span className="fq-kicker" style={{ fontSize: '9px' }}>Your library</span>
          <button
            onClick={onCreatePlaylist}
            title="New playlist"
            className="fq-icon-btn"
            style={{ width: '22px', height: '22px', borderRadius: '6px' }}
          >
            <Plus size={13} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', overflowY: 'auto', minHeight: 0 }}>
          <button
            onClick={() => onNavigate('liked')}
            className={`fq-playlist-row${currentView === 'liked' ? ' is-active' : ''}`}
            style={{ height: '38px' }}
          >
            <span
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '7px',
                background: 'rgba(30, 215, 96, 0.14)',
                border: '1px solid rgba(30, 215, 96, 0.34)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Heart size={12} color="var(--accent-cyan)" fill="var(--accent-cyan)" />
            </span>
            <span className="fq-playlist-name">Liked Songs</span>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {likedCount}
            </span>
          </button>

          {playlists.map(pl => (
            <button
              key={pl.id}
              onClick={() => onNavigate('playlist', pl.id)}
              className={`fq-playlist-row${
                currentView === 'playlist' && pl.id ? ' is-active' : ''
              }`}
              title={pl.title}
            >
              <Music2 size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
              <span className="fq-playlist-name">{pl.title}</span>
            </button>
          ))}

          {playlists.length === 0 && (
            <button
              onClick={onCreatePlaylist}
              className="fq-playlist-row"
              style={{ color: 'var(--text-muted)', fontSize: '12px' }}
            >
              <Plus size={13} style={{ flexShrink: 0 }} />
              <span className="fq-playlist-name">Create your first playlist</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="fq-sidebar-foot">
        <button
          onClick={() => onNavigate('settings')}
          className={`fq-nav${currentView === 'settings' ? ' is-active' : ''}`}
          title="Settings"
          style={{ height: '34px' }}
        >
          <Settings size={15} />
          <span className="fq-label">Settings</span>
          {hasUpdate && (
            <span
              title="Update available"
              style={{
                marginLeft: 'auto',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(56, 189, 248, 0.16)',
                border: '1px solid rgba(56, 189, 248, 0.5)',
                animation: 'updateBadgePulse 2s ease-in-out infinite',
                flexShrink: 0,
              }}
            >
              <DownloadCloud size={11} color="#38bdf8" />
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

export const Sidebar = React.memo(SidebarComponent);
