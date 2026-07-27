---
name: reconcile-uploaded-content
description: "Đối soát content người dùng báo đã đăng/upload, cập nhật trạng thái và archive folder đã có bằng chứng"
---

# Reconcile uploaded content

Use this workflow when the user says content was already uploaded/published,
asks to remove posted items from Buffer, or asks to process specific uploaded
photo folders. Facebook publishing remains manual-only.

## Inputs and scope

- Require the exact channel and exact content IDs/folder names.
- Treat “all uploaded” as a separate destructive scope; do not infer it from a
  list of examples.
- Start read-only. Facebook discovery may use GET requests only.
- Archive, database, Drive and Notion writes require explicit user approval.
- Never edit or publish the Facebook post itself.

## Agent routing

1. The Antigravity parent remains Strategic Coordinator.
2. For a complex batch, invoke `analytics-manager` in read-only mode to inspect
   current Facebook/local/Buffer state for the exact IDs.
3. After explicit approval, invoke `system-developer` in write-scoped mode for
   only:
   - the exact photo folders;
   - `.agents/state/channel.db` and its backup;
   - publication receipts created by the deterministic reconciliation tool.
4. Neither specialist receives Git authority. The parent verifies all receipts,
   paths and database status after execution.

## Photo workflow

Run the exact-ID discovery first:

```text
python content-planner-kb/scripts/reconcile_facebook_photos.py \
  --channel <channel> --id <photo-id> [--id <photo-id> ...]
```

A batch is unsafe unless every requested photo has one unique match using both
text evidence and perceptual-image evidence. Do not use title-only or folder-
name-only matching.

After approval, repeat with `--apply`. Then preview the local archive:

```text
python content-planner-kb/scripts/archive_uploaded_photos.py \
  --channel <channel> --id <photo-id> [--id <photo-id> ...]
```

Only after the preview validates every item may the same exact command be
repeated with `--apply`. The archive command must confirm a numeric Facebook
object ID, matching `uploaded.flag`, matching `facebook_publication.json`,
matching published-image hash and matching QA receipt hash.

The expected destination is:

```text
content-planner-kb/output/fb-posts/archive/<channel>/<folder>
```

The command updates `channel.db.media_path` in the same rollback-protected
batch. Do not move folders manually.

Legacy folders under `fb-posts/<channel>/_archive` are not proof of Facebook
publication. Normalize them separately with
`normalize_legacy_photo_archive.py`; the tool must reject any folder carrying
an upload/QA/publication receipt and register accepted drafts as `retired`, not
`uploaded`.

## Buffer and external services

- Uploaded content is publication history and must not be sent back through
  Drive distribution.
- Existing Notion pages may be updated to `Upload Status = Uploaded` using
  exact `--id` scope when the user separately authorizes Notion writes.
- Keep historical Notion pages; the active Buffer view should filter for
  `Upload Status = Ready`.
- Do not run `--sync-facebook` or heuristic bulk reconciliation for an exact
  photo request.

## Completion evidence

Report for every requested ID:

- unique Facebook match and object ID present (redact tokens);
- `status=uploaded`;
- publication receipt and uploaded flag agree;
- active folder absent and archive folder present;
- `media_path` points to the archive;
- no Facebook publish, Drive upload or unrelated Notion mutation occurred;
- backup path and rollback/test results.
