import json
import os
import sqlite3
import sys
import subprocess
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

# Configuration
PORT = 8300
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
DB_PATH = PROJECT_ROOT / ".agents" / "state" / "channel.db"
OUTPUT_DIR = PROJECT_ROOT / "content-planner-kb" / "output"

class DashboardHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # Serve API: list videos from database
        if path == "/api/videos":
            self.get_videos()
            return

        # Serve API: sync database
        if path == "/api/sync":
            self.sync_db()
            return

        # Serve static assets from output folder (videos, thumbnails, review results)
        if path.startswith("/output/"):
            # Strip leading '/output/' and resolve on disk
            rel_path = path[len("/output/"):]
            file_path = (OUTPUT_DIR / rel_path).resolve()
            
            # Security check: prevent directory traversal
            if str(file_path).startswith(str(OUTPUT_DIR)):
                if file_path.exists() and file_path.is_file():
                    mime_type = self.guess_mime(file_path)
                    self.serve_local_file(file_path, mime_type)
                    return
            self.send_error(404, "File not found")
            return

        # Serve static dashboard files
        super().do_GET()

    def serve_local_file(self, file_path, content_type):
        try:
            stat = file_path.stat()
            size = stat.st_size
            
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", size)
            self.send_header("Accept-Ranges", "bytes")
            self.end_headers()
            
            with open(file_path, "rb") as f:
                self.wfile.write(f.read())
        except Exception as e:
            self.send_error(500, str(e))

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
        if not DB_PATH.exists():
            self.send_error(500, f"Database not found at {DB_PATH}")
            return
            
        try:
            conn = sqlite3.connect(str(DB_PATH))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Fetch all records
            cursor.execute("""
                SELECT video_id, channel, title, status, produced_at, uploaded_at, 
                       qa_score, file_size_mb, fb_video_id, organism_latin, organism_common
                FROM topic_catalog
                ORDER BY produced_at DESC, video_id DESC
            """)
            rows = cursor.fetchall()
            
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
                
            conn.close()
            
            # Send JSON response
            body = json.dumps({"ok": True, "videos": videos}, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
            
        except Exception as e:
            self.send_error(500, str(e))

    def sync_db(self):
        try:
            # Run channel_db sync & backfill
            scripts_dir = PROJECT_ROOT / "content-planner-kb"
            python_exe = PROJECT_ROOT / "flowkit-engine" / "venv" / "Scripts" / "python.exe"
            if not python_exe.exists():
                python_exe = "python"
                
            # Run sync
            subprocess.run([str(python_exe), "scripts/channel_db.py", "sync"], cwd=str(scripts_dir), check=True)
            # Run backfill
            subprocess.run([str(python_exe), "scripts/channel_db.py", "backfill"], cwd=str(scripts_dir), check=True)
            
            body = json.dumps({"ok": True, "message": "Database synced and backfilled successfully!"}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_error(500, str(e))

if __name__ == "__main__":
    # Ensure Cwd is the dashboard folder to serve its files
    dashboard_dir = Path(__file__).parent.resolve()
    os.chdir(str(dashboard_dir))
    
    print(f"============================================================")
    print(f"Antigravity Video Automation Dashboard Server")
    print(f"   URL: http://localhost:{PORT}")
    print(f"============================================================")
    
    server = HTTPServer(("127.0.0.1", PORT), DashboardHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down dashboard server.")
