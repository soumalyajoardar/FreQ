"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ytmusic_1 = require("../ytmusic");
const router = (0, express_1.Router)();
router.get("/:id", async (req, res) => {
    try {
        const albumId = req.params.id;
        if (!albumId)
            return res.status(400).json({ error: "Album ID is required" });
        const ytmusic = await (0, ytmusic_1.getYtMusic)();
        const albumFull = await ytmusic.getAlbum(albumId);
        const artistName = albumFull.artist?.name || "Unknown Artist";
        const artistId = albumFull.artist?.artistId || null;
        const tracks = (albumFull.songs || [])
            .map((song) => {
            const normalized = (0, ytmusic_1.normalizeSong)(song);
            if (normalized) {
                return {
                    ...normalized,
                    album: albumFull.name || normalized.album,
                    artist: normalized.artist === "Unknown Artist" ? artistName : normalized.artist,
                };
            }
            return null;
        })
            .filter((t) => t !== null);
        return res.json({
            id: albumFull.albumId || albumId,
            title: albumFull.name || "Untitled Album",
            artist: artistName,
            artistId,
            year: albumFull.year ? String(albumFull.year) : null,
            artworkUrl: (0, ytmusic_1.normalizeThumbnail)(albumFull.thumbnails),
            tracks,
        });
    }
    catch (error) {
        console.error("Album error:", error);
        return res.status(500).json({ error: "Failed to fetch album", details: error.message });
    }
});
exports.default = router;
