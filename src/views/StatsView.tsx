import React from 'react';
import { Clock, Play, Disc3, Mic2, CalendarDays } from 'lucide-react';
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

  return (
    <div className="fq-view view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingTop: '18px', maxWidth: '1080px' }}>
      <header className="fq-page-head">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span className="fq-kicker">Listening report</span>
          <h1 className="fq-h1">Insights</h1>
        </div>
        <span className="fq-chip">
          <CalendarDays size={12} />
          Last 7 days
        </span>
      </header>

      <div className="fq-stat-grid">
        {[
          { icon: <Clock size={13} />, value: `${totalMin}`, unit: 'min', label: 'Time listened' },
          { icon: <Play size={13} />, value: `${totalPlays}`, unit: '', label: 'Total plays' },
          { icon: <Disc3 size={13} />, value: `${stats.length}`, unit: '', label: 'Unique tracks' },
        ].map((c, i) => (
          <div key={i} className="fq-stat">
            <span className="fq-chip" style={{ alignSelf: 'flex-start', height: '24px' }}>{c.icon}{c.label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
              <span className="fq-stat-value">{c.value}</span>
              {c.unit && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      <section className="fq-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="fq-section-head">
          <div className="fq-section-title-wrap">
            <h2 className="fq-h3">Listening rhythm</h2>
            <span className="fq-muted" style={{ fontSize: '11.5px' }}>Minutes per day this week</span>
          </div>
        </div>

        <div className="fq-bars">
          {last7.map(({ key, label }, i) => {
            const h = Math.max(4, Math.round((dayTotals[i] / maxDay) * 112));
            return (
              <div key={key} className="fq-bar-col">
                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', height: '12px' }}>
                  {dayTotals[i] > 0 ? `${Math.round(dayTotals[i] / 60000)}m` : ''}
                </span>
                <div
                  className={`fq-bar${i === 6 ? ' is-today' : ''}`}
                  title={`${label}: ${Math.round(dayTotals[i] / 60000)} min`}
                  style={{ height: `${h}px` }}
                />
                <span style={{ fontSize: '10.5px', color: i === 6 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i === 6 ? 700 : 550 }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        <section className="fq-panel" style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px 10px' }}>
            <Disc3 size={14} color="var(--text-secondary)" />
            <h2 className="fq-h3">Top tracks</h2>
          </div>
          {topTracks.length === 0 && (
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', padding: '0 4px 8px' }}>
              Play something to fill your charts.
            </span>
          )}
          {topTracks.map((s, i) => (
            <div key={s.track.id} onClick={() => onPlayTrack(s.track)} className="fq-trow" style={{ height: '54px', cursor: 'pointer' }}>
              <span className="fq-tnum">{String(i + 1).padStart(2, '0')}</span>
              <div className="fq-tmain">
                <SquareArt src={s.track.artworkUrl} videoId={s.track.id} alt={s.track.title} fit="cover" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span className="fq-ttitle">{s.track.title}</span>
                  <span className="fq-tsub">
                    {s.count} plays · {formatTime(Math.round(s.totalMs / 1000))}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="fq-panel" style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px 10px' }}>
            <Mic2 size={14} color="var(--text-secondary)" />
            <h2 className="fq-h3">Top artists</h2>
          </div>
          {topArtists.length === 0 && (
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', padding: '0 4px 8px' }}>
              Your most-played voices will appear here.
            </span>
          )}
          {topArtists.map((a, i) => (
            <div key={a.name} className="fq-trow" style={{ height: '54px', cursor: 'default' }}>
              <span className="fq-tnum">{String(i + 1).padStart(2, '0')}</span>
              <div className="fq-tmain">
                <SquareArt src={a.artworkUrl} videoId={undefined} alt={a.name} fit="cover" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span className="fq-ttitle">{a.name}</span>
                  <span className="fq-tsub">
                    {a.count} plays · {Math.round(a.ms / 60000)} min
                  </span>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};
