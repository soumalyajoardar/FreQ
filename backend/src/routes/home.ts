import { Router, Request, Response } from "express"
import { getYtMusic, normalizeHomeItem } from "../ytmusic"

const router = Router()

router.get("/", async (req: Request, res: Response) => {
  try {
    const ytmusic = await getYtMusic()
    const homeSections = await ytmusic.getHomeSections()

    const sections = homeSections
      .map((sec: any) => ({
        title: sec.title || "Featured",
        items: (sec.contents || [])
          .map(normalizeHomeItem)
          .filter((item: any) => item !== null),
      }))
      .filter((sec: any) => sec.items.length > 0)

    return res.json({ sections })
  } catch (error: any) {
    console.error("Home error:", error)
    return res.status(500).json({ error: "Failed to fetch home sections", details: error.message })
  }
})

export default router
