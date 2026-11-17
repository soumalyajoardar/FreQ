import React, { useState, useEffect } from 'react';
import {
  Radio,
  Users,
  Crown,
  Copy,
  Check,
  LogOut,
  UserMinus,
  Volume2,
  Clock,
  Trash2,
  ArrowRight,
  Music,
  Play,
  Pause,
  Globe,
  Lock,
} from 'lucide-react';
import { partyService, PartyMember, PartyPrivacy, PartyReaction, RecentParty } from '../services/partyService';
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
  const [privacy, setPrivacy] = useState<PartyPrivacy>(() => partyService.getPrivacy());
  const [recentParties, setRecentParties] = useState<RecentParty[]>(() => partyService.getRecentParties());
  const [recentReactions, setRecentReactions] = useState<PartyReaction[]>([]);

  useEffect(() => {
    const unsubState = partyService.subscribe(() => {
      setMembers(partyService.getMembers());
      setPartyCode(partyService.getPartyCode());
      setIsHost(partyService.getIsHost());
      setIsInParty(partyService.isInParty());
      setPrivacy(partyService.getPrivacy());
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

  const handlePrivacyChange = (next: PartyPrivacy) => {
    if (!isHost) return;
    partyService.setPrivacy(next);
    setPrivacy(next);
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

  return (
    <div className="fq-view view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '18px', maxWidth: '980px', width: '100%' }}>
      {/* Header */}
      <header className="fq-page-head" style={{ paddingBottom: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="fq-kicker" style={{ color: isInParty ? 'var(--accent-cyan)' : undefined }}>Listen together</span>
            {isInParty && <span className="fq-chip fq-chip-accent" style={{ height: '20px', fontSize: '9px' }}>LIVE ROOM</span>}
          </div>
          <h1 className="fq-h1">Party Room</h1>
          <p className="fq-muted" style={{ fontSize: '13px', maxWidth: '560px', lineHeight: 1.55 }}>
            A synchronised listening room for up to five friends, anywhere in the world.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <span className="fq-kicker" style={{ fontSize: '9px' }}>Your name</span>
          <input
            type="text"
            value={displayName}
            onChange={handleNameChange}
            maxLength={20}
            placeholder="Display name"
            style={{
              width: '148px',
              height: '34px',
              padding: '0 12px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--line)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              fontWeight: 550,
            }}
          />
        </div>
      </header>

      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '11px 14px',
            borderRadius: '12px',
            border: '1px solid rgba(248, 113, 113, 0.28)',
            background: 'rgba(248, 113, 113, 0.08)',
            color: '#f87171',
            fontSize: '12.5px',
          }}
        >
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} style={{ color: '#f87171', fontSize: '13px' }}>✕</button>
        </div>
      )}

      {/* ================= ACTIVE ROOM ================= */}
      {isInParty && partyCode ? (
        <>
          <section
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '24px',
              border: '1px solid rgba(30, 215, 96, 0.26)',
              background:
                'radial-gradient(120% 130% at 0% 0%, rgba(30, 215, 96, 0.14), transparent 58%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
              padding: '26px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Reaction overlay */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 10 }}>
              {recentReactions.map(rx => (
                <div
                  key={rx.id}
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: `${20 + Math.random() * 60}%`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '26px',
                    animation: 'floatUp 3s ease-out forwards',
                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
                  }}
                >
                  <span>{rx.emoji}</span>
                  <span style={{ fontSize: '10px', color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px' }}>
                    {rx.senderName}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="fq-kicker" style={{ fontSize: '9px' }}>Room code</span>
                  <span className="fq-chip">{members.length}/5 listeners</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '52px',
                      lineHeight: 0.9,
                      letterSpacing: '0.02em',
                      color: 'var(--accent-cyan)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    #{partyCode}
                  </span>

                  <button
                    onClick={handleCopyCode}
                    className="fq-btn"
                    style={copied ? { color: 'var(--accent-cyan)', borderColor: 'rgba(30,215,96,0.4)', background: 'rgba(30,215,96,0.1)' } : undefined}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy code'}
                  </button>
                </div>
              </div>

              {/* Status + host + leave */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '5px 6px 5px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--line)',
                    background: 'rgba(255, 255, 255, 0.045)',
                  }}
                >
                  <span className="fq-kicker" style={{ fontSize: '9px' }}>Party status</span>
                  <div style={{ display: 'flex', gap: '2px', padding: '2px', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.35)' }}>
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
                            padding: '5px 9px',
                            borderRadius: '6px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: isHost ? 'pointer' : 'default',
                            background: active
                              ? option === 'public'
                                ? 'var(--accent-cyan)'
                                : 'rgba(255, 255, 255, 0.16)'
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

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', maxWidth: '280px', lineHeight: 1.5 }}>
                  {privacy === 'public'
                    ? 'Anyone can join from your Discord presence.'
                    : 'Joinable only with the 4-digit code.'}
                  {!isHost && ' (set by host)'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="fq-chip">
                    <Crown size={11} color="#e9b872" />
                    Host: <strong style={{ color: '#e9b872', fontWeight: 700 }}>{hostName}</strong>
                    {isHost && <span style={{ color: 'var(--text-muted)' }}>· you</span>}
                  </span>

                  <button
                    onClick={handleLeave}
                    className="fq-btn"
                    style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.26)', background: 'rgba(248,113,113,0.07)' }}
                  >
                    <LogOut size={13} />
                    {isHost ? 'End party' : 'Leave'}
                  </button>
                </div>
              </div>
            </div>

            {/* Now playing */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                padding: '13px 16px',
                borderRadius: '14px',
                border: '1px solid var(--line)',
                background: 'rgba(0, 0, 0, 0.28)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '13px', minWidth: 0 }}>
                <SquareArt
                  src={currentTrack?.artworkUrl}
                  alt={currentTrack?.title || 'Party music'}
                  style={{ borderRadius: '9px', width: '48px', height: '48px', flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <div className="fq-ttitle" style={{ fontSize: '13px' }}>
                    {currentTrack?.title || 'Waiting for the host to pick a song…'}
                  </div>
                  <div className="fq-tsub">{currentTrack?.artist || 'Host controls the music'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  {isPlaying ? (
                    <Play size={12} fill="var(--accent-cyan)" color="var(--accent-cyan)" />
                  ) : (
                    <Pause size={12} fill="#e9b872" color="#e9b872" />
                  )}
                  {formatTime(position)} / {formatTime(duration)}
                </span>

                <span className={`fq-chip${isHost ? ' fq-chip-accent' : ''}`}>
                  <Volume2 size={11} />
                  {isHost ? 'Broadcasting' : 'Synced with host'}
                </span>
              </div>
            </div>

            {/* Reactions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span className="fq-kicker" style={{ fontSize: '9px' }}>Live reactions</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    title={`Send ${emoji} reaction to party`}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      border: '1px solid var(--line)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      fontSize: '16px',
                      display: 'grid',
                      placeItems: 'center',
                      transition: 'transform 0.1s ease, background-color 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'scale(1.14)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Members */}
          <section className="fq-set-section">
            <div className="fq-set-head">
              <span className="fq-set-icon"><Users size={16} /></span>
              <div style={{ flex: 1 }}>
                <h2 className="fq-set-title">People in the room</h2>
                <p className="fq-set-desc">{members.length} of 5 seats taken</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))', gap: '10px' }}>
              {members.map(m => {
                const isMe = m.id === partyService.getMyMemberId();
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '11px 13px',
                      borderRadius: '13px',
                      border: isMe ? '1px solid rgba(30, 215, 96, 0.24)' : '1px solid var(--line)',
                      background: isMe ? 'rgba(30, 215, 96, 0.05)' : 'rgba(255, 255, 255, 0.022)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: m.avatarColor || 'var(--accent-cyan)',
                          color: '#05070a',
                          fontWeight: 800,
                          fontSize: '14px',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="fq-ttitle" style={{ fontSize: '12.5px' }}>{m.name}</span>
                          {m.isHost && <Crown size={12} color="#e9b872" />}
                        </div>
                        <div className="fq-tsub" style={{ fontSize: '11px' }}>
                          {m.isHost ? 'Host · controls music' : 'Listener'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isMe && <span className="fq-chip" style={{ height: '19px', fontSize: '8.5px' }}>YOU</span>}
                      {isHost && !m.isHost && (
                        <button
                          onClick={() => handleKick(m.id)}
                          title={`Remove ${m.name} from party`}
                          className="fq-icon-btn"
                          style={{ width: '26px', height: '26px', borderRadius: '7px' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = ''; }}
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        /* ================= LOBBY ================= */
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '18px' }}>
            {/* Host */}
            <section
              className="fq-set-section"
              style={{
                background:
                  'radial-gradient(120% 130% at 0% 0%, rgba(30, 215, 96, 0.1), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.032), rgba(255,255,255,0.008))',
                borderColor: 'rgba(30, 215, 96, 0.22)',
              }}
            >
              <div className="fq-set-head">
                <span className="fq-set-icon" style={{ color: 'var(--accent-cyan)', borderColor: 'rgba(30,215,96,0.28)', background: 'rgba(30,215,96,0.1)' }}>
                  <Crown size={16} />
                </span>
                <div style={{ flex: 1 }}>
                  <h2 className="fq-set-title">Host a room</h2>
                  <p className="fq-set-desc">You control tracks, skipping and seeking.</p>
                </div>
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                Create a listening party for up to five people. Friends join with a 4-digit code — or straight
                from your Discord presence when the room is public.
              </p>

              <div className="fq-set-row" style={{ background: 'rgba(0,0,0,0.22)' }}>
                <Music size={14} color="var(--accent-cyan)" />
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', textAlign: 'right', lineHeight: 1.5 }}>
                  {currentTrack ? `Starting with “${currentTrack.title}”` : 'Pick songs as you go'}
                </span>
              </div>

              <button
                className="fq-btn fq-btn-primary"
                onClick={handleCreate}
                disabled={isSubmitting}
                style={{ marginTop: 'auto', height: '40px', justifyContent: 'center', width: '100%' }}
              >
                <Radio size={14} />
                {isSubmitting ? 'Creating room…' : 'Create party room'}
              </button>
            </section>

            {/* Join */}
            <section className="fq-set-section">
              <div className="fq-set-head">
                <span className="fq-set-icon"><Users size={16} /></span>
                <div style={{ flex: 1 }}>
                  <h2 className="fq-set-title">Join a room</h2>
                  <p className="fq-set-desc">Enter the host's 4-digit code.</p>
                </div>
                <span className="fq-chip">CODE</span>
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                Jump straight into someone else's stream from anywhere in the world.
              </p>

              <form
                onSubmit={e => { e.preventDefault(); handleJoin(); }}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}
              >
                <input
                  type="text"
                  maxLength={4}
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  style={{
                    height: '54px',
                    borderRadius: '13px',
                    border: '1px solid var(--line-strong)',
                    background: 'rgba(255, 255, 255, 0.045)',
                    color: 'var(--text-primary)',
                    fontSize: '26px',
                    fontWeight: 800,
                    textAlign: 'center',
                    letterSpacing: '10px',
                    fontVariantNumeric: 'tabular-nums',
                    paddingLeft: '10px',
                  }}
                />

                <button
                  type="submit"
                  disabled={isSubmitting || inputCode.length !== 4}
                  className={`fq-btn${inputCode.length === 4 ? ' fq-btn-primary' : ''}`}
                  style={{ height: '40px', justifyContent: 'center', opacity: inputCode.length === 4 ? 1 : 0.55 }}
                >
                  <ArrowRight size={14} />
                  {isSubmitting ? 'Connecting…' : 'Join party'}
                </button>
              </form>
            </section>
          </div>

          {/* Recents */}
          <section className="fq-set-section">
            <div className="fq-set-head">
              <span className="fq-set-icon"><Clock size={16} /></span>
              <div style={{ flex: 1 }}>
                <h2 className="fq-set-title">Recent rooms</h2>
                <p className="fq-set-desc">One-click rejoin for rooms you hosted or joined.</p>
              </div>
              {recentParties.length > 0 && (
                <button className="fq-btn fq-btn-ghost" onClick={handleClearRecents}>
                  Clear
                </button>
              )}
            </div>

            {recentParties.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                No recent parties yet — rooms you host or join will appear here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentParties.map(p => (
                  <div
                    key={p.code}
                    className="fq-mix"
                    onClick={() => handleJoin(p.code)}
                  >
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        fontVariantNumeric: 'tabular-nums',
                        color: p.isHost ? 'var(--accent-cyan)' : 'var(--text-primary)',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: p.isHost ? '1px solid rgba(30,215,96,0.3)' : '1px solid var(--line)',
                        background: p.isHost ? 'rgba(30,215,96,0.1)' : 'rgba(255,255,255,0.04)',
                        flexShrink: 0,
                      }}
                    >
                      #{p.code}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fq-ttitle" style={{ fontSize: '12.5px' }}>
                        Host: {p.hostName || 'Party Host'}
                        {p.isHost && <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}> · you</span>}
                      </div>
                      <div className="fq-tsub" style={{ fontSize: '11px' }}>
                        {new Date(p.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); handleJoin(p.code); }}
                        className="fq-chip fq-chip-accent"
                        style={{ height: '28px', padding: '0 12px' }}
                      >
                        Quick join
                      </button>
                      <button
                        onClick={e => handleRemoveRecent(e, p.code)}
                        title="Remove from history"
                        className="fq-icon-btn"
                        style={{ width: '26px', height: '26px', borderRadius: '7px' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = ''; }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
