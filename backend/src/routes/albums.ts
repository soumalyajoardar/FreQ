import { Router, Request, Response } from "express"
import { getYtMusic, normalizeSong, normalizeThumbnail } from "../ytmusic"

const router = Router()

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const albumId = req.params.id
    if (!albumId) return res.status(400).json({ error: "Album ID is required" })

    const ytmusic = await getYtMusic()
    const albumFull = await ytmusic.getAlbum(albumId)

    const artistName = albumFull.artist?.name || "Unknown Artist"
    const artistId = albumFull.artist?.artistId || null

    const tracks = (albumFull.songs || [])
      .map((song: any) => {
        const normalized = normalizeSong(song)
        if (normalized) {
          return {
            ...normalized,
            album: albumFull.name || normalized.album,
            artist: normalized.artist === "Unknown Artist" ? artistName : normalized.artist,
          }
        }
        return null
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)

    return res.json({
      id: albumFull.albumId || albumId,
      title: albumFull.name || "Untitled Album",
      artist: artistName,
      artistId,
      year: albumFull.year ? String(albumFull.year) : null,
      artworkUrl: normalizeThumbnail(albumFull.thumbnails),
      tracks,
    })
  } catch (error: any) {
    console.error("Album error:", error)
    return res.status(500).json({ error: "Failed to fetch album", details: error.message })
  }
})

export default router
