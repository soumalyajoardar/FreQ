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
        backgroundColor: 'rgba(5, 6, 10, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'freqFadeIn 0.25s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(460px, 92vw)',
          borderRadius: '24px',
          backgroundColor: 'rgba(18, 20, 31, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          animation: 'freqPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Link2 size={19} color="#fff" />
          </div>
          <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', flex: 1 }}>
            Import playlist link
          </h2>
          <button
            onClick={onClose}
            title="Close"
            style={{ color: 'var(--text-secondary)', padding: '6px', display: 'flex' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <X size={17} />
          </button>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
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
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            color: '#fff',
            padding: '11px 14px',
            fontSize: '13px',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <span style={{ fontSize: '12px', color: '#ef4444' }}>{error}</span>
        )}
        <button
          onClick={submit}
          disabled={busy || !url.trim()}
          style={{
            padding: '11px',
            borderRadius: '12px',
            backgroundColor: busy || !url.trim() ? 'rgba(255,255,255,0.10)' : '#f8fafc',
            color: busy || !url.trim() ? 'var(--text-muted)' : '#090A0F',
            fontSize: '14px',
            fontWeight: 800,
            cursor: busy || !url.trim() ? 'default' : 'pointer',
          }}
        >
          {busy ? 'Scraping songs…' : 'Import playlist'}
        </button>
      </div>
    </div>
  );
};
