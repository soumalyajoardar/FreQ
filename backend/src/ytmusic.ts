import YTMusic from "ytmusic-api"

let ytmusicInstance: YTMusic | null = null
let isInitializing = false

export async function getYtMusic(): Promise<YTMusic> {
  if (ytmusicInstance) return ytmusicInstance

  if (!isInitializing) {
    isInitializing = true
    try {
      const instance = new YTMusic()
      await instance.initialize()
      ytmusicInstance = instance
    } finally {
      isInitializing = false
    }
  } else {
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    if (ytmusicInstance) return ytmusicInstance
  }

  if (!ytmusicInstance) {
    throw new Error("Failed to initialize YTMusic instance")
  }
  return ytmusicInstance
}

export interface NormalizedTrack {
  id: string
  title: string
  artist: string
  album: string
  durationMs: number
  artworkUrl: string | null
  provider: string
}

export function normalizeThumbnail(thumbnails: any[]): string | null {
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) return null
  const sorted = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0))
  return sorted[0]?.url || null
}

export function normalizeSong(item: any): NormalizedTrack | null {
  if (!item) return null

  const videoId = item.videoId || item.id
  if (!videoId) return null

  const title = item.name || item.title || "Unknown Title"

  let artist = "Unknown Artist"
  if (item.artist && typeof item.artist === "object" && item.artist.name) {
    artist = item.artist.name
  } else if (Array.isArray(item.artists) && item.artists.length > 0) {
    artist = item.artists.map((a: any) => (typeof a === "string" ? a : a.name || "")).filter(Boolean).join(", ")
  } else if (typeof item.artist === "string" && !/^\d+:\d+$/.test(item.artist)) {
    artist = item.artist
  }

  let album = "Single"
  if (item.album && typeof item.album === "object" && item.album.name) {
    album = item.album.name
  } else if (typeof item.album === "string") {
    album = item.album
  }

  let durationMs = 0
  if (typeof item.duration === "number") {
    durationMs = item.duration * 1000
  } else if (typeof item.durationMs === "number") {
    durationMs = item.durationMs
  }

  const artworkUrl = normalizeThumbnail(item.thumbnails)

  return {
    id: videoId,
    title,
    artist,
    album,
    durationMs,
    artworkUrl,
    provider: "youtube_music",
  }
}

export function normalizeHomeItem(item: any): any {
  if (!item) return null
  const type = (item.type || "").toLowerCase()
  const id = item.videoId || item.albumId || item.playlistId || item.artistId || item.id
  if (!id) return null

  const title = item.name || item.title || "Untitled"
  let artist = "Unknown Artist"
  let artistId: string | null = null

  if (item.artist) {
    if (typeof item.artist === "string") artist = item.artist
    else if (item.artist.name) {
      artist = item.artist.name
      artistId = item.artist.artistId || null
    }
  } else if (Array.isArray(item.artists) && item.artists.length > 0) {
    artist = item.artists.map((a: any) => (typeof a === "string" ? a : a.name || "")).filter(Boolean).join(", ")
  }

  const artworkUrl = normalizeThumbnail(item.thumbnails)

  return {
    type: type || "song",
    id,
    title,
    artist,
    artistId,
    album: typeof item.album === "string" ? item.album : item.album?.name || null,
    year: item.year ? String(item.year) : null,
    durationMs: typeof item.duration === "number" ? item.duration * 1000 : item.durationMs || 0,
    artworkUrl,
    provider: "youtube_music",
  }
}
