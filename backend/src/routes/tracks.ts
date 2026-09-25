import { Router, Request, Response } from "express"
import { getYtMusic, normalizeSong } from "../ytmusic"

const router = Router()

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id
    if (!videoId) {
      return res.status(400).json({ error: "Track ID is required" })
    }

    const ytmusic = await getYtMusic()
    const songFull = await ytmusic.getSong(videoId)
    const track = normalizeSong(songFull)

    if (!track) {
      return res.status(404).json({ error: "Track not found" })
    }

    return res.json(track)
  } catch (error: any) {
    console.error("Get track error:", error)
    return res.status(500).json({ error: "Failed to fetch track details", details: error.message })
  }
})

export default router
