import asyncio
import logging
import re
import threading
import time
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import ytmusicapi

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="FreQ YTMusic Python Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ytmusic: Optional[ytmusicapi.YTMusic] = None


def get_ytmusic() -> ytmusicapi.YTMusic:
    global ytmusic
    if ytmusic is None:
        ytmusic = ytmusicapi.YTMusic()
    return ytmusic


def get_highest_res_thumbnail(thumbnails: Any) -> Optional[str]:
    if not thumbnails or not isinstance(thumbnails, list):
        return None
    sorted_thumbs = sorted(
        thumbnails,
        key=lambda x: x.get("width", 0) if isinstance(x, dict) else 0,
        reverse=True,
    )
    return sorted_thumbs[0].get("url") if sorted_thumbs else None


AUDIO_STREAM_CACHE: Dict[str, Dict[str, Any]] = {}
AUDIO_CACHE_LOCK = threading.Lock()
# Last yt-dlp failure per track (truncated) — surfaced via /api/playback
# `details` so serverless failures can be diagnosed without log access.
_LAST_EXTRACT_ERRORS: Dict[str, str] = {}
# googlevideo URLs typically expire in ~6h; refresh a bit earlier.
STREAM_CACHE_TTL_SEC = 5 * 60 * 60

VIDEO_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{11}$")


def _mime_from_ext(ext: Optional[str]) -> str:
    ext = (ext or "").lower()
    return {
        "m4a": "audio/mp4",
        "mp4": "audio/mp4",
        "webm": "audio/webm",
        "opus": "audio/opus",
        "ogg": "audio/ogg",
        "mp3": "audio/mpeg",
        "flac": "audio/flac",
        "wav": "audio/wav",
    }.get(ext, "audio/webm" if ext == "webm" else f"audio/{ext}" if ext else "audio/webm")


def _expiry_from_url(url: str, default_ttl: int = STREAM_CACHE_TTL_SEC) -> int:
    """Parse googlevideo `expire` query param to compute real TTL."""
    try:
        qs = parse_qs(urlparse(url).query)
        exp_vals = qs.get("expire")
        if exp_vals:
            expires_at = int(exp_vals[0])
            ttl = expires_at - int(time.time()) - 60  # 60s safety margin
            if 60 < ttl < 24 * 3600:
                return ttl
    except Exception:
        pass
    return default_ttl


