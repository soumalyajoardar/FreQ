import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Info, DownloadCloud } from 'lucide-react';
import { useExitTransition } from './useExitTransition';

export interface ToastItem {
  id: number;
  message: string;
  kind?: 'success' | 'info' | 'danger' | 'update';
  onClick?: () => void;
}

function backdropStyle(): React.CSSProperties {
  return {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(4, 6, 12, 0.72)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    zIndex: 9600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'freqFadeIn 0.18s ease',
  };
}

function panelStyle(maxWidth = 440): React.CSSProperties {
  return {
    width: `min(${maxWidth}px, calc(100vw - 48px))`,
    borderRadius: '20px',
    padding: '24px',
    backgroundColor: 'rgba(16, 18, 28, 0.88)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    animation: 'freqPopIn 0.22s cubic-bezier(0.16,1,0.3,1)',
  };
}

export const GlassModal: React.FC<{
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  closing?: boolean;
}> = ({ onClose, children, maxWidth, closing = false }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div style={backdropStyle()} onClick={onClose}>
      <div className="liquid-panel" style={{ ...panelStyle(maxWidth), animation: closing ? 'freqFadeScaleOut 0.18s ease' : 'freqPopIn 0.22s cubic-bezier(0.16,1,0.3,1)' }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export const CreatePlaylistDialog: React.FC<{
  isOpen: boolean;
  initialTitle?: string;
  initialDescription?: string;
  mode?: 'create' | 'rename';
  onClose: () => void;
  onSubmit: (title: string, description: string) => void;
}> = ({ isOpen, initialTitle = '', initialDescription = '', mode = 'create', onClose, onSubmit }) => {
  const { visible, closing } = useExitTransition(isOpen, 180);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setDescription(initialDescription);
    }
  }, [isOpen, initialTitle, initialDescription]);
  if (!visible) return null;
  const valid = title.trim().length > 0;
  return (
    <GlassModal onClose={onClose} closing={closing}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
          {mode === 'rename' ? 'Rename Playlist' : 'New Playlist'}
        </h3>
        <button onClick={onClose} style={{ color: 'var(--text-secondary)', padding: 4 }}>
          <X size={18} />
        </button>
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!valid) return;
          onSubmit(title.trim(), description.trim());
          onClose();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Playlist title…"
          maxLength={60}
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.35)',
            color: '#fff',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)…"
          maxLength={140}
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid}
            style={{
              padding: '10px 22px', borderRadius: 999,
              backgroundColor: valid ? '#f8fafc' : 'rgba(255,255,255,0.08)',
              color: valid ? '#090A0F' : 'var(--text-muted)',
              fontWeight: 800, fontSize: 13,
              boxShadow: valid ? '0 0 18px rgba(255,255,255,0.35)' : 'none',
              cursor: valid ? 'pointer' : 'default',
            }}
          >
            {mode === 'rename' ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </GlassModal>
  );
};

export const ConfirmDialog: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ isOpen, title, message, confirmLabel = 'Delete', danger = true, onCancel, onConfirm }) => {
  const { visible: confirmVisible, closing: confirmClosing } = useExitTransition(isOpen, 180);
  if (!confirmVisible) return null;
  return (
    <GlassModal onClose={onCancel} maxWidth={400} closing={confirmClosing}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: danger ? 'rgba(239,68,68,0.14)' : 'rgba(255,255,255,0.12)',
          border: danger ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={18} color={danger ? '#ef4444' : 'var(--accent-cyan)'} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{title}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13,
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => { onConfirm(); onCancel(); }}
          style={{
            padding: '10px 20px', borderRadius: 999,
            backgroundColor: danger ? '#ef4444' : '#f8fafc',
            color: danger ? '#fff' : '#090A0F', fontWeight: 800, fontSize: 13,
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </GlassModal>
  );
};

export const ToastStack: React.FC<{ toasts: ToastItem[] }> = ({ toasts }) => {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 'calc(var(--playerbar-height) + 18px)', left: '50%',
      transform: 'translateX(-50%)', zIndex: 9900,
      display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const isUpdate = t.kind === 'update';
        return (
        <div
          key={t.id}
          onClick={t.onClick}
          role={t.onClick ? 'button' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 999,
            background: isUpdate ? 'rgba(8, 32, 52, 0.94)' : 'rgba(14,16,26,0.92)',
            border: t.kind === 'danger'
              ? '1px solid rgba(239,68,68,0.4)'
              : isUpdate
                ? '1px solid rgba(56,189,248,0.55)'
                : '1px solid rgba(255,255,255,0.30)',
            boxShadow: isUpdate
              ? '0 12px 32px rgba(0,0,0,0.5), 0 0 18px rgba(56,189,248,0.22)'
              : '0 12px 32px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(16px)',
            fontSize: 13, fontWeight: 600, color: '#fff',
            animation: 'freqPopIn 0.22s cubic-bezier(0.16,1,0.3,1)',
            maxWidth: 'min(520px, 90vw)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            pointerEvents: t.onClick ? 'auto' : 'none',
            cursor: t.onClick ? 'pointer' : 'default',
          }}
        >
          {t.kind === 'danger'
            ? <AlertTriangle size={15} color="#ef4444" />
            : isUpdate
              ? <DownloadCloud size={15} color="#38bdf8" />
              : t.kind === 'success'
                ? <CheckCircle2 size={15} color="#10b981" />
                : <Info size={15} color="var(--accent-cyan)" />}
          <span>{t.message}</span>
          {isUpdate && (
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.6px',
              color: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.14)',
              padding: '2px 7px', borderRadius: 999, flexShrink: 0,
            }}>
              UPDATE
            </span>
          )}
        </div>
        );
      })}
    </div>
  );
};
