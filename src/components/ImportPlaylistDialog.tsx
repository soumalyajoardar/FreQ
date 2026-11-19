import React, { useState } from 'react';
import { Link2, X } from 'lucide-react';

interface ImportPlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (url: string) => Promise<{ title: string; count: number } | null>;
}

// Paste-a-link playlist import: scrapes the songs into a new playlist
// named after the source playlist.
export const ImportPlaylistDialog: React.FC<ImportPlaylistDialogProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const submit = async () => {
    const trimmed = url.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await onImport(trimmed);
      if (!res) {
        setError('No songs found in that link.');
        return;
      }
      setUrl('');
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Import failed — check the link.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(3, 3, 6, 0.74)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        animation: 'freqFadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(460px, calc(100vw - 48px))',
          borderRadius: '20px',
          backgroundColor: 'rgba(14, 14, 19, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.11)',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'freqPopIn 0.26s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.045)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Link2 size={16} color="var(--text-secondary)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
            <span className="fq-kicker" style={{ fontSize: '9px' }}>Library</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '25px', fontWeight: 400, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1 }}>
              Import a playlist
            </h2>
          </div>
          <button
            onClick={onClose}
            title="Close"
            className="fq-icon-btn"
            style={{ width: '28px', height: '28px', borderRadius: '8px' }}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Paste a YouTube or YouTube Music playlist link. FreQ scrapes the songs into a new playlist with the same name.
        </p>

        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="https://music.youtube.com/playlist?list=…"
          spellCheck={false}
          autoFocus
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--line-strong)',
            borderRadius: '12px',
            color: '#fff',
            height: '44px',
            padding: '0 14px',
            fontSize: '12.5px',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb), 0.4)';
            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(var(--accent-rgb), 0.07)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--line-strong)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        {error && (
          <span style={{ fontSize: '12px', color: '#f87171' }}>{error}</span>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="fq-btn" onClick={onClose}>Cancel</button>
          <button
            onClick={submit}
            disabled={busy || !url.trim()}
            className={`fq-btn${busy || !url.trim() ? '' : ' fq-btn-primary'}`}
            style={{ opacity: busy || !url.trim() ? 0.55 : 1 }}
          >
            {busy ? 'Scraping songs…' : 'Import playlist'}
          </button>
        </div>
      </div>
    </div>
  );
};
