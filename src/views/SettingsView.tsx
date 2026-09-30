import React, { useEffect, useState } from 'react';
import { Volume2, Sparkles, HardDrive, ShieldCheck, Info, Radio } from 'lucide-react';
import { AudioMode } from '../types';
import { libraryStore } from '../services/libraryStore';

interface SettingsViewProps {
  audioMode: AudioMode;
  onAudioModeChange: (mode: AudioMode) => void;
  likedCount: number;
  playlistCount: number;
  historyCount: number;
  onClearHistory: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  audioMode,
  onAudioModeChange,
  likedCount,
  playlistCount,
  historyCount,
  onClearHistory,
}) => {
  const [discordStatus, setDiscordStatus] = useState<{ isConnected: boolean; isEnabled: boolean } | null>(null);
  const [customAppId, setCustomAppId] = useState(libraryStore.getDiscordClientId() || '');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (window.electronAPI?.getDiscordStatus) {
      window.electronAPI.getDiscordStatus().then(status => {
        setDiscordStatus(status);
      });
      const interval = setInterval(() => {
        window.electronAPI?.getDiscordStatus().then(status => {
          setDiscordStatus(status);
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleToggleDiscord = async () => {
    if (!window.electronAPI) return;
    const nextState = !discordStatus?.isEnabled;
    await window.electronAPI.setDiscordEnabled(nextState);
    const updated = await window.electronAPI.getDiscordStatus();
    setDiscordStatus(updated);
  };

  const handleSaveCustomAppId = async () => {
    libraryStore.setDiscordClientId(customAppId);
    if (window.electronAPI?.setDiscordClientId) {
      await window.electronAPI.setDiscordClientId(customAppId || '1177081335727267940');
    }
    setSaveMessage('Saved & Reconnected!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>
        Settings & Audio Engine
      </h1>

      {/* Audio Engine Configuration */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Volume2 size={20} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Audio Flavors & Web Audio DSP
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Choose how FreQ shapes your sound output via Web Audio API:
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div
              onClick={() => onAudioModeChange('NORMAL')}
              style={{
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: audioMode === 'NORMAL' ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: '1px solid ' + (audioMode === 'NORMAL' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.08)'),
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 700, color: audioMode === 'NORMAL' ? 'var(--accent-cyan)' : '#fff' }}>
                Normal
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                1.0x standard pitch & speed, pure dry studio fidelity.
              </span>
            </div>

            <div
              onClick={() => onAudioModeChange('SNR')}
              style={{
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: audioMode === 'SNR' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: '1px solid ' + (audioMode === 'SNR' ? 'var(--accent-violet)' : 'rgba(255, 255, 255, 0.08)'),
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 700, color: audioMode === 'SNR' ? 'var(--accent-violet)' : '#fff' }}>
                SnR (Slowed + Reverb)
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                0.8x tempo + pitched down with a lush ConvolverNode impulse reverb.
              </span>
            </div>

            <div
              onClick={() => onAudioModeChange('NIGHTCORE')}
              style={{
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: audioMode === 'NIGHTCORE' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: '1px solid ' + (audioMode === 'NIGHTCORE' ? 'var(--accent-pink)' : 'rgba(255, 255, 255, 0.08)'),
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 700, color: audioMode === 'NIGHTCORE' ? 'var(--accent-pink)' : '#fff' }}>
                Nightcore
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                1.2x upbeat speed + high pitch without time-stretching.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Discord Rich Presence */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={20} color="#5865F2" />
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Discord Rich Presence
            </h2>
          </div>

          {discordStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: discordStatus.isConnected ? '#10B981' : '#6B7280',
                  boxShadow: discordStatus.isConnected ? '0 0 10px #10B981' : 'none',
                }}
              />
              <span style={{ fontSize: '12px', color: discordStatus.isConnected ? '#10B981' : 'var(--text-muted)' }}>
                {discordStatus.isConnected ? 'Connected to Discord' : 'Looking for Discord...'}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Broadcasts your currently playing track ("Listening to FreQ"), artist name, album artwork, and live timeline progress bar to your Discord status profile.
          </span>

          <div
            onClick={handleToggleDiscord}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                Show Status on Discord
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Display current track and listening progress in Discord
              </span>
            </div>

            <div
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '999px',
                backgroundColor: discordStatus?.isEnabled ? '#5865F2' : 'rgba(255, 255, 255, 0.15)',
                position: 'relative',
                transition: 'background-color 0.2s',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: discordStatus?.isEnabled ? '22px' : '2px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              />
            </div>
          </div>

          {/* Custom Discord Application ID */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Application Title in Discord ("Listening to ...")
              </span>
              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '12px', color: 'var(--accent-cyan)', textDecoration: 'none' }}
              >
                Discord Developer Portal ↗
              </a>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Discord generates the status header (e.g. <strong>"Listening to FreQ"</strong>) using the name of the Application in Discord's Developer Portal. If you create a free application named <code>FreQ</code>, paste its Application ID below to display <strong>Listening to FreQ</strong>:
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Paste Application ID (Default: 1177081335727267940)"
                value={customAppId}
                onChange={e => setCustomAppId(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
              <button
                onClick={handleSaveCustomAppId}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#5865F2',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                Save
              </button>
            </div>

            {saveMessage && (
              <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>
                ✓ {saveMessage}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Stream Engine & Bridge */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} color="var(--accent-teal)" />
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Stream Resolution Bridge
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <div>
            <strong>Resolver:</strong> Native local <code>yt-dlp</code> process with residential IP extraction.
          </div>
          <div>
            <strong>Fallback:</strong> FreQ Vercel Cloud API (<code>https://freq-api.vercel.app</code>).
          </div>
          <div>
            <strong>Lyrics Engine:</strong> LRCLIB On-Device API with LRC timestamp parser and millisecond cue sync.
          </div>
        </div>
      </section>

      {/* Local Storage & Privacy */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HardDrive size={20} color="var(--accent-violet)" />
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Data & Privacy
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{likedCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Liked Songs</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{playlistCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Playlists</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{historyCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Listening History</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="var(--accent-teal)" />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            All library items and preferences live entirely on this machine in <code>freq_library.json</code>.
          </span>
        </div>

        <button
          onClick={onClearHistory}
          style={{
            alignSelf: 'flex-start',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#ef4444',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Clear Listening & Search History
        </button>
      </section>

      {/* About FreQ */}
      <section
        style={{
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Info size={20} color="var(--text-secondary)" />
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
            About FreQ Desktop
          </h2>
        </div>

        <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          FreQ is free software licensed under GPL v3.0. A music app that simply respects you:
          no ads, no subscriptions, no accounts, and no tracking. Your library never leaves your device.
        </p>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Version 1.0.0 Desktop • Built with Electron, Vite & Web Audio API
        </span>
      </section>
    </div>
  );
};
