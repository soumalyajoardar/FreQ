"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ytmusic_1 = require("../ytmusic");
const router = (0, express_1.Router)();
router.get("/", async (req, res) => {
    try {
        const ytmusic = await (0, ytmusic_1.getYtMusic)();
        const homeSections = await ytmusic.getHomeSections();
        const sections = homeSections
            .map((sec) => ({
            title: sec.title || "Featured",
            items: (sec.contents || [])
                .map(ytmusic_1.normalizeHomeItem)
                .filter((item) => item !== null),
        }))
            .filter((sec) => sec.items.length > 0);
        return res.json({ sections });
    }
    catch (error) {
        console.error("Home error:", error);
        return res.status(500).json({ error: "Failed to fetch home sections", details: error.message });
    }
});
exports.default = router;