def _pick_best_audio(info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # Direct single-format result (e.g. direct googlevideo URL)
    if info.get("url"):
        return info
    # Merged formats (video+audio) selected via requested_formats
    requested = info.get("requested_formats")
    if isinstance(requested, list) and requested:
        audio_only = [f for f in requested if f.get("acodec") not in (None, "none")]
        pool = audio_only or requested
        pool = [f for f in pool if f.get("url")]
        if pool:
            return max(
                pool,
                key=lambda f: (
                    float(f.get("abr") or 0),
                    float(f.get("tbr") or 0),
                    int(f.get("filesize") or f.get("filesize_approx") or 0),
                ),
            )
    formats = info.get("formats")
    if isinstance(formats, list) and formats:
        audio_formats = [
            f
            for f in formats
            if f.get("url")
            and f.get("acodec") not in (None, "none")
            and f.get("vcodec") in (None, "none")
        ]
        pool = audio_formats or [f for f in formats if f.get("url")]
        if pool:
            # Prefer opus/m4a audio, then highest bitrate
            def _score(f: Dict[str, Any]) -> Tuple:
                ext = (f.get("ext") or "").lower()
                ext_pref = {"opus": 3, "webm": 2, "m4a": 2, "mp3": 1}.get(ext, 0)
                return (
                    ext_pref,
                    float(f.get("abr") or 0),
                    float(f.get("tbr") or 0),
                    int(f.get("filesize") or f.get("filesize_approx") or 0),
                )

            return max(pool, key=_score)
    return None


def _extract_stream_sync(track_id: str) -> Tuple[str, str, int]:
    """Blocking yt-dlp extraction. Returns (stream_url, mime_type, ttl_sec)."""
    from yt_dlp import YoutubeDL

    base_opts: Dict[str, Any] = {
        "format": "bestaudio[ext=m4a]/bestaudio[ext=opus]/bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
        "nocheckcertificate": True,
        "geo_bypass": True,
        "socket_timeout": 8,
        "retries": 2,
        "fragment_retries": 2,
        "extractor_retries": 2,
        "concurrent_fragment_downloads": 1,
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        },
    }
    # Fallback opts: the embed player endpoint is far less aggressively
    # blocked on datacenter / serverless IPs ("Video unavailable" with the
    # default clients). tv_embedded typically yields an opus/webm stream,
    # which ExoPlayer plays natively.
    embedded_opts: Dict[str, Any] = {
        **base_opts,
        "extractor_args": {"youtube": {"player_client": ["tv_embedded"]}},
    }
    # music.youtube.com works best for music videoIds; fall back to youtube.com
    urls = [
        f"https://music.youtube.com/watch?v={track_id}",
        f"https://www.youtube.com/watch?v={track_id}",
    ]
    attempts = [(u, base_opts) for u in urls] + [(u, embedded_opts) for u in urls]
    last_error: Optional[Exception] = None
    for url, ydl_opts in attempts:
        try:
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
            if not info:
                continue
            chosen = _pick_best_audio(info)
            if chosen and chosen.get("url"):
                stream_url = chosen["url"]
                mime = _mime_from_ext(chosen.get("ext"))
                # yt-dlp sometimes reports odd mime; normalize via ext
                ttl = _expiry_from_url(stream_url)
                return stream_url, mime, ttl
        except Exception as e:  # noqa: BLE001 - surface as unavailable below
            last_error = e
            logging.warning(f"yt-dlp extraction failed for {url}: {e}")
            continue
    raise RuntimeError(
        f"Could not resolve audio stream for track {track_id}: {last_error}"
    )


def _get_cached_stream(track_id: str) -> Optional[Dict[str, Any]]:
    with AUDIO_CACHE_LOCK:
        entry = AUDIO_STREAM_CACHE.get(track_id)
        if entry and entry.get("expires_at", 0) > time.time():
            return entry
        if entry:
            AUDIO_STREAM_CACHE.pop(track_id, None)
    return None


def _put_cached_stream(track_id: str, url: str, mime: str, ttl: int) -> None:
    with AUDIO_CACHE_LOCK:
        AUDIO_STREAM_CACHE[track_id] = {
            "url": url,
            "mime": mime,
            "expires_at": time.time() + max(ttl, 60),
            "fetched_at": time.time(),
        }


async def resolve_playback(track_id: str) -> Tuple[Optional[str], Optional[str], int]:
    """Resolve (stream_url, mime_type, ttl). Uses cache + threadpool for yt-dlp."""
    if not track_id or not track_id.strip():
        return None, None, 0
    track_id = track_id.strip()
    cached = _get_cached_stream(track_id)
    if cached:
        ttl = max(int(cached["expires_at"] - time.time()), 0)
        return cached["url"], cached["mime"], ttl
    try:
        url, mime, ttl = await asyncio.to_thread(_extract_stream_sync, track_id)
    except Exception as e:
        logging.error(f"Playback resolution error for {track_id}: {e}")
        with AUDIO_CACHE_LOCK:
            _LAST_EXTRACT_ERRORS[track_id] = str(e)[:500]
        return None, None, 0
    _put_cached_stream(track_id, url, mime, ttl)
    return url, mime, ttl


def resolve_authorized_playback_url(track_id: str) -> Optional[str]:
    """Sync compat helper (uses cache only; async path preferred)."""
    if not track_id:
        return None
    cached = _get_cached_stream(track_id.strip())
    return cached["url"] if cached else None


