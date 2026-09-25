"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ytmusic_1 = require("../ytmusic");
const router = (0, express_1.Router)();
router.get("/", async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ error: "Query parameter 'q' is required" });
        }
        const ytmusic = await (0, ytmusic_1.getYtMusic)();
        let rawResults = [];
        try {
            rawResults = await ytmusic.searchSongs(query);
        }
        catch (err) {
            console.warn("searchSongs failed, falling back to search():", err);
            rawResults = await ytmusic.search(query);
        }
        const tracks = rawResults
            .map(ytmusic_1.normalizeSong)
            .filter((t) => t !== null);
        return res.json({ tracks });
    }
    catch (error) {
        console.error("Search error:", error);
        return res.status(500).json({ error: "Failed to search YTMusic", details: error.message });
    }
});
exports.default = router;
