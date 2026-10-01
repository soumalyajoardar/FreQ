import { CatalogSection, MediaTrack, UserPlaylist } from '../types';
import { ytMusicService } from './ytmusic';
import {
  isSameAlbum,
  isSameSong,
  scriptScore,
  sectionPopularityBonus,
  sharedTitleTokens,
  MAX_TOKEN_HITS,
  TOKEN_BONUS,
  SAME_ALBUM_BONUS,
} from './vibeMatch';

// Port of Android AutoplayEngine.kt — same weights and ordering.
export class AutoplayEngine {
  public static DEFAULT_LIMIT = 15;
  public static POSITION_NUDGE_MAX = 6;

  public static async generateAutoplayQueue(
    currentTrack: MediaTrack,
    likedTracks: MediaTrack[] = [],
    recentlyPlayed: MediaTrack[] = [],
    userPlaylists: UserPlaylist[] = [],
    catalogSections: CatalogSection[] = [],
    limit: number = 15,
  ): Promise<MediaTrack[]> {
    const currentArtistKey = (currentTrack.artist || '').trim().toLowerCase();
    const artistAffinity = new Map<string, number>();
    const bump = (artist: string, w: number) => {
      const k = (artist || '').trim().toLowerCase();
      if (k) artistAffinity.set(k, (artistAffinity.get(k) || 0) + w);
    };
    likedTracks.forEach(t => bump(t.artist, 3));
    recentlyPlayed.forEach(t => bump(t.artist, 2));
    userPlaylists.forEach(p => p.tracks.forEach(t => bump(t.artist, 2)));

    let seedPool: MediaTrack[] = [];
    try {
      seedPool = await ytMusicService.search(currentTrack.artist);
    } catch {
      // continue with available pool
    }

    const candidates = new Map<string, MediaTrack>();
    const sectionBonusById = new Map<string, number>();
    const positionById = new Map<string, number>();
    let flatIndex = 0;
    for (const sec of catalogSections) {
      const bonus = sectionPopularityBonus(sec.title);
      for (const item of sec.items) {
        if (item.type !== 'song' || !item.id) { flatIndex++; continue; }
        if (!candidates.has(item.id)) {
          candidates.set(item.id, {
            id: item.id,
            title: item.title,
            artist: item.artist || 'Unknown Artist',
            album: item.album || 'Single',
            durationSeconds: item.durationSeconds || 194,
            artworkUrl: item.artworkUrl,
            provider: 'youtube_music',
          });
          positionById.set(item.id, flatIndex);
        }
        if (bonus > (sectionBonusById.get(item.id) || 0)) sectionBonusById.set(item.id, bonus);
        flatIndex++;
      }
    }
    for (const track of seedPool) {
      if (!track.id || candidates.has(track.id)) { flatIndex++; continue; }
      candidates.set(track.id, track);
      if (!positionById.has(track.id)) positionById.set(track.id, flatIndex);
      flatIndex++;
    }
    likedTracks.forEach(t => { if (t.id && !candidates.has(t.id)) candidates.set(t.id, t); });
    recentlyPlayed.forEach(t => { if (t.id && !candidates.has(t.id)) candidates.set(t.id, t); });
    userPlaylists.forEach(p => p.tracks.forEach(t => { if (t.id && !candidates.has(t.id)) candidates.set(t.id, t); }));

    const eligible = Array.from(candidates.values()).filter(
      t => t.id !== currentTrack.id && !isSameSong(currentTrack, t),
    );
    if (eligible.length === 0) return [];

    const likedIds = new Set(likedTracks.map(t => t.id));
    const recentIds = new Set(recentlyPlayed.slice(0, 20).map(t => t.id));
    const libraryContext = [...recentlyPlayed, ...likedTracks, ...userPlaylists.flatMap(p => p.tracks)];

    const scored = eligible.map(track => {
      const artistKey = (track.artist || '').trim().toLowerCase();
      let score = (artistAffinity.get(artistKey) || 0) * 5;
      if (artistKey && artistKey === currentArtistKey) score += 20;
      if (isSameAlbum(currentTrack, track)) score += SAME_ALBUM_BONUS;
      score += scriptScore(currentTrack, track, libraryContext);
      score += Math.min(sharedTitleTokens(currentTrack, track), MAX_TOKEN_HITS) * TOKEN_BONUS;
      score += sectionBonusById.get(track.id) || 0;
      const pos = positionById.get(track.id);
      if (pos !== undefined) score += Math.max(0, AutoplayEngine.POSITION_NUDGE_MAX - pos);
      if (likedIds.has(track.id)) score += 8;
      if (recentIds.has(track.id)) score += 4;
      return { track, score };
    });

    return scored
      .sort((a, b) => b.score - a.score || a.track.title.localeCompare(b.track.title))
      .map(s => s.track)
      .slice(0, limit);
  }

  public static isAutoplaySafeToGenerate(existingQueueSize: number, isExplicitQueue: boolean): boolean {
    return !isExplicitQueue && existingQueueSize <= 1;
  }
}
