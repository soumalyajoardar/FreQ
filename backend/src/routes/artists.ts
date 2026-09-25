import { Router, Request, Response } from "express"
import { getYtMusic, normalizeSong, normalizeThumbnail } from "../ytmusic"

const router = Router()

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const artistId = req.params.id
    if (!artistId) return res.status(400).json({ error: "Artist ID is required" })

    const ytmusic = await getYtMusic()
    const artistFull = await ytmusic.getArtist(artistId)

    let albums: any[] = []
    try {
      albums = await ytmusic.getArtistAlbums(artistId)
    } catch (e) {
      albums = (artistFull as any).albums || []
    }

    const topSongs = (artistFull.topSongs || [])
      .map(normalizeSong)
      .filter((t): t is NonNullable<typeof t> => t !== null)

    const normalizedAlbums = albums.map((alb: any) => ({
      type: "album",
      id: alb.albumId || alb.id,
      title: alb.name || alb.title || "Untitled Album",
      artist: artistFull.name,
      year: alb.year ? String(alb.year) : null,
      artworkUrl: normalizeThumbnail(alb.thumbnails),
      provider: "youtube_music",
    }))

    return res.json({
      id: artistFull.artistId || artistId,
      name: artistFull.name || "Unknown Artist",
      description: null,
      artworkUrl: normalizeThumbnail(artistFull.thumbnails),
      topSongs,
      albums: normalizedAlbums,
    })
  } catch (error: any) {
    console.error("Artist error:", error)
    return res.status(500).json({ error: "Failed to fetch artist", details: error.message })
  }
})

export default router
