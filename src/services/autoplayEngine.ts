import { CatalogSection, MediaTrack, UserPlaylist } from '../types';
import { ytMusicService } from './ytmusic';

export class AutoplayEngine {
  public static async generateAutoplayQueue(
    currentTrack: MediaTrack,
    likedTracks: MediaTrack[] = [],
    recentlyPlayed: MediaTrack[] = [],
    userPlaylists: UserPlaylist[] = [],
    catalogSections: CatalogSection[] = [],
    limit: Int = 15
  ): Promise<MediaTrack[]> {
    const currentArtist = currentTrack.artist.trim().toLowerCase();
    const candidateMap = new Map<string, { track: MediaTrack; score: number }>();

    // 1. Build artist affinity map
    const artistAffinity = new Map<string, number>();

    likedTracks.forEach(t => {
      const a = t.artist.trim().toLowerCase();
      if (a) artistAffinity.set(a, (artistAffinity.get(a) || 0) + 3);
    });

    userPlaylists.forEach(p => {
      p.tracks.forEach(t => {
        const a = t.artist.trim().toLowerCase();
        if (a) artistAffinity.set(a, (artistAffinity.get(a) || 0) + 2);
      });
    });

    recentlyPlayed.forEach(t => {
      const a = t.artist.trim().toLowerCase();
      if (a) artistAffinity.set(a, (artistAffinity.get(a) || 0) + 2);
    });

    // 2. Fetch seed artist search results to guarantee strong vibe matches
    let seedPool: MediaTrack[] = [];
    try {
      seedPool = await ytMusicService.search(currentTrack.artist);
    } catch (_e) {
      // Continue with available pool
    }

    // 3. Harvest candidates from seedPool, catalog sections, and user data
    const allPool: { track: MediaTrack; sourceRank: number }[] = [];

    seedPool.forEach((track, idx) => {
      allPool.push({ track, sourceRank: 10 - Math.min(idx, 9) });
    });

    catalogSections.forEach(sec => {
      const isTrending = /hit|trend|pop|essential/i.test(sec.title);
      sec.items.forEach((item, idx) => {
        if (item.type === 'song') {
          allPool.push({
            track: {
              id: item.id,
              title: item.title,
              artist: item.artist || 'Unknown Artist',
              album: item.album || 'Single',
              durationSeconds: item.durationSeconds || 194,
              artworkUrl: item.artworkUrl,
              provider: 'youtube_music',
            },
            sourceRank: (isTrending ? 5 : 2) + Math.max(0, 5 - idx),
          });
        }
      });
    });

    // 4. Score each candidate
    allPool.forEach(({ track, sourceRank }) => {
      if (!track.id || track.id === currentTrack.id) return;

      const trackArtist = track.artist.trim().toLowerCase();
      let score = sourceRank;

      // Artist exact match
      if (trackArtist === currentArtist) {
        score += 25;
      } else if (trackArtist.includes(currentArtist) || currentArtist.includes(trackArtist)) {
        score += 15;
      }

      // Title word similarity match
      const currentWords = currentTrack.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const trackWords = track.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      currentWords.forEach(w => {
        if (trackWords.includes(w)) score += 4;
      });

      // User affinity bonus
      const userAffinity = artistAffinity.get(trackArtist) || 0;
      score += userAffinity;

      const existing = candidateMap.get(track.id);
      if (!existing || existing.score < score) {
        candidateMap.set(track.id, { track, score });
      }
    });

    // 5. Sort descending by score and pick top limit
    const sorted = Array.from(candidateMap.values())
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.track)
      .slice(0, limit);

    return sorted;
  }
}
type Int = number;
