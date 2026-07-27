"""Unit tests for dashboard server helpers."""

import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

from dashboard.server import parse_byte_range, query_video_records, resolve_output_file


class DashboardServerTests(unittest.TestCase):
    def test_resolve_output_file_blocks_traversal_and_prefix_collision(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir) / "output"
            output_dir.mkdir()

            self.assertEqual(
                resolve_output_file(output_dir, "channel/video.mp4"),
                output_dir.resolve() / "channel" / "video.mp4",
            )
            self.assertIsNone(resolve_output_file(output_dir, "../outside.mp4"))
            self.assertIsNone(resolve_output_file(output_dir, "%2e%2e/outside.mp4"))

    def test_parse_byte_range(self):
        self.assertIsNone(parse_byte_range(None, 100))
        self.assertEqual(parse_byte_range("bytes=10-19", 100), (10, 19))
        self.assertEqual(parse_byte_range("bytes=90-", 100), (90, 99))
        self.assertEqual(parse_byte_range("bytes=-10", 100), (90, 99))

        with self.assertRaises(ValueError):
            parse_byte_range("bytes=100-120", 100)
        with self.assertRaises(ValueError):
            parse_byte_range("bytes=0-1,5-6", 100)

    def test_query_video_records_joins_latest_upload(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "channel.db"
            with closing(sqlite3.connect(db_path)) as conn:
                conn.executescript(
                    """
                    CREATE TABLE topic_catalog (
                        video_id TEXT,
                        channel TEXT,
                        title TEXT,
                        status TEXT,
                        produced_at TEXT,
                        qa_score REAL,
                        file_size_mb REAL,
                        fb_video_id TEXT,
                        organism_latin TEXT,
                        organism_common TEXT
                    );
                    CREATE TABLE upload_log (
                        video_id TEXT,
                        channel TEXT,
                        fb_video_id TEXT,
                        uploaded_at TEXT
                    );
                    INSERT INTO topic_catalog VALUES (
                        'video-1', 'science', 'Title', 'produced',
                        '2026-07-24T10:00:00', 9.0, 12.5, NULL, 'Latin', 'Common'
                    );
                    INSERT INTO upload_log VALUES
                        ('video-1', 'science', 'fb-old', '2026-07-24T11:00:00'),
                        ('video-1', 'science', 'fb-new', '2026-07-24T12:00:00');
                    """
                )
                conn.commit()

            rows = query_video_records(db_path)

            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["uploaded_at"], "2026-07-24T12:00:00")
            self.assertEqual(rows[0]["fb_video_id"], "fb-new")


if __name__ == "__main__":
    unittest.main()
