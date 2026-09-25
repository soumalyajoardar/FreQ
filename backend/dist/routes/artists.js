"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ytmusic_1 = require("../ytmusic");
const router = (0, express_1.Router)();
router.get("/:id", async (req, res) => {
    try {
        const artistId = req.params.id;
        if (!artistId)
            return res.status(400).json({ error: "Artist ID is required" });
        const ytmusic = await (0, ytmusic_1.getYtMusic)();
        const artistFull = await ytmusic.getArtist(artistId);
        let albums = [];
        try {
            albums = await ytmusic.getArtistAlbums(artistId);
        }
        catch (e) {
            albums = artistFull.albums || [];
        }
        const topSongs = (artistFull.topSongs || [])
            .map(ytmusic_1.normalizeSong)
            .filter((t) => t !== null);
        const normalizedAlbums = albums.map((alb) => ({
            type: "album",
            id: alb.albumId || alb.id,
            title: alb.name || alb.title || "Untitled Album",
            artist: artistFull.name,
            year: alb.year ? String(alb.year) : null,
            artworkUrl: (0, ytmusic_1.normalizeThumbnail)(alb.thumbnails),
            provider: "youtube_music",
        }));
        return res.json({
            id: artistFull.artistId || artistId,
            name: artistFull.name || "Unknown Artist",
            description: null,
            artworkUrl: (0, ytmusic_1.normalizeThumbnail)(artistFull.thumbnails),
            topSongs,
            albums: normalizedAlbums,
        });
    }
    catch (error) {
        console.error("Artist error:", error);
        return res.status(500).json({ error: "Failed to fetch artist", details: error.message });
    }
});
exports.default = router;
