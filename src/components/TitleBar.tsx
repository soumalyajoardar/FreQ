import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import freqIcon from '../assets/freq-icon.png';

interface TitleBarProps {
  onSearchFocus?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Dynamic time-of-day greeting
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good afternoon');
    } else if (hour >= 17 && hour < 22) {
      setGreeting('Good evening');
    } else {
      setGreeting('Good night');
    }

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
    <div
      className="liquid-bar"
      style={{
        height: 'var(--titlebar-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px 0 16px',
        backgroundColor: 'rgba(9, 10, 15, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        ...( { WebkitAppRegion: 'drag' } as any ),
        zIndex: 9999,
        position: 'relative',
      }}
    >
      {/* FreQ Logo & Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img
          src={freqIcon}
          alt="FreQ"
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '8px',
            objectFit: 'cover',
            boxShadow: '0 0 12px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: '14px',
                letterSpacing: '0.6px',
                color: '#f8fafc',
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              FreQ
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '1px',
                padding: '3px 10px',
                borderRadius: '999px',
                backgroundColor: 'rgba(255, 255, 255, 0.10)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: '#fff',
                whiteSpace: 'nowrap',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.18)',
              }}
            >
              Desktop
            </span>
          </div>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '2px',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            BY GRESSEY
          </span>
        </div>
      </div>

      {/* Center Editorial Greeting */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          fontWeight: 500,
        }}
      >
        <span>{greeting} • Music for your day</span>
      </div>

      {/* Windows Window Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          ...( { WebkitAppRegion: 'no-drag' } as any ),
        }}
      >
        <button
          onClick={handleMinimize}
          title="Minimize"
          style={{
            width: '34px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Minus size={14} />
        </button>

        <button
          onClick={handleMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
          style={{
            width: '34px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          {isMaximized ? <Copy size={13} /> : <Square size={13} />}
        </button>

        <button
          onClick={handleClose}
          title="Close"
          style={{
            width: '34px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#ef4444';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
