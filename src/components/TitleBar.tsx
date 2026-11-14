import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import freqIcon from '../assets/freq-icon.png';

interface TitleBarProps {
  onSearchFocus?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isWindowMaximized().then(setIsMaximized);
      const unsubscribe = window.electronAPI.onWindowMaximizedChange(setIsMaximized);
      return unsubscribe;
    }
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow().then(setIsMaximized);
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <header
      className="liquid-bar"
      style={{
        height: 'var(--titlebar-height, 38px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px 0 16px',
        backgroundColor: 'rgba(7, 8, 12, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        ...( { WebkitAppRegion: 'drag' } as any ),
        zIndex: 9999,
        position: 'relative',
      }}
    >
      {/* FreQ Logo & Brand Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <img
          src={freqIcon}
          alt="FreQ"
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '6px',
            objectFit: 'cover',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '0.4px',
              color: '#f0f2f5',
              fontFamily: 'Inter, -apple-system, sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            FreQ
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--text-muted, #5c6478)',
              letterSpacing: '0.5px',
            }}
          >
            Desktop • v2.1.0 (Stable)
          </span>
        </div>
      </div>

      {/* Windows Window Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          ...( { WebkitAppRegion: 'no-drag' } as any ),
        }}
      >
        <button
          onClick={handleMinimize}
          title="Minimize"
          style={{
            width: '36px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            color: 'var(--text-secondary, #8b93a6)',
            transition: 'background-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary, #8b93a6)';
          }}
        >
          <Minus size={13} />
        </button>

        <button
          onClick={handleMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
          style={{
            width: '36px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            color: 'var(--text-secondary, #8b93a6)',
            transition: 'background-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary, #8b93a6)';
          }}
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>

        <button
          onClick={handleClose}
          title="Close"
          style={{
            width: '36px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            color: 'var(--text-secondary, #8b93a6)',
            transition: 'background-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#e11d48';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary, #8b93a6)';
          }}
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
};
