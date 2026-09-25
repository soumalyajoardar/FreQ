import { Router, Request, Response } from "express"
import { getYtMusic, normalizeSong } from "../ytmusic"

const router = Router()

router.get("/", async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Query parameter 'q' is required" })
    }

    const ytmusic = await getYtMusic()
    let rawResults: any[] = []

    try {
      rawResults = await ytmusic.searchSongs(query)
    } catch (err) {
      console.warn("searchSongs failed, falling back to search():", err)
      rawResults = await ytmusic.search(query)
    }

    const tracks = rawResults
      .map(normalizeSong)
      .filter((t): t is NonNullable<typeof t> => t !== null)

    return res.json({ tracks })
  } catch (error: any) {
    console.error("Search error:", error)
    return res.status(500).json({ error: "Failed to search YTMusic", details: error.message })
  }
})

export default router
