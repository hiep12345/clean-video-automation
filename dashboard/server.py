import json
import logging
import os
import sqlite3
import subprocess
from contextlib import closing
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

# Configuration
PORT = 8300
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
DB_PATH = PROJECT_ROOT / ".agents" / "state" / "channel.db"
OUTPUT_DIR = PROJECT_ROOT / "content-planner-kb" / "output"
CHUNK_SIZE = 1024 * 1024
ALLOWED_ORIGINS = {
    f"http://127.0.0.1:{PORT}",
    f"http://localhost:{PORT}",
}

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def resolve_output_file(output_dir: Path, relative_path: str) -> Path | None:
    """Resolve an output path while preventing traversal and prefix collisions."""
    root = output_dir.resolve()
    candidate = (root / unquote(relative_path)).resolve()
    return candidate if candidate.is_relative_to(root) else None


def parse_byte_range(header_value: str | None, size: int) -> tuple[int, int] | None:
    """Parse a single HTTP byte range, returning inclusive start/end offsets."""
    if not header_value:
        return None
    if not header_value.startswith("bytes=") or "," in header_value:
        raise ValueError("Unsupported byte range")
    start_text, separator, end_text = header_value[6:].partition("-")
    if not separator:
        raise ValueError("Malformed byte range")
    if not start_text:
        suffix_length = int(end_text)
        if suffix_length <= 0:
            raise ValueError("Invalid suffix range")
        start = max(0, size - suffix_length)
        return start, size - 1
    start = int(start_text)
    end = int(end_text) if end_text else size - 1
    if start < 0 or start >= size or end < start:
        raise ValueError("Range outside file")
    return start, min(end, size - 1)


def query_video_records(db_path: Path) -> list[dict]:
    """Read dashboard records without creating or mutating the SQLite database."""
    if not db_path.exists():
        raise FileNotFoundError(db_path)
    uri = f"{db_path.resolve().as_uri()}?mode=ro"
    with closing(sqlite3.connect(uri, uri=True)) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            """
            SELECT
                topic.video_id,
                topic.channel,
                topic.title,
                topic.status,
                topic.produced_at,
                (
                    SELECT MAX(upload.uploaded_at)
                    FROM upload_log AS upload
                    WHERE upload.video_id = topic.video_id
                      AND upload.channel = topic.channel
                ) AS uploaded_at,
                topic.qa_score,
                topic.file_size_mb,
                COALESCE(
                    topic.fb_video_id,
                    (
                        SELECT upload.fb_video_id
                        FROM upload_log AS upload
                        WHERE upload.video_id = topic.video_id
                          AND upload.channel = topic.channel
                          AND upload.fb_video_id IS NOT NULL
                        ORDER BY upload.uploaded_at DESC
                        LIMIT 1
                    )
                ) AS fb_video_id,
                topic.organism_latin,
                topic.organism_common
            FROM topic_catalog AS topic
            ORDER BY topic.produced_at DESC, topic.video_id DESC
            """
        )
        try:
            rows = cursor.fetchall()
        finally:
            cursor.close()
    return [dict(row) for row in rows]

