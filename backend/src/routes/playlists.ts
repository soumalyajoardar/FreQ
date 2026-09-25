import { Router, Request, Response } from "express"
import { getYtMusic, normalizeSong, normalizeThumbnail } from "../ytmusic"

const router = Router()

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const playlistId = req.params.id
    if (!playlistId) return res.status(400).json({ error: "Playlist ID is required" })

    const ytmusic = await getYtMusic()
    let playlistFull: any = null

    try {
      playlistFull = await ytmusic.getPlaylist(playlistId)
    } catch (err) {
      if (!playlistId.startsWith("VL")) {
        try {
          playlistFull = await ytmusic.getPlaylist("VL" + playlistId)
        } catch (e) {
          // ignore
        }
      }
    }

    if (!playlistFull) {
      return res.status(404).json({ error: "Playlist not found or invalid ID" })
    }

    let videos: any[] = []
    try {
      videos = await ytmusic.getPlaylistVideos(playlistFull.playlistId || playlistId)
    } catch (e) {
      videos = (playlistFull as any).videos || (playlistFull as any).content || []
    }

    const tracks = videos
      .map(normalizeSong)
      .filter((t): t is NonNullable<typeof t> => t !== null)

    return res.json({
      id: playlistFull.playlistId || playlistId,
      title: playlistFull.name || "Untitled Playlist",
      description: null,
      author: playlistFull.artist?.name || "YouTube Music",
      artworkUrl: normalizeThumbnail(playlistFull.thumbnails),
      tracks,
    })
  } catch (error: any) {
    console.error("Playlist error:", error)
    return res.status(500).json({ error: "Failed to fetch playlist", details: error.message })
  }
})

export default router