def normalize_song(item: Any) -> Optional[Dict[str, Any]]:
    if not item or not isinstance(item, dict):
        return None

    video_id = item.get("videoId") or item.get("id")
    if not video_id:
        return None

    title = item.get("title") or item.get("name") or "Unknown Title"

    artist_name = "Unknown Artist"
    artists = item.get("artists")
    if isinstance(artists, list) and len(artists) > 0:
        names = [a.get("name") if isinstance(a, dict) else str(a) for a in artists]
        artist_name = ", ".join(filter(None, names)) or "Unknown Artist"
    elif isinstance(item.get("artist"), dict) and item["artist"].get("name"):
        artist_name = item["artist"]["name"]
    elif isinstance(item.get("artist"), str):
        artist_name = item["artist"]
    elif item.get("author"):
        if isinstance(item["author"], str):
            artist_name = item["author"]
        elif isinstance(item["author"], list):
            artist_name = ", ".join(
                [a.get("name", "") for a in item["author"] if isinstance(a, dict)]
            )

    album_name = "Single"
    album = item.get("album")
    if isinstance(album, dict) and album.get("name"):
        album_name = album["name"]
    elif isinstance(album, str):
        album_name = album

    duration_ms = 0
    if item.get("duration_seconds") is not None:
        duration_ms = int(item["duration_seconds"]) * 1000
    elif item.get("durationSeconds") is not None:
        duration_ms = int(item["durationSeconds"]) * 1000
    elif item.get("lengthSeconds") is not None:
        duration_ms = int(item["lengthSeconds"]) * 1000
    elif item.get("durationMs") is not None:
        duration_ms = int(item["durationMs"])

    artwork_url = get_highest_res_thumbnail(item.get("thumbnails"))
    if not artwork_url and isinstance(item.get("thumbnail"), dict):
        artwork_url = get_highest_res_thumbnail(item["thumbnail"].get("thumbnails"))

    return {
        "id": video_id,
        "title": title,
        "artist": artist_name,
        "album": album_name,
        "durationMs": duration_ms,
        "artworkUrl": artwork_url,
        "provider": "youtube_music",
    }


def normalize_home_item(item: Any) -> Optional[Dict[str, Any]]:
    if not item or not isinstance(item, dict):
        return None

    item_type = (item.get("resultType") or item.get("type") or "").lower()
    item_id = (
        item.get("videoId")
        or item.get("albumId")
        or item.get("playlistId")
        or item.get("browseId")
        or item.get("id")
    )
    if not item_id:
        return None

    title = item.get("title") or item.get("name") or "Untitled"

    artist = None
    artists = item.get("artists")
    if isinstance(artists, list) and len(artists) > 0:
        artist = ", ".join([a.get("name", "") for a in artists if isinstance(a, dict)])
    elif isinstance(item.get("artist"), dict):
        artist = item["artist"].get("name")
    elif isinstance(item.get("artist"), str):
        artist = item["artist"]

    artwork_url = get_highest_res_thumbnail(item.get("thumbnails"))

    if not item_type:
        if item.get("videoId"):
            item_type = "song"
        elif item.get("playlistId") or (
            item_id and (item_id.startswith("PL") or item_id.startswith("RD"))
        ):
            item_type = "playlist"
        elif item.get("albumId") or (item_id and item_id.startswith("MPRE")):
            item_type = "album"
        else:
            item_type = "playlist"

    return {
        "type": item_type,
        "id": item_id,
        "title": title,
        "artist": artist,
        "artistId": None,
        "album": item.get("album", {}).get("name")
        if isinstance(item.get("album"), dict)
        else item.get("album"),
        "year": item.get("year"),
        "durationMs": (item.get("duration_seconds") or 0) * 1000,
        "artworkUrl": artwork_url,
        "provider": "youtube_music",
    }


@app.get("/health")
def health():
    try:
        get_ytmusic()
        return {"ok": True}
    except Exception as e:
        logging.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail={"ok": False, "error": str(e)})


@app.get("/api/search")
def search(q: str = Query(..., description="Search query")):
    if not q or not q.strip():
        raise HTTPException(
            status_code=400, detail={"error": "Query parameter 'q' is required"}
        )
    try:
        yt = get_ytmusic()
        try:
            results = yt.search(q, filter="songs")
        except Exception:
            results = yt.search(q)

        tracks = []
        for item in results:
            normalized = normalize_song(item)
            if normalized:
                tracks.append(normalized)

        return {"tracks": tracks}
    except Exception as e:
        logging.error(f"Search error: {e}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to search YTMusic", "details": str(e)},
        )


