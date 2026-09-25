import express, { Request, Response } from "express"
import searchRouter from "./routes/search"
import tracksRouter from "./routes/tracks"
import homeRouter from "./routes/home"
import artistsRouter from "./routes/artists"
import albumsRouter from "./routes/albums"
import playlistsRouter from "./routes/playlists"
import lyricsRouter from "./routes/lyrics"
import { getYtMusic } from "./ytmusic"

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.use(express.json())

// GET /health
app.get("/health", async (req: Request, res: Response) => {
  try {
    await getYtMusic()
    return res.json({ ok: true })
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message })
  }
})

// Routes
app.use("/api/search", searchRouter)
app.use("/api/tracks", tracksRouter)
app.use("/api/home", homeRouter)
app.use("/api/artists", artistsRouter)
app.use("/api/albums", albumsRouter)
app.use("/api/playlists", playlistsRouter)
app.use("/api/lyrics", lyricsRouter)

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FreQ YTMusic Backend listening on http://0.0.0.0:${PORT}`)
})
