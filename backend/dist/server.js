"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const search_1 = __importDefault(require("./routes/search"));
const tracks_1 = __importDefault(require("./routes/tracks"));
const home_1 = __importDefault(require("./routes/home"));
const artists_1 = __importDefault(require("./routes/artists"));
const albums_1 = __importDefault(require("./routes/albums"));
const playlists_1 = __importDefault(require("./routes/playlists"));
const ytmusic_1 = require("./ytmusic");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3000;
app.use(express_1.default.json());
// GET /health
app.get("/health", async (req, res) => {
    try {
        await (0, ytmusic_1.getYtMusic)();
        return res.json({ ok: true });
    }
    catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
    }
});
// Routes
app.use("/api/search", search_1.default);
app.use("/api/tracks", tracks_1.default);
app.use("/api/home", home_1.default);
app.use("/api/artists", artists_1.default);
app.use("/api/albums", albums_1.default);
app.use("/api/playlists", playlists_1.default);
app.listen(PORT, "0.0.0.0", () => {
    console.log(`FreQ YTMusic Backend listening on http://0.0.0.0:${PORT}`);
});