@app.get("/api/tracks/{track_id}")
def get_track(track_id: str):
    if not track_id or not track_id.strip():
        raise HTTPException(status_code=400, detail={"error": "Track ID is required"})
    try:
        yt = get_ytmusic()
        raw_song = yt.get_song(track_id)
        details = raw_song.get("videoDetails", {})
        if not details:
            raise HTTPException(status_code=404, detail={"error": "Track not found"})

        normalized = normalize_song(details)
        if not normalized:
            raise HTTPException(status_code=404, detail={"error": "Track parsing failed"})

        return normalized
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get track error: {e}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to fetch track details", "details": str(e)},
        )


@app.get("/api/playback/{track_id}")
async def get_playback(track_id: str):
    if not track_id or not track_id.strip():
        raise HTTPException(status_code=400, detail={"error": "Track ID is required"})
    track_id = track_id.strip()
    try:
        stream_url, mime_type, ttl = await resolve_playback(track_id)
        if stream_url:
            return {
                "available": True,
                "trackId": track_id,
                "streamUrl": stream_url,
                "mimeType": mime_type or "audio/webm",
                "expiresIn": ttl,
            }
        with AUDIO_CACHE_LOCK:
            details = _LAST_EXTRACT_ERRORS.get(track_id)
        return {
            "available": False,
            "trackId": track_id,
            "error": "No playable audio stream found (region-locked, age-restricted, or removed)",
            **({"details": details} if details else {}),
        }
    except Exception as e:
        logging.error(f"Playback resolution error: {e}")
        return {"available": False, "trackId": track_id, "error": str(e)}


@app.get("/api/stream/{track_id}")
async def stream_redirect(track_id: str):
    """307 redirect straight to the googlevideo URL.

    Useful as ExoPlayer data source: `GET {base}/api/stream/{videoId}`.
    Follows the same cache as /api/playback so repeated plays don't
    re-run yt-dlp extraction.
    """
    if not track_id or not track_id.strip():
        raise HTTPException(status_code=400, detail={"error": "Track ID is required"})
    track_id = track_id.strip()
    stream_url, mime_type, _ = await resolve_playback(track_id)
    if not stream_url:
        raise HTTPException(status_code=404, detail={"error": "No playable stream"})
    return RedirectResponse(url=stream_url, status_code=307)


@app.get("/api/watch/{track_id}")
def get_watch(track_id: str, limit: int = Query(default=25, le=50)):
    """Up-next / autoplay queue via ytmusicapi `get_watch_playlist`.

    This is pure ytmusicapi (no yt-dlp) and powers radio/continuous play.
    """
    if not track_id or not track_id.strip():
        raise HTTPException(status_code=400, detail={"error": "Track ID is required"})
    try:
        yt = get_ytmusic()
        watch = yt.get_watch_playlist(track_id.strip(), limit=limit)
        tracks = []
        for item in watch.get("tracks", []):
            normalized = normalize_song(item)
            if normalized:
                tracks.append(normalized)
        return {
            "trackId": track_id,
            "playlistId": watch.get("playlistId"),
            "tracks": tracks,
        }
    except Exception as e:
        logging.error(f"Watch playlist error: {e}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to fetch watch playlist", "details": str(e)},
        )


@app.get("/api/home")
def get_home():
    try:
        yt = get_ytmusic()
        home_sections = yt.get_home(limit=6)

        sections = []
        for sec in home_sections:
            title = sec.get("title") or "Featured"
            items = []
            for content in sec.get("contents", []):
                norm = normalize_home_item(content)
                if norm:
                    items.append(norm)
            if items:
                sections.append({"title": title, "items": items})

        return {"sections": sections}
    except Exception as e:
        logging.error(f"Home error: {e}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to fetch home sections", "details": str(e)},
        )


