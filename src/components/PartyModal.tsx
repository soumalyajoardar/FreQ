import React, { useState, useEffect } from 'react';
import {
  Users,
  Radio,
  Crown,
  Copy,
  Check,
  LogOut,
  UserMinus,
  Music,
  X,
  Sparkles,
  Volume2,
  Globe,
  Lock,
} from 'lucide-react';
import { partyService, PartyMember, PartyPrivacy, PartyReaction } from '../services/partyService';
import { MediaTrack } from '../types';

interface PartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: MediaTrack | null;
  isPlaying: boolean;
  position: number;
  duration: number;
}

const QUICK_EMOJIS = ['🔥', '❤️', '🎵', '👏', '⚡'];

export const PartyModal: React.FC<PartyModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  position,
  duration,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [inputCode, setInputCode] = useState('');
  const [displayName, setDisplayName] = useState(() => partyService.getMyName());
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [members, setMembers] = useState<PartyMember[]>(() => partyService.getMembers());
  const [partyCode, setPartyCode] = useState<string | null>(() => partyService.getPartyCode());
  const [isHost, setIsHost] = useState<boolean>(() => partyService.getIsHost());
  const [isInParty, setIsInParty] = useState<boolean>(() => partyService.isInParty());
  const [privacy, setPrivacy] = useState<PartyPrivacy>(() => partyService.getPrivacy());
  const [recentReactions, setRecentReactions] = useState<PartyReaction[]>([]);

  // Sync state from partyService
  useEffect(() => {
    const unsubState = partyService.subscribe(() => {
      setMembers(partyService.getMembers());
      setPartyCode(partyService.getPartyCode());
      setIsHost(partyService.getIsHost());
      setIsInParty(partyService.isInParty());
      setPrivacy(partyService.getPrivacy());
      setErrorMsg(partyService.getErrorMessage());
    });

    const unsubSync = partyService.onSyncEvent(ev => {
      if (ev.type === 'reaction' && ev.reaction) {
        const rx = ev.reaction;
        setRecentReactions(prev => [...prev.slice(-4), rx]);
        setTimeout(() => {
          setRecentReactions(prev => prev.filter(r => r.id !== rx.id));
        }, 3000);
      }
    });

    return () => {
      unsubState();
      unsubSync();
    };
  }, []);

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplayName(val);
    partyService.setMyName(val);
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await partyService.createParty(currentTrack, isPlaying, position);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create party.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputCode.trim().length !== 4) {
      setErrorMsg('Please enter a 4-digit code.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await partyService.joinParty(inputCode.trim());
      setInputCode('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to join party.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (!partyCode) return;
    navigator.clipboard.writeText(partyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    partyService.leaveParty();
    setErrorMsg(null);
  };

  const handlePrivacyChange = (next: PartyPrivacy) => {
    if (!isHost) return;
    // Only mirror the choice when the room actually accepted it.
    if (partyService.setPrivacy(next)) setPrivacy(next);
  };

  const handleKick = (id: string) => {
    partyService.kickMember(id);
  };

  const handleSendReaction = (emoji: string) => {
    partyService.sendReaction(emoji);
  };

  const myId = partyService.getMyMemberId();

  const fieldStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
    border: '1px solid var(--line-strong)',
    borderRadius: '11px',
    padding: '0 13px',
    height: '42px',
    fontSize: '13px',
    color: '#fff',
    outline: 'none',
    fontWeight: 500,
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(3, 3, 6, 0.76)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        padding: '20px',
        animation: 'freqFadeIn 0.16s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '540px',
          maxHeight: 'calc(100vh - 60px)',
          backgroundColor: 'rgba(14, 14, 19, 0.97)',
          borderRadius: '22px',
          border: '1px solid rgba(255, 255, 255, 0.11)',
          boxShadow: '0 34px 90px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'freqPopIn 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 22px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                border: '1px solid rgba(var(--accent-rgb), 0.3)',
                backgroundColor: 'rgba(var(--accent-rgb), 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
                flexShrink: 0,
              }}
            >
              <Radio size={17} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <span className="fq-kicker" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Listen together</span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
                Party room
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close"
            className="fq-icon-btn"
            style={{ width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Floating reactions overlay */}
        {recentReactions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '74px',
              right: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            {recentReactions.map(r => (
              <div
                key={r.id}
                style={{
                  padding: '6px 11px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(12, 12, 17, 0.95)',
                  border: '1px solid var(--line-strong)',
                  boxShadow: '0 10px 24px rgba(0,0,0,0.55)',
                  fontSize: '12px',
                  fontWeight: 560,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  animation: 'popReaction 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <span style={{ fontSize: '16px' }}>{r.emoji}</span>
                <span>{r.senderName}</span>
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto', minHeight: 0 }}>
          {errorMsg && (
            <div
              style={{
                padding: '11px 14px',
                borderRadius: '11px',
                backgroundColor: 'rgba(248, 113, 113, 0.08)',
                border: '1px solid rgba(248, 113, 113, 0.28)',
                color: '#f87171',
                fontSize: '12.5px',
                lineHeight: 1.5,
              }}
            >
              {errorMsg}
            </div>
          )}

          {!isInParty ? (
            /* --- NOT IN PARTY: JOIN / CREATE MODE --- */
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <label className="fq-kicker" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                  Your display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={handleNameChange}
                  maxLength={24}
                  placeholder="Enter your name"
                  style={fieldStyle}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb), 0.42)';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(var(--accent-rgb), 0.07)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--line-strong)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Tab selector */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'rgba(255, 255, 255, 0.035)',
                  padding: '3px',
                  borderRadius: '12px',
                  border: '1px solid var(--line)',
                  gap: '2px',
                }}
              >
                {([
                  { id: 'create' as const, label: 'Create party' },
                  { id: 'join' as const, label: 'Join with code' },
                ]).map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setErrorMsg(null); }}
                      style={{
                        flex: 1,
                        height: '34px',
                        borderRadius: '9px',
                        border: 'none',
                        backgroundColor: active ? '#f2f2f4' : 'transparent',
                        color: active ? '#0a0a0f' : 'var(--text-muted)',
                        fontWeight: 650,
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === 'create' ? (
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.022)',
                    borderRadius: '16px',
                    border: '1px solid var(--line)',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '14px',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(var(--accent-rgb), 0.1)',
                      border: '1px solid rgba(var(--accent-rgb), 0.28)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-cyan)',
                    }}
                  >
                    <Sparkles size={20} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h3 style={{ fontSize: '14.5px', fontWeight: 650, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                      Host a listening room
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, maxWidth: '340px' }}>
                      Generates a temporary 4-digit code. Share it with up to 4 friends worldwide to sync music in real time.
                    </p>
                  </div>

                  <button
                    onClick={handleCreate}
                    disabled={isSubmitting}
                    className="fq-btn fq-btn-primary"
                    style={{ width: '100%', height: '40px', justifyContent: 'center', marginTop: '4px', opacity: isSubmitting ? 0.65 : 1 }}
                  >
                    {isSubmitting ? 'Connecting…' : 'Create party & get code'}
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleJoin}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.022)',
                    borderRadius: '16px',
                    border: '1px solid var(--line)',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <h3 style={{ fontSize: '14.5px', fontWeight: 650, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                      Enter a 4-digit code
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Ask your host for the room code
                    </span>
                  </div>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    style={{
                      width: '190px',
                      textAlign: 'center',
                      fontSize: '30px',
                      fontWeight: 500,
                      fontFamily: 'var(--font-serif)',
                      letterSpacing: '14px',
                      padding: '10px 16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.045)',
                      border: '1px solid var(--line-strong)',
                      borderRadius: '14px',
                      color: '#fff',
                      outline: 'none',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb), 0.42)';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(var(--accent-rgb), 0.07)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'var(--line-strong)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    autoFocus
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting || inputCode.length !== 4}
                    className={`fq-btn${inputCode.length === 4 ? ' fq-btn-primary' : ''}`}
                    style={{ width: '100%', height: '40px', justifyContent: 'center', opacity: isSubmitting || inputCode.length !== 4 ? 0.55 : 1 }}
                  >
                    {isSubmitting ? 'Joining room…' : 'Join party'}
                  </button>
                </form>
              )}

              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
                Rooms hold up to five listeners. The host controls playback for everyone.
              </p>
            </>
          ) : (
            /* --- IN PARTY: ACTIVE LOBBY --- */
            <>
              {/* Code banner */}
              <div
                style={{
                  background:
                    'radial-gradient(120% 140% at 0% 0%, rgba(var(--accent-rgb), 0.13), transparent 62%), rgba(255,255,255,0.022)',
                  borderRadius: '16px',
                  border: '1px solid rgba(var(--accent-rgb), 0.24)',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-cyan)',
                        boxShadow: '0 0 9px rgba(var(--accent-rgb), 0.75)',
                      }}
                    />
                    <span className="fq-kicker" style={{ fontSize: '9px', color: 'var(--accent-cyan)' }}>
                      {isHost ? 'Host · broadcasting' : 'Guest · synced'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Room code</span>
                    <span
                      style={{
                        fontSize: '30px',
                        fontWeight: 400,
                        color: '#fff',
                        letterSpacing: '4px',
                        fontFamily: 'var(--font-serif)',
                        lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {partyCode}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="fq-btn"
                  style={copied ? {
                    color: 'var(--accent-cyan)',
                    borderColor: 'rgba(var(--accent-rgb), 0.4)',
                    background: 'rgba(var(--accent-rgb), 0.1)',
                  } : undefined}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy code'}</span>
                </button>
              </div>

              {/* Party status — private = code only, public = join from Discord */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '13px',
                  backgroundColor: 'rgba(255, 255, 255, 0.022)',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>Party status</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    {privacy === 'public'
                      ? 'Anyone can join from your Discord presence.'
                      : 'Joinable only with the 4-digit code.'}
                    {!isHost && ' (set by host)'}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '2px',
                    padding: '2px',
                    borderRadius: '9px',
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--line)',
                    flexShrink: 0,
                  }}
                >
                  {(['private', 'public'] as PartyPrivacy[]).map(option => {
                    const active = privacy === option;
                    return (
                      <button
                        key={option}
                        onClick={() => handlePrivacyChange(option)}
                        disabled={!isHost}
                        title={isHost ? undefined : 'Only the host can change party status'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          height: '26px',
                          padding: '0 9px',
                          borderRadius: '7px',
                          border: 'none',
                          fontSize: '10.5px',
                          fontWeight: 650,
                          cursor: isHost ? 'pointer' : 'default',
                          backgroundColor: active
                            ? option === 'public'
                              ? 'var(--accent-cyan)'
                              : 'rgba(255, 255, 255, 0.14)'
                            : 'transparent',
                          color: active
                            ? option === 'public'
                              ? 'var(--accent-ink)'
                              : 'var(--text-primary)'
                            : 'var(--text-muted)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {option === 'public' ? <Globe size={11} /> : <Lock size={11} />}
                        <span>{option === 'public' ? 'Public' : 'Private'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Members */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="fq-kicker" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                    People · {members.length}/5
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {5 - members.length > 0 ? `${5 - members.length} slot${5 - members.length > 1 ? 's' : ''} free` : 'Room full'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    maxHeight: '196px',
                    overflowY: 'auto',
                  }}
                >
                  {members.map(member => {
                    const isMe = member.id === myId;
                    return (
                      <div
                        key={member.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          padding: '8px 11px',
                          borderRadius: '11px',
                          backgroundColor: isMe ? 'rgba(var(--accent-rgb), 0.05)' : 'transparent',
                          border: isMe ? '1px solid rgba(var(--accent-rgb), 0.22)' : '1px solid transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              backgroundColor: member.avatarColor || 'var(--accent-cyan)',
                              color: '#06060a',
                              fontWeight: 750,
                              fontSize: '12.5px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textTransform: 'uppercase',
                              flexShrink: 0,
                            }}
                          >
                            {member.name.charAt(0)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            <span className="fq-ttitle" style={{ fontSize: '12.5px' }}>{member.name}</span>
                            {isMe && (
                              <span className="fq-chip fq-chip-accent" style={{ height: '18px', fontSize: '8px' }}>YOU</span>
                            )}
                            {member.isHost && (
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '9px',
                                  padding: '1px 6px',
                                  borderRadius: '5px',
                                  backgroundColor: 'rgba(233, 184, 114, 0.12)',
                                  border: '1px solid rgba(233, 184, 114, 0.28)',
                                  color: '#e9b872',
                                  fontWeight: 700,
                                  letterSpacing: '0.04em',
                                }}
                              >
                                <Crown size={9} /> HOST
                              </span>
                            )}
                          </div>
                        </div>

                        {isHost && !isMe && !member.isHost && (
                          <button
                            onClick={() => handleKick(member.id)}
                            title="Remove from party"
                            className="fq-icon-btn"
                            style={{ width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = ''; }}
                          >
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Now playing */}
              <div
                style={{
                  padding: '11px 13px',
                  borderRadius: '13px',
                  backgroundColor: 'rgba(0, 0, 0, 0.24)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '9px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {currentTrack?.artworkUrl ? (
                    <img
                      src={currentTrack.artworkUrl}
                      alt={currentTrack.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Music size={18} color="var(--text-muted)" />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="fq-ttitle" style={{ fontSize: '12.5px' }}>
                    {currentTrack?.title || 'No track playing'}
                  </span>
                  <span className="fq-tsub">
                    {currentTrack?.artist || 'Host will start the music'}
                  </span>
                </div>

                <span className={`fq-chip${isPlaying ? ' fq-chip-accent' : ''}`} style={{ flexShrink: 0 }}>
                  <Volume2 size={11} />
                  {isHost ? 'Broadcasting' : 'Synced'}
                </span>
              </div>

              {/* Reactions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <span className="fq-kicker" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>React</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleSendReaction(emoji)}
                      style={{
                        width: '34px',
                        height: '34px',
                        fontSize: '15px',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--line)',
                        borderRadius: '9px',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        transition: 'transform 0.15s ease, background-color 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.09)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leave / End */}
              <button
                onClick={handleLeave}
                className="fq-btn"
                style={{
                  width: '100%',
                  height: '40px',
                  justifyContent: 'center',
                  color: isHost ? '#f87171' : 'var(--text-primary)',
                  borderColor: isHost ? 'rgba(248, 113, 113, 0.26)' : 'var(--line-strong)',
                  background: isHost ? 'rgba(248, 113, 113, 0.07)' : 'rgba(255, 255, 255, 0.045)',
                }}
              >
                <LogOut size={14} />
                <span>{isHost ? 'End party' : 'Leave party'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
