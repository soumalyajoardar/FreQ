import React, { useState, useEffect } from 'react';
import {
  Radio,
  Users,
  Crown,
  Copy,
  Check,
  LogOut,
  UserMinus,
  Sparkles,
  Volume2,
  Clock,
  Trash2,
  ArrowRight,
  Music,
  Play,
  Pause,
} from 'lucide-react';
import { partyService, PartyMember, PartyReaction, RecentParty } from '../services/partyService';
import { MediaTrack } from '../types';
import { formatTime } from '../components/PlayerBar';
import { SquareArt } from '../components/SquareArt';

interface PartyViewProps {
  currentTrack: MediaTrack | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  onNavigate?: (view: string) => void;
}

const QUICK_EMOJIS = ['🔥', '❤️', '🎵', '👏', '⚡', '🎉'];

export const PartyView: React.FC<PartyViewProps> = ({
  currentTrack,
  isPlaying,
  position,
  duration,
  onNavigate,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [displayName, setDisplayName] = useState(() => partyService.getMyName());
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [members, setMembers] = useState<PartyMember[]>(() => partyService.getMembers());
  const [partyCode, setPartyCode] = useState<string | null>(() => partyService.getPartyCode());
  const [isHost, setIsHost] = useState<boolean>(() => partyService.getIsHost());
  const [isInParty, setIsInParty] = useState<boolean>(() => partyService.isInParty());
  const [recentParties, setRecentParties] = useState<RecentParty[]>(() => partyService.getRecentParties());
  const [recentReactions, setRecentReactions] = useState<PartyReaction[]>([]);

  useEffect(() => {
    const unsubState = partyService.subscribe(() => {
      setMembers(partyService.getMembers());
      setPartyCode(partyService.getPartyCode());
      setIsHost(partyService.getIsHost());
      setIsInParty(partyService.isInParty());
      setErrorMsg(partyService.getErrorMessage());
      setRecentParties(partyService.getRecentParties());
    });

    const unsubSync = partyService.onSyncEvent(ev => {
      if (ev.type === 'reaction' && ev.reaction) {
        const rx = ev.reaction;
        setRecentReactions(prev => [...prev.slice(-5), rx]);
        setTimeout(() => {
          setRecentReactions(prev => prev.filter(r => r.id !== rx.id));
        }, 3200);
      }
    });

    return () => {
      unsubState();
      unsubSync();
    };
  }, []);

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

  const handleJoin = async (codeToJoin?: string) => {
    const target = (codeToJoin || inputCode).trim().replace(/\D/g, '');
    if (target.length !== 4) {
      setErrorMsg('Please enter a 4-digit code.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await partyService.joinParty(target);
      setInputCode('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to join party.');
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

  const handleKick = (memberId: string) => {
    partyService.kickMember(memberId);
  };

  const handleReaction = (emoji: string) => {
    partyService.sendReaction(emoji);
  };

  const handleRemoveRecent = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    partyService.removeRecentParty(code);
    setRecentParties(partyService.getRecentParties());
  };

  const handleClearRecents = () => {
    partyService.clearRecentParties();
    setRecentParties([]);
  };

  const hostName = partyService.getHostName();

  const cardStyle: React.CSSProperties = {
    borderRadius: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  };

  return (
    <div
      style={{
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '920px',
        margin: '0 auto',
        width: '100%',
      }}
      className="view-enter"
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              backgroundColor: 'rgba(30, 215, 96, 0.15)',
              border: '1px solid rgba(30, 215, 96, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(30, 215, 96, 0.2)',
            }}
          >
            <Radio size={24} color="#1ed760" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f0f2f5', margin: 0 }}>
                Listen Together
              </h1>
              {isInParty && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: '#1ed760',
                    color: '#000',
                    letterSpacing: '0.4px',
                  }}
                >
                  LIVE ROOM
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #8b93a6)', margin: '4px 0 0 0' }}>
              Real-time synchronized music room with up to 5 friends anywhere in the world
            </p>
          </div>
        </div>

        {/* Global User Name Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #5c6478)' }}>Your Name:</span>
          <input
            type="text"
            value={displayName}
            onChange={handleNameChange}
            maxLength={20}
            placeholder="Display Name"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f0f2f5',
              outline: 'none',
              width: '130px',
            }}
          />
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ================= ACTIVE PARTY ROOM STATE ================= */}
      {isInParty && partyCode ? (
        <>
          {/* Party Hero Card */}
          <div
            style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, rgba(30, 215, 96, 0.12) 0%, rgba(10, 12, 18, 0.88) 100%)',
              border: '1px solid rgba(30, 215, 96, 0.35)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Floating Reactions Overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
                zIndex: 10,
              }}
            >
              {recentReactions.map(rx => (
                <div
                  key={rx.id}
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: `${20 + Math.random() * 60}%`,
                    fontSize: '28px',
                    animation: 'floatUp 3s ease-out forwards',
                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{rx.emoji}</span>
                  <span style={{ fontSize: '11px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px' }}>
                    {rx.senderName}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #8b93a6)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Party Room Code
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#f0f2f5',
                    }}
                  >
                    {members.length}/5 Listeners
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      fontSize: '38px',
                      fontWeight: 900,
                      letterSpacing: '6px',
                      color: '#1ed760',
                      fontFamily: 'monospace',
                      textShadow: '0 0 20px rgba(30, 215, 96, 0.4)',
                    }}
                  >
                    #{partyCode}
                  </span>

                  <button
                    onClick={handleCopyCode}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: copied ? 'rgba(30, 215, 96, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                      border: copied ? '1px solid #1ed760' : '1px solid rgba(255, 255, 255, 0.15)',
                      color: copied ? '#1ed760' : '#f0f2f5',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {copied ? <Check size={14} color="#1ed760" /> : <Copy size={14} />}
                    <span>{copied ? 'Code Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              {/* Host & Status Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Crown size={15} color="#f59e0b" />
                  <span style={{ fontSize: '13px', color: '#f0f2f5' }}>
                    Host: <strong style={{ color: '#f59e0b' }}>{hostName}</strong>
                  </span>
                  {isHost && (
                    <span style={{ fontSize: '10px', backgroundColor: '#f59e0b', color: '#000', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                      YOU
                    </span>
                  )}
                </div>

                <button
                  onClick={handleLeave}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; }}
                >
                  <LogOut size={14} />
                  <span>{isHost ? 'End Party' : 'Leave Party'}</span>
                </button>
              </div>
            </div>

            {/* Now Playing Bar in Room */}
            <div
              style={{
                marginTop: '10px',
                padding: '14px 18px',
                borderRadius: '14px',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <SquareArt
                  src={currentTrack?.artworkUrl}
                  alt={currentTrack?.title || 'Party Music'}
                  size={52}
                  style={{ borderRadius: '8px' }}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f0f2f5' }}>
                    {currentTrack?.title || 'Waiting for host to pick a song...'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary, #8b93a6)', marginTop: '2px' }}>
                    {currentTrack?.artist || 'Host controls music'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isPlaying ? (
                    <Play size={14} fill="#1ed760" color="#1ed760" />
                  ) : (
                    <Pause size={14} fill="#f59e0b" color="#f59e0b" />
                  )}
                  <span style={{ fontSize: '12px', color: '#f0f2f5', fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(position)} / {formatTime(duration)}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    color: isHost ? '#1ed760' : '#00d2ff',
                    backgroundColor: isHost ? 'rgba(30, 215, 96, 0.15)' : 'rgba(0, 210, 255, 0.15)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                  }}
                >
                  {isHost ? 'Broadcasting live to party' : 'Synced with host'}
                </span>
              </div>
            </div>

            {/* Quick Live Emoji Reactions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #5c6478)' }}>
                Live Reactions:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    title={`Send ${emoji} reaction to party`}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '18px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.1s ease, background-color 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'scale(1.2)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Members List Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#fff" />
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f0f2f5', margin: 0 }}>
                  People in Room ({members.length}/5)
                </h2>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #5c6478)' }}>
                Maximum 5 people per room
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {members.map(m => {
                const isMe = m.id === partyService.getMyMemberId();
                return (
                  <div
                    key={m.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '14px',
                      backgroundColor: isMe ? 'rgba(30, 215, 96, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                      border: isMe ? '1px solid rgba(30, 215, 96, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: m.avatarColor || '#1ed760',
                          color: '#000',
                          fontWeight: 800,
                          fontSize: '15px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0f2f5' }}>
                            {m.name}
                          </span>
                          {m.isHost && (
                            <span title="Party Host">
                              <Crown size={14} color="#f59e0b" />
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #5c6478)', marginTop: '2px' }}>
                          {m.isHost ? 'Host • Controls music' : 'Listener'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isMe && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            color: '#f0f2f5',
                          }}
                        >
                          YOU
                        </span>
                      )}
                      {isHost && !m.isHost && (
                        <button
                          onClick={() => handleKick(m.id)}
                          title={`Remove ${m.name} from party`}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted, #5c6478)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted, #5c6478)'; }}
                        >
                          <UserMinus size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* ================= LOBBY (NOT IN PARTY) STATE ================= */
        <>
          {/* 2-Card Action Grid: Host or Join */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Card 1: Host a Party */}
            <div
              style={{
                ...cardStyle,
                background: 'linear-gradient(135deg, rgba(30, 215, 96, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                border: '1px solid rgba(30, 215, 96, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crown size={18} color="#1ed760" />
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#f0f2f5', margin: 0 }}>
                    Host a Party Room
                  </h2>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(30, 215, 96, 0.15)',
                    color: '#1ed760',
                  }}
                >
                  YOU ARE HOST
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary, #8b93a6)', margin: 0, lineHeight: 1.6 }}>
                Create a private listening party up to 5 people. You control track choices, skipping, and seeking. Friends join with a temporary 4-digit code.
              </p>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Music size={16} color="#1ed760" />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary, #8b93a6)' }}>
                  {currentTrack ? `Starting with “${currentTrack.title}”` : 'Start your party anytime — pick songs as you go!'}
                </span>
              </div>

              <button
                onClick={handleCreate}
                disabled={isSubmitting}
                style={{
                  marginTop: 'auto',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  backgroundColor: '#1ed760',
                  color: '#000',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(30, 215, 96, 0.35)',
                  transition: 'transform 0.1s ease',
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <Radio size={16} />
                <span>{isSubmitting ? 'Creating Room...' : 'Create Party Room'}</span>
              </button>
            </div>

            {/* Card 2: Join a Party */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="#00d2ff" />
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#f0f2f5', margin: 0 }}>
                    Join a Party Room
                  </h2>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(0, 210, 255, 0.15)',
                    color: '#00d2ff',
                  }}
                >
                  4-DIGIT CODE
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary, #8b93a6)', margin: 0, lineHeight: 1.6 }}>
                Enter the 4-digit code provided by your host to jump straight into their audio stream from anywhere in the world.
              </p>

              <form
                onSubmit={e => { e.preventDefault(); handleJoin(); }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: 'auto' }}
              >
                <input
                  type="text"
                  maxLength={4}
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    fontSize: '28px',
                    fontWeight: 900,
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontFamily: 'monospace',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f0f2f5',
                    outline: 'none',
                  }}
                />

                <button
                  type="submit"
                  disabled={isSubmitting || inputCode.length !== 4}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 800,
                    backgroundColor: inputCode.length === 4 ? '#00d2ff' : 'rgba(255, 255, 255, 0.08)',
                    color: inputCode.length === 4 ? '#000' : 'var(--text-muted, #5c6478)',
                    border: 'none',
                    cursor: inputCode.length === 4 && !isSubmitting ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: inputCode.length === 4 ? '0 4px 16px rgba(0, 210, 255, 0.35)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ArrowRight size={16} />
                  <span>{isSubmitting ? 'Connecting...' : 'Join Party'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Card 3: Recent Codes & Host Names (User Request!) */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#fff" />
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f0f2f5', margin: 0 }}>
                  Recent Party Rooms & Codes
                </h2>
              </div>
              {recentParties.length > 0 && (
                <button
                  onClick={handleClearRecents}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted, #5c6478)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted, #5c6478)'; }}
                >
                  Clear History
                </button>
              )}
            </div>

            {recentParties.length === 0 ? (
              <div
                style={{
                  padding: '30px 20px',
                  textAlign: 'center',
                  color: 'var(--text-muted, #5c6478)',
                  fontSize: '13px',
                }}
              >
                No recent parties found. Rooms you host or join will appear here with the host name and quick 1-click join!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentParties.map(p => (
                  <div
                    key={p.code}
                    onClick={() => handleJoin(p.code)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease, border-color 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)';
                      e.currentTarget.style.borderColor = 'rgba(30, 215, 96, 0.3)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span
                        style={{
                          fontSize: '18px',
                          fontWeight: 900,
                          letterSpacing: '2px',
                          fontFamily: 'monospace',
                          color: p.isHost ? '#1ed760' : '#00d2ff',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          backgroundColor: p.isHost ? 'rgba(30, 215, 96, 0.12)' : 'rgba(0, 210, 255, 0.12)',
                          border: p.isHost ? '1px solid rgba(30, 215, 96, 0.3)' : '1px solid rgba(0, 210, 255, 0.3)',
                        }}
                      >
                        #{p.code}
                      </span>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0f2f5' }}>
                            Host: <strong style={{ color: p.isHost ? '#1ed760' : '#f59e0b' }}>{p.hostName || 'Party Host'}</strong>
                          </span>
                          {p.isHost && (
                            <span style={{ fontSize: '10px', backgroundColor: 'rgba(30, 215, 96, 0.2)', color: '#1ed760', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                              YOU HOSTED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #5c6478)', marginTop: '2px' }}>
                          {new Date(p.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); handleJoin(p.code); }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: 'rgba(30, 215, 96, 0.15)',
                          border: '1px solid rgba(30, 215, 96, 0.3)',
                          color: '#1ed760',
                          cursor: 'pointer',
                        }}
                      >
                        Quick Join
                      </button>

                      <button
                        onClick={e => handleRemoveRecent(e, p.code)}
                        title="Remove from history"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted, #5c6478)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted, #5c6478)'; }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
