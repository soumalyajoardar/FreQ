import React from 'react';
import { Sparkles, X, Check } from 'lucide-react';
import { ChangelogEntry } from '../data/changelog';
import { GlassModal } from './FreqDialogs';
import { useExitTransition } from './useExitTransition';

export const WhatsNewModal: React.FC<{
  isOpen: boolean;
  entries: ChangelogEntry[];
  onClose: () => void;
}> = ({ isOpen, entries, onClose }) => {
  const { visible, closing } = useExitTransition(isOpen, 180);
  if (!visible || entries.length === 0) return null;

  const newest = entries[0];

  return (
    <GlassModal onClose={onClose} maxWidth={520} closing={closing}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--accent-soft)',
            border: '1px solid var(--accent-glow)',
            color: 'var(--accent-cyan)',
          }}
        >
          <Sparkles size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 4,
            }}
          >
            Updated to v{newest.version}
          </p>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 23,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: '#fff',
              lineHeight: 1.2,
            }}
          >
            {newest.title}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="fq-icon-btn"
          aria-label="Close"
          style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }}
        >
          <X size={16} />
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          maxHeight: 'min(46vh, 360px)',
          overflowY: 'auto',
          paddingRight: 4,
        }}
      >
        {entries.map(entry => (
          <div key={entry.version} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {entries.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="fq-chip fq-chip-accent">v{entry.version}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.date}</span>
              </div>
            )}
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
              {entry.items.map(item => (
                <li
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 9,
                    fontSize: 12.5,
                    lineHeight: 1.55,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: 999,
                      flexShrink: 0,
                      marginTop: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--accent-soft)',
                      color: 'var(--accent-cyan)',
                    }}
                  >
                    <Check size={10} strokeWidth={3} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} className="fq-btn fq-btn-primary">
          Got it
        </button>
      </div>
    </GlassModal>
  );
};
