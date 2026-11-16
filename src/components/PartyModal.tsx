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
    partyService.setPrivacy(next);
    setPrivacy(next);
  };

  const handleKick = (id: string) => {
    partyService.kickMember(id);
  };

  const handleSendReaction = (emoji: string) => {
    partyService.sendReaction(emoji);
  };

  const myId = partyService.getMyMemberId();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#0c0e14',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(30, 215, 96, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                backgroundColor: 'rgba(30, 215, 96, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1ed760',
              }}
            >
              <Radio size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
                Listen Together
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Worldwide synchronized playback party (Up to 5 people)
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Floating Reactions Overlay */}
        {recentReactions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '70px',
              right: '24px',
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
                  padding: '6px 12px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(20, 24, 32, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  animation: 'popReaction 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <span style={{ fontSize: '18px' }}>{r.emoji}</span>
                <span>{r.senderName}</span>
              </div>
            ))}
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {errorMsg && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '13px',
                lineHeight: 1.4,
              }}
            >
              {errorMsg}
            </div>
          )}

          {!isInParty ? (
            /* --- NOT IN PARTY: JOIN / CREATE MODE --- */
            <>
              {/* Display Name Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Your Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={handleNameChange}
                  maxLength={24}
                  placeholder="Enter your name"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '14px',
                    color: '#fff',
                    outline: 'none',
                    fontWeight: 600,
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#1ed760'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                />
              </div>

              {/* Tab Selector */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  padding: '4px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <button
                  onClick={() => { setActiveTab('create'); setErrorMsg(null); }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: activeTab === 'create' ? '#1ed760' : 'transparent',
                    color: activeTab === 'create' ? '#000' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Create Party (Host)
                </button>
                <button
                  onClick={() => { setActiveTab('join'); setErrorMsg(null); }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: activeTab === 'join' ? '#1ed760' : 'transparent',
                    color: activeTab === 'join' ? '#000' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Join with Code
                </button>
              </div>

              {activeTab === 'create' ? (
                /* Create Card */
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '14px',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(30, 215, 96, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1ed760',
                    }}
                  >
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
                      Host a Listen Together Party
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      Generates a temporary 4-digit code. Share it with up to 4 friends worldwide to sync music in real time.
                    </p>
                  </div>

                  <button
                    onClick={handleCreate}
                    disabled={isSubmitting}
                    style={{
                      marginTop: '8px',
                      width: '100%',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      backgroundColor: '#1ed760',
                      color: '#000',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 16px rgba(30, 215, 96, 0.35)',
                      transition: 'transform 0.15s ease, opacity 0.15s ease',
                      opacity: isSubmitting ? 0.7 : 1,
                    }}
                    onMouseEnter={e => !isSubmitting && (e.currentTarget.style.transform = 'scale(1.02)')}
                    onMouseLeave={e => !isSubmitting && (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {isSubmitting ? 'Connecting...' : 'Create Party & Get Code'}
                  </button>
                </div>
              ) : (
                /* Join Form */
                <form
                  onSubmit={handleJoin}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
                      Enter 4-Digit Party Code
                    </h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Ask your host for the 4-digit room code
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
                      width: '200px',
                      textAlign: 'center',
                      fontSize: '32px',
                      fontWeight: 800,
                      letterSpacing: '14px',
                      padding: '12px 16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '2px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '16px',
                      color: '#fff',
                      outline: 'none',
                      fontFamily: 'monospace',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#1ed760'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                    autoFocus
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting || inputCode.length !== 4}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      backgroundColor: inputCode.length === 4 ? '#1ed760' : 'rgba(255, 255, 255, 0.1)',
                      color: inputCode.length === 4 ? '#000' : 'var(--text-muted)',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: isSubmitting || inputCode.length !== 4 ? 'not-allowed' : 'pointer',
                      boxShadow: inputCode.length === 4 ? '0 4px 16px rgba(30, 215, 96, 0.3)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSubmitting ? 'Joining Room...' : 'Join Party'}
                  </button>
                </form>
              )}
            </>
          ) : (
            /* --- IN PARTY: ACTIVE LOBBY & CONTROL --- */
            <>
              {/* Code Banner */}
              <div
                style={{
                  backgroundColor: 'rgba(30, 215, 96, 0.08)',
                  borderRadius: '18px',
                  border: '1px solid rgba(30, 215, 96, 0.25)',
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#1ed760',
                        boxShadow: '0 0 10px #1ed760',
                      }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#1ed760', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Party Active • {isHost ? 'Host DJ' : 'Guest Listener'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Room Code:</span>
                    <span
                      style={{
                        fontSize: '28px',
                        fontWeight: 900,
                        color: '#fff',
                        letterSpacing: '6px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {partyCode}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCopyCode}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: copied ? '#1ed760' : 'rgba(255, 255, 255, 0.08)',
                    color: copied ? '#000' : '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* Party Status — private = code only, public = join from Discord */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>Party Status</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
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
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
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
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: isHost ? 'pointer' : 'default',
                          backgroundColor: active
                            ? option === 'public'
                              ? 'rgba(30, 215, 96, 0.9)'
                              : 'rgba(255, 255, 255, 0.16)'
                            : 'transparent',
                          color: active
                            ? option === 'public'
                              ? '#04120a'
                              : '#fff'
                            : 'var(--text-muted)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {option === 'public' ? <Globe size={12} /> : <Lock size={12} />}
                        <span>{option === 'public' ? 'Public' : 'Private'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Members List (Capacity: 5) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Party Members ({members.length}/5)
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {5 - members.length > 0 ? `${5 - members.length} slot${5 - members.length > 1 ? 's' : ''} free` : 'Party Full'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '180px',
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
                          padding: '10px 14px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          border: isMe ? '1px solid rgba(30, 215, 96, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: member.avatarColor || '#1ed760',
                              color: '#000',
                              fontWeight: 800,
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textTransform: 'uppercase',
                            }}
                          >
                            {member.name.charAt(0)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                                {member.name}
                              </span>
                              {isMe && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '1px 6px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(30, 215, 96, 0.2)',
                                    color: '#1ed760',
                                    fontWeight: 700,
                                  }}
                                >
                                  YOU
                                </span>
                              )}
                              {member.isHost && (
                                <span
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '10px',
                                    padding: '1px 6px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(234, 179, 8, 0.2)',
                                    color: '#eab308',
                                    fontWeight: 800,
                                  }}
                                >
                                  <Crown size={11} /> HOST
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Kick Member button for Host */}
                        {isHost && !isMe && !member.isHost && (
                          <button
                            onClick={() => handleKick(member.id)}
                            title="Remove from party"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                          >
                            <UserMinus size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Synchronized Playback Card */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
                    <Music size={20} color="var(--text-secondary)" />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {currentTrack?.title || 'No track playing'}
                    </span>
                    {isPlaying && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#1ed760',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {currentTrack?.artist || 'Host will start music'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1ed760', fontSize: '11px', fontWeight: 700 }}>
                  <Volume2 size={15} />
                  <span>{isHost ? 'Broadcasting' : 'Synced'}</span>
                </div>
              </div>

              {/* Quick Reactions Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  React:
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleSendReaction(emoji)}
                      style={{
                        padding: '6px 10px',
                        fontSize: '16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leave / End Button */}
              <button
                onClick={handleLeave}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  backgroundColor: isHost ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  color: isHost ? '#ef4444' : '#fff',
                  border: isHost ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.12)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = isHost ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.14)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = isHost ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <LogOut size={16} />
                <span>{isHost ? 'End Party (Close Room)' : 'Leave Party'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
