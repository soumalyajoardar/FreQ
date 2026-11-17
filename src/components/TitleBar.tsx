import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isWindowMaximized().then(setIsMaximized);
      const unsubscribe = window.electronAPI.onWindowMaximizedChange(setIsMaximized);
      return unsubscribe;
    }
  }, []);

  const handleMinimize = () => window.electronAPI?.minimizeWindow();
  const handleMaximize = () => window.electronAPI?.maximizeWindow().then(setIsMaximized);
  const handleClose = () => window.electronAPI?.closeWindow();

  return (
    <header
      onDoubleClick={() => handleMaximize()}
      style={{
        height: 'var(--titlebar-height, 34px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px 0 18px',
        flexShrink: 0,
        backgroundColor: 'rgba(5, 5, 8, 0.72)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.045)',
        ...({ WebkitAppRegion: 'drag' } as any),
        zIndex: 9999,
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 820, letterSpacing: '-0.05em', color: '#f3f3f5' }}>
            FreQ
          </span>
          <span style={{ fontSize: '15px', lineHeight: '10px', color: 'var(--accent-cyan)', transform: 'translateY(-1px)' }}>
            .
          </span>
        </span>

        <span style={{ width: '1px', height: '11px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

        <span
          style={{
            fontSize: '9.5px',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-muted, #63636f)',
            whiteSpace: 'nowrap',
          }}
        >
          Desktop · v2.2.0
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1px',
          ...({ WebkitAppRegion: 'no-drag' } as any),
        }}
      >
        {[
          { key: 'min', title: 'Minimize', icon: <Minus size={12} />, action: handleMinimize, danger: false },
          { key: 'max', title: isMaximized ? 'Restore' : 'Maximize', icon: isMaximized ? <Copy size={11} /> : <Square size={11} />, action: handleMaximize, danger: false },
          { key: 'close', title: 'Close', icon: <X size={13} />, action: handleClose, danger: true },
        ].map(({ key, title, icon, action, danger }) => (
          <button
            key={key}
            onClick={e => { e.stopPropagation(); action(); }}
            title={title}
            style={{
              width: '34px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              color: 'var(--text-muted, #63636f)',
              transition: 'background-color 0.14s ease, color 0.14s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = danger ? '#e11d48' : 'rgba(255, 255, 255, 0.07)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted, #63636f)';
            }}
          >
            {icon}
          </button>
        ))}
      </div>
    </header>
  );
};