@app.get("/api/artists/{artist_id}")
def get_artist(artist_id: str):
    if not artist_id or not artist_id.strip():
        raise HTTPException(status_code=400, detail={"error": "Artist ID is required"})
    try:
        yt = get_ytmusic()
        artist_full = yt.get_artist(artist_id)

        top_songs_raw = artist_full.get("songs", {}).get("results", [])
        top_songs = [
            normalize_song(s) for s in top_songs_raw if normalize_song(s) is not None
        ]

        albums_raw = artist_full.get("albums", {}).get("results", [])
        singles_raw = artist_full.get("singles", {}).get("results", [])
        combined_albums = albums_raw + singles_raw

        normalized_albums = []
        for alb in combined_albums:
            alb_id = alb.get("browseId") or alb.get("audioPlaylistId") or alb.get("id")
            if alb_id:
                normalized_albums.append(
                    {
                        "type": "album",
                        "id": alb_id,
                        "title": alb.get("title") or "Untitled Album",
                        "artist": artist_full.get("name") or "Unknown Artist",
                        "year": alb.get("year"),
                        "artworkUrl": get_highest_res_thumbnail(alb.get("thumbnails")),
                        "provider": "youtube_music",
                    }
                )

        return {
            "id": artist_full.get("channelId") or artist_id,
            "name": artist_full.get("name") or "Unknown Artist",
            "description": artist_full.get("description"),
            "artworkUrl": get_highest_res_thumbnail(artist_full.get("thumbnails")),
            "topSongs": top_songs,
            "albums": normalized_albums,
        }
    except Exception as e:
        logging.error(f"Artist error: {e}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to fetch artist", "details": str(e)},
        )


@app.get("/api/albums/{album_id}")
def get_album(album_id: str):
    if not album_id or not album_id.strip():
        raise HTTPException(status_code=400, detail={"error": "Album ID is required"})
    try:
        yt = get_ytmusic()
        album_full = yt.get_album(album_id)

        artists = album_full.get("artists", [])
        artist_name = (
            artists[0].get("name")
            if artists and isinstance(artists[0], dict)
            else "Unknown Artist"
        )
        artist_id = (
            artists[0].get("id")
            if artists and isinstance(artists[0], dict)
            else None
        )

        tracks = []
        for track in album_full.get("tracks", []):
            norm = normalize_song(track)
            if norm:
                norm["album"] = album_full.get("title") or norm["album"]
                if norm["artist"] == "Unknown Artist":
                    norm["artist"] = artist_name
                tracks.append(norm)

        return {
            "id": album_full.get("audioPlaylistId") or album_id,
            "title": album_full.get("title") or "Untitled Album",
            "artist": artist_name,
            "artistId": artist_id,
            "year": album_full.get("year"),
            "artworkUrl": get_highest_res_thumbnail(album_full.get("thumbnails")),
            "tracks": tracks,
        }
    except Exception as e:
        logging.error(f"Album error: {e}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to fetch album", "details": str(e)},
        )


@app.get("/api/playlists/{playlist_id}")
def get_playlist(playlist_id: str):
    if not playlist_id or not playlist_id.strip():
        raise HTTPException(status_code=400, detail={"error": "Playlist ID is required"})
    try:
        yt = get_ytmusic()

        target_id = playlist_id
        if not target_id.startswith("VL") and (
            target_id.startswith("PL") or target_id.startswith("RD")
        ):
            target_id = "VL" + target_id

        try:
            playlist_full = yt.get_playlist(target_id)
        except Exception:
            playlist_full = yt.get_playlist(playlist_id)

        author_data = playlist_full.get("author")
        author_name = (
            author_data.get("name")
            if isinstance(author_data, dict)
            else str(author_data or "YouTube Music")
        )

        tracks = []
        for track in playlist_full.get("tracks", []):
            norm = normalize_song(track)
            if norm:
                tracks.append(norm)

        return {
            "id": playlist_full.get("id") or playlist_id,
            "title": playlist_full.get("title") or "Untitled Playlist",
            "description": playlist_full.get("description"),
            "author": author_name,
            "artworkUrl": get_highest_res_thumbnail(playlist_full.get("thumbnails")),
            "tracks": tracks,
        }
    except Exception as e:
        logging.error(f"Playlist error: {e}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to fetch playlist", "details": str(e)},
        )
