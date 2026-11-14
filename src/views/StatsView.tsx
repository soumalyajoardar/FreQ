import React from 'react';
import { BarChart3, Clock, Play, Disc3, Mic2, CalendarDays } from 'lucide-react';
import { MediaTrack } from '../types';
import { formatTime } from '../components/PlayerBar';
import { SquareArt } from '../components/SquareArt';
import { PlayStatEntry } from '../services/libraryStore';

interface StatsViewProps {
  stats: PlayStatEntry[];
  totalMs: number;
  onPlayTrack: (track: MediaTrack, queue?: MediaTrack[]) => void;
}

function dayKeyN(n: number): { key: string; label: string } {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return {
    key: `${d.getFullYear()}-${m}-${day}`,
    label: n === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' }),
  };
}

export const StatsView: React.FC<StatsViewProps> = ({ stats, totalMs, onPlayTrack }) => {
  const topTracks = stats.slice(0, 5);

  const artistAgg = new Map<string, { name: string; count: number; ms: number; artworkUrl: string | null }>();
  for (const s of stats) {
    const name = (s.track.artist || 'Unknown Artist').split(',')[0].trim() || 'Unknown Artist';
    const cur = artistAgg.get(name) || { name, count: 0, ms: 0, artworkUrl: null };
    cur.count += s.count;
    cur.ms += s.totalMs;
    if (!cur.artworkUrl && s.track.artworkUrl) cur.artworkUrl = s.track.artworkUrl;
    artistAgg.set(name, cur);
  }
  const topArtists = [...artistAgg.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  const last7 = [6, 5, 4, 3, 2, 1, 0].map(dayKeyN);
  const dayTotals = last7.map(({ key }) =>
    stats.reduce((sum, s) => sum + (s.byDay[key] || 0), 0),
  );
  const maxDay = Math.max(1, ...dayTotals);
  const totalPlays = stats.reduce((sum, s) => sum + s.count, 0);
  const totalMin = Math.round(totalMs / 60000);

  const card: React.CSSProperties = {
    borderRadius: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }} className="view-enter">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <BarChart3 size={26} color="#fff" />
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>
          Your Stats
        </h1>
      </div>

      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        {[
          { icon: <Clock size={16} color="var(--accent-cyan)" />, value: `${totalMin}`, label: 'Minutes listened' },
          { icon: <Play size={16} color="var(--accent-violet)" />, value: `${totalPlays}`, label: 'Total plays' },
          { icon: <Disc3 size={16} color="var(--accent-teal)" />, value: `${stats.length}`, label: 'Unique tracks' },
        ].map((c, i) => (
          <div key={i} style={{ ...card, padding: '18px 20px', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{c.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Last 7 days */}
      <section style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarDays size={16} color="#fff" />
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Last 7 days</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '120px' }}>
          {last7.map(({ key, label }, i) => {
            const h = Math.max(4, Math.round((dayTotals[i] / maxDay) * 104));
            return (
              <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {dayTotals[i] > 0 ? `${Math.round(dayTotals[i] / 60000)}m` : ''}
                </span>
                <div
                  title={`${label}: ${Math.round(dayTotals[i] / 60000)} min`}
                  style={{ width: '100%', maxWidth: '44px', height: `${h}px`, borderRadius: '8px', backgroundColor: i === 6 ? '#f8fafc' : 'rgba(255, 255, 255, 0.18)', transition: 'height 0.4s ease' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {/* Top tracks */}
        <section style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Disc3 size={16} color="#fff" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Top tracks</h2>
          </div>
          {topTracks.length === 0 && (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Play something to fill your charts.</span>
          )}
          {topTracks.map((s, i) => (
            <div
              key={s.track.id}
              onClick={() => onPlayTrack(s.track)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '12px', cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.02)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
            >
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-muted)', width: '20px', textAlign: 'center' }}>{i + 1}</span>
              <SquareArt src={s.track.artworkUrl} videoId={s.track.id} alt={s.track.title} fit="cover" style={{ width: '40px', height: '40px', borderRadius: '10px' }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.track.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{s.track.artist} • {s.count} plays • {formatTime(Math.round(s.totalMs / 1000))}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Top artists */}
        <section style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mic2 size={16} color="#fff" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Top artists</h2>
          </div>
          {topArtists.length === 0 && (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Your most-played voices will appear here.</span>
          )}
          {topArtists.map((a, i) => (
            <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-muted)', width: '20px', textAlign: 'center' }}>{i + 1}</span>
              <SquareArt src={a.artworkUrl} videoId={undefined} alt={a.name} fit="cover" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{a.count} plays • {Math.round(a.ms / 60000)} min</div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};
