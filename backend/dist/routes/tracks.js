"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ytmusic_1 = require("../ytmusic");
const router = (0, express_1.Router)();
router.get("/:id", async (req, res) => {
    try {
        const videoId = req.params.id;
        if (!videoId) {
            return res.status(400).json({ error: "Track ID is required" });
        }
        const ytmusic = await (0, ytmusic_1.getYtMusic)();
        const songFull = await ytmusic.getSong(videoId);
        const track = (0, ytmusic_1.normalizeSong)(songFull);
        if (!track) {
            return res.status(404).json({ error: "Track not found" });
        }
        return res.json(track);
    }
    catch (error) {
        console.error("Get track error:", error);
        return res.status(500).json({ error: "Failed to fetch track details", details: error.message });
    }
});
exports.default = router;