class DashboardHandler(SimpleHTTPRequestHandler):
    server_version = "CleanVideoDashboard/1.0"

    def _origin_allowed(self) -> bool:
        """Allow same-origin browser requests and non-browser local clients."""
        origin = self.headers.get("Origin")
        return origin is None or origin in ALLOWED_ORIGINS

    def send_json(self, status: int, payload: dict) -> None:
        """Send a UTF-8 JSON response with an explicit content length."""
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if not self._origin_allowed():
            self.send_error(403, "Origin not allowed")
            return
        self.send_response(204)
        origin = self.headers.get("Origin")
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # Serve API: list videos from database
        if path == "/api/videos":
            self.get_videos()
            return

        if path == "/api/sync":
            self.send_error(405, "Use POST for database sync")
            return

        # Serve static assets from output folder (videos, thumbnails, review results)
        if path.startswith("/output/"):
            # Strip leading '/output/' and resolve on disk
            rel_path = path[len("/output/"):]
            file_path = resolve_output_file(OUTPUT_DIR, rel_path)
            if file_path and file_path.exists() and file_path.is_file():
                mime_type = self.guess_mime(file_path)
                self.serve_local_file(file_path, mime_type)
                return
            self.send_error(404, "File not found")
            return

        # Serve static dashboard files
        super().do_GET()

    def do_POST(self):
        """Handle state-changing API operations."""
        if not self._origin_allowed():
            self.send_error(403, "Origin not allowed")
            return
        if urlparse(self.path).path == "/api/sync":
            self.sync_db()
            return
        self.send_error(404, "Not found")

    def serve_local_file(self, file_path, content_type):
        try:
            size = file_path.stat().st_size
            try:
                byte_range = parse_byte_range(self.headers.get("Range"), size)
            except (ValueError, TypeError):
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.end_headers()
                return

            start, end = byte_range or (0, size - 1)
            self.send_response(206 if byte_range else 200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(end - start + 1))
            self.send_header("Accept-Ranges", "bytes")
            if byte_range:
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.end_headers()

            with file_path.open("rb") as file_handle:
                file_handle.seek(start)
                remaining = end - start + 1
                while remaining:
                    chunk = file_handle.read(min(CHUNK_SIZE, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            logger.info("Client disconnected while streaming %s", file_path)
        except OSError:
            logger.exception("Failed to serve local file %s", file_path)
            self.send_error(500, "Unable to serve file")

    def guess_mime(self, path: Path):
        ext = path.suffix.lower()
        if ext == ".mp4":
            return "video/mp4"
        elif ext in (".jpg", ".jpeg"):
            return "image/jpeg"
        elif ext == ".png":
            return "image/png"
        elif ext == ".json":
            return "application/json"
        elif ext == ".review":
            return "text/plain"
        return "application/octet-stream"

    def get_videos(self):
        try:
            rows = query_video_records(DB_PATH)
            videos = []
            for row in rows:
                video_id = row["video_id"]
                channel = row["channel"]
                
                # Check for local video path
                video_rel_path = f"fb-reels/{channel}/{video_id}/final.mp4"
                video_exists = (OUTPUT_DIR / video_rel_path).exists()
                
                # Check for local thumbnail path
                thumb_rel_path = f"fb-reels/{channel}/{video_id}/thumbnail.jpg"
                thumb_exists = (OUTPUT_DIR / thumb_rel_path).exists()

                # Try to load QA observations if review_results.json exists
                observations = None
                qa_results_path = OUTPUT_DIR / f"fb-reels/{channel}/{video_id}/review_results.json"
                if qa_results_path.exists():
                    try:
                        with open(qa_results_path, "r", encoding="utf-8") as qf:
                            q_data = json.load(qf)
                            observations = q_data.get("observations")
                    except Exception:
                        pass
                
                videos.append({
                    "video_id": video_id,
                    "channel": channel,
                    "title": row["title"] or video_id.replace("-", " ").title(),
                    "status": row["status"],
                    "produced_at": row["produced_at"],
                    "uploaded_at": row["uploaded_at"],
                    "qa_score": row["qa_score"],
                    "file_size_mb": row["file_size_mb"],
                    "fb_video_id": row["fb_video_id"],
                    "organism_latin": row["organism_latin"],
                    "organism_common": row["organism_common"],
                    "has_video": video_exists,
                    "video_url": f"/output/{video_rel_path}" if video_exists else None,
                    "has_thumbnail": thumb_exists,
                    "thumbnail_url": f"/output/{thumb_rel_path}" if thumb_exists else "/assets/placeholder.jpg",
                    "observations": observations
                })
                
            self.send_json(200, {"ok": True, "videos": videos})
        except FileNotFoundError:
            logger.error("Dashboard database does not exist: %s", DB_PATH)
            self.send_json(503, {"ok": False, "error": "Dashboard database is unavailable"})
        except (sqlite3.Error, OSError):
            logger.exception("Failed to read dashboard database")
            self.send_json(500, {"ok": False, "error": "Unable to load dashboard data"})

    def sync_db(self):
        try:
            # Run channel_db sync & backfill
            scripts_dir = PROJECT_ROOT / "content-planner-kb"
            python_exe = PROJECT_ROOT / "flowkit-engine" / "venv" / "Scripts" / "python.exe"
            if not python_exe.exists():
                python_exe = "python"
                
            # Run sync
            subprocess.run(
                [str(python_exe), "scripts/channel_db.py", "sync"],
                cwd=str(scripts_dir),
                check=True,
                timeout=300,
            )
            # Run backfill
            subprocess.run(
                [str(python_exe), "scripts/channel_db.py", "backfill"],
                cwd=str(scripts_dir),
                check=True,
                timeout=300,
            )
            self.send_json(200, {"ok": True, "message": "Database synced and backfilled successfully!"})
        except (OSError, subprocess.SubprocessError):
            logger.exception("Database sync failed")
            self.send_json(500, {"ok": False, "error": "Database sync failed"})

if __name__ == "__main__":
    # Ensure Cwd is the dashboard folder to serve its files
    dashboard_dir = Path(__file__).parent.resolve()
    os.chdir(str(dashboard_dir))
    
    print(f"============================================================")
    print(f"Antigravity Video Automation Dashboard Server")
    print(f"   URL: http://localhost:{PORT}")
    print(f"============================================================")
    
    server = ThreadingHTTPServer(("127.0.0.1", PORT), DashboardHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down dashboard server.")
