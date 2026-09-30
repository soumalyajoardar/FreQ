import { AlbumDetails, ArtistDetails, CatalogItem, CatalogSection, MediaTrack } from '../types';

const BASE_URL = 'https://freq-api.vercel.app';

// Upgrades YouTube / Google thumbnails to 544x544 or maxres
export function upgradeArtworkUrl(url: string | null | undefined, videoId?: string): string | null {
  if (!url || url === 'null') {
    if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
    return null;
  }

  try {
    if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
      const sizeRegex = /=(?:w\d+-h\d+|s\d+)(-[^=]+)?$/;
      if (sizeRegex.test(url)) {
        return url.replace(sizeRegex, '=w544-h544-l90-rj');
      } else if (!url.includes('=')) {
        return `${url}=w544-h544-l90-rj`;
      }
    } else if (url.includes('i.ytimg.com')) {
      const viRegex = /\/vi\/([^/]+)\/(?:default|mqdefault|hqdefault|sddefault)\.jpg$/;
      if (viRegex.test(url)) {
        return url.replace(viRegex, '/vi/$1/hq720.jpg');
      }
    }
  } catch (_e) {
    // Keep original
  }
  return url;
}

export function normalizeTrack(raw: any): MediaTrack {
  const id = raw.id || raw.videoId || '';
  const title = raw.title || raw.name || 'Unknown Track';
  let artist = 'Unknown Artist';

  if (typeof raw.artist === 'string' && raw.artist !== 'null') {
    artist = raw.artist;
  } else if (raw.artist && raw.artist.name) {
    artist = raw.artist.name;
  } else if (Array.isArray(raw.artists) && raw.artists.length > 0) {
    artist = raw.artists
      .map((a: any) => (typeof a === 'string' ? a : a.name || ''))
      .filter(Boolean)
      .join(', ');
  }

  let album = 'Single';
  if (typeof raw.album === 'string' && raw.album !== 'null') {
    album = raw.album;
  } else if (raw.album && raw.album.name) {
    album = raw.album.name;
  }

  let durationSeconds = 194;
  if (typeof raw.durationSeconds === 'number' && raw.durationSeconds > 0) {
    durationSeconds = raw.durationSeconds;
  } else if (typeof raw.durationMs === 'number' && raw.durationMs > 0) {
    durationSeconds = Math.round(raw.durationMs / 1000);
  } else if (typeof raw.duration === 'number' && raw.duration > 0) {
    durationSeconds = raw.duration;
  }

  const artworkUrl = upgradeArtworkUrl(raw.artworkUrl || raw.thumbnail || raw.thumbnails?.[0]?.url, id);

  return {
    id,
    title,
    artist,
    album,
    durationSeconds,
    artworkUrl,
    provider: 'youtube_music',
  };
}

class YtMusicService {
  async search(query: string): Promise<MediaTrack[]> {
    if (!query || query.trim().length < 1) return [];
    const trimmed = query.trim();

    try {
      const res = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        const rawList: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.tracks)
          ? data.tracks
          : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.songs)
          ? data.songs
          : [];
        if (rawList.length > 0) {
          return rawList.map(normalizeTrack);
        }
      }
    } catch (err) {
      console.warn('Cloud search error, falling back to local extractor:', err);
    }

    // Fallback: local yt-dlp search bridge
    if (window.electronAPI?.searchTracks) {
      try {
        const fallbackResults = await window.electronAPI.searchTracks(trimmed);
        if (Array.isArray(fallbackResults) && fallbackResults.length > 0) {
          return fallbackResults.map(normalizeTrack);
        }
      } catch (fbErr) {
        console.error('Local yt-dlp search fallback failed:', fbErr);
      }
    }

    return [];
  }

  async getHome(): Promise<{ sections: CatalogSection[] }> {
    try {
      const res = await fetch(`${BASE_URL}/api/home`);
      if (!res.ok) throw new Error(`Home failed: ${res.statusText}`);
      const data = await res.json();
      if (!data || !Array.isArray(data.sections)) return { sections: [] };

      const sections: CatalogSection[] = data.sections.map((sec: any) => ({
        title: sec.title || 'Featured',
        items: (sec.items || []).map((item: any) => {
          const type = (item.type || 'song').toLowerCase() as any;
          const id = item.id || item.videoId || item.albumId || item.playlistId || '';
          return {
            type,
            id,
            title: item.title || item.name || 'Untitled',
            artist: item.artist || undefined,
            artistId: item.artistId || null,
            album: item.album || null,
            year: item.year || null,
            durationSeconds: item.durationMs ? Math.round(item.durationMs / 1000) : 194,
            artworkUrl: upgradeArtworkUrl(item.artworkUrl, id),
          };
        }),
      }));

      return { sections };
    } catch (err) {
      console.error('YtMusic getHome error:', err);
      return { sections: [] };
    }
  }

  async getArtist(artistId: string): Promise<ArtistDetails | null> {
    if (!artistId) return null;
    try {
      const res = await fetch(`${BASE_URL}/api/artists/${artistId}`);
      if (!res.ok) throw new Error(`Artist failed: ${res.statusText}`);
      const data = await res.json();
      return {
        id: data.id || artistId,
        name: data.name || 'Unknown Artist',
        description: data.description,
        artworkUrl: upgradeArtworkUrl(data.artworkUrl),
        topSongs: (data.topSongs || []).map(normalizeTrack),
        albums: (data.albums || []).map((alb: any) => ({
          type: 'album',
          id: alb.id,
          title: alb.title || 'Untitled Album',
          artist: alb.artist || data.name,
          year: alb.year,
          artworkUrl: upgradeArtworkUrl(alb.artworkUrl),
        })),
      };
    } catch (err) {
      console.error('YtMusic getArtist error:', err);
      return null;
    }
  }

  async getAlbum(albumId: string): Promise<AlbumDetails | null> {
    if (!albumId) return null;
    try {
      const res = await fetch(`${BASE_URL}/api/albums/${albumId}`);
      if (!res.ok) throw new Error(`Album failed: ${res.statusText}`);
      const data = await res.json();
      return {
        id: data.id || albumId,
        title: data.title || 'Untitled Album',
        artist: data.artist || 'Unknown Artist',
        artistId: data.artistId,
        year: data.year,
        artworkUrl: upgradeArtworkUrl(data.artworkUrl),
        tracks: (data.tracks || []).map(normalizeTrack),
      };
    } catch (err) {
      console.error('YtMusic getAlbum error:', err);
      return null;
    }
  }
}

export const ytMusicService = new YtMusicService();
