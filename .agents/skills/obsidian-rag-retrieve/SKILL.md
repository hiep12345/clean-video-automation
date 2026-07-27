---
name: obsidian-rag-retrieve
description: >
  Retrieve curated channel formulas, policies, decisions, and reusable
  learnings from the workspace Obsidian vault with file-and-line citations.
  Use for requests that ask what the project already knows, how a channel is
  configured conceptually, which production rule applies, or whether a similar
  learning already exists. Do not use Obsidian as proof of current runtime,
  Buffer, upload, or analytics state.
triggers:
  - search obsidian
  - query knowledge base
  - what do we know about
  - find channel formula
  - retrieve project learning
  - tìm trong obsidian
  - truy vấn kho tri thức
---

# Obsidian Knowledge Retrieval

## Source boundary

Obsidian contains curated knowledge. SQLite, Notion, channel JSON, and runtime
APIs remain authoritative for current operational state.

## Procedure

1. Read `content-planner-kb/obsidian-kb/_shared/kb-protocol.md`.
2. Search using the repository entrypoint:

   ```powershell
   python content-planner-kb/scripts/kb_maintenance.py search --query "<question>" --limit 20
   ```

3. Open the highest-ranking notes that are directly relevant.
4. For channel work, also read its `MOC-*.md` and `channel-ssot.md`.
5. Answer with the relative note path and line number for every material claim.
6. If the question concerns current status, query the operational source
   instead of inferring from a note.

## Failure behavior

- No results: report that the curated vault has no matching evidence.
- Stale/conflicting notes: state the conflict and prefer the newer reviewed
  source; do not silently merge claims.
- Missing vault or failed lint: report the error and fall back to direct source
  inspection with `rg`.
