"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ytmusic_1 = require("../ytmusic");
const router = (0, express_1.Router)();
router.get("/:id", async (req, res) => {
    try {
        const playlistId = req.params.id;
        if (!playlistId)
            return res.status(400).json({ error: "Playlist ID is required" });
        const ytmusic = await (0, ytmusic_1.getYtMusic)();
        let playlistFull = null;
        try {
            playlistFull = await ytmusic.getPlaylist(playlistId);
        }
        catch (err) {
            if (!playlistId.startsWith("VL")) {
                try {
                    playlistFull = await ytmusic.getPlaylist("VL" + playlistId);
                }
                catch (e) {
                    // ignore
                }
            }
        }
        if (!playlistFull) {
            return res.status(404).json({ error: "Playlist not found or invalid ID" });
        }
        let videos = [];
        try {
            videos = await ytmusic.getPlaylistVideos(playlistFull.playlistId || playlistId);
        }
        catch (e) {
            videos = playlistFull.videos || playlistFull.content || [];
        }
        const tracks = videos
            .map(ytmusic_1.normalizeSong)
            .filter((t) => t !== null);
        return res.json({
            id: playlistFull.playlistId || playlistId,
            title: playlistFull.name || "Untitled Playlist",
            description: null,
            author: playlistFull.artist?.name || "YouTube Music",
            artworkUrl: (0, ytmusic_1.normalizeThumbnail)(playlistFull.thumbnails),
            tracks,
        });
    }
    catch (error) {
        console.error("Playlist error:", error);
        return res.status(500).json({ error: "Failed to fetch playlist", details: error.message });
    }
});
exports.default = router;
