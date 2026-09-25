import { Router, Request, Response } from "express";
import { getYtMusic } from "../ytmusic";

const router = Router();

// GET /api/lyrics/:id -> { available: boolean, lines: string[] }
// Lyrics come from YouTube Music when the track has them; many tracks
// don't, which is an honest 404 (available: false), never an error.
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id;
    if (!videoId) {
      return res.status(400).json({ available: false, lines: [], error: "Track ID is required" });
    }

    const ytmusic = await getYtMusic();
    let lyrics: string[] | null = null;
    try {
      lyrics = await ytmusic.getLyrics(videoId);
    } catch (lyricsError: any) {
      // No lyrics for this song (invalid browseId) — not a server error.
      return res.status(404).json({ available: false, lines: [] });
    }

    if (!lyrics || lyrics.length === 0) {
      return res.status(404).json({ available: false, lines: [] });
    }

    return res.json({ available: true, lines: lyrics });
  } catch (error: any) {
    console.error("Get lyrics error:", error);
    return res.status(500).json({ available: false, lines: [], error: "Failed to fetch lyrics", details: error.message });
  }
});

export default router;
