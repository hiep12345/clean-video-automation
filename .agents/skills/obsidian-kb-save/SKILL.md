---
name: obsidian-kb-save
description: >
  Safely promote reviewed, reusable project knowledge into the curated
  Obsidian vault. Use when the user explicitly asks to save a durable learning,
  or when an approved graduation workflow promotes evidence-backed production
  knowledge. Search before writing, preserve curated sections, and run strict
  lint afterward.
triggers:
  - save to obsidian
  - store this learning
  - update knowledge base
  - graduate production learning
  - lưu vào obsidian
  - cập nhật kho tri thức
---

# Obsidian Knowledge Save

## Required gates

1. Read `content-planner-kb/obsidian-kb/_shared/kb-protocol.md`.
2. Confirm the material is durable, reviewed, reusable, and free of secrets.
3. Search for the same identity:

   ```powershell
   python content-planner-kb/scripts/kb_maintenance.py search --query "<identity>"
   ```

4. Update the existing note when one exists. Create a new note only when the
   identity is genuinely new.
5. Preserve manual analysis. Generated data may change only inside explicit
   generated markers.
6. Run:

   ```powershell
   python content-planner-kb/scripts/kb_maintenance.py lint --strict
   ```

## Prohibited content

- credentials, tokens, private keys, cookies, or `.env` values;
- current task/Buffer/upload state copied from runtime systems;
- unreviewed model output presented as project truth;
- links from vault notes directly into agent implementation paths.

Use `.agents/workflows/obsidian-kb-save.md` for the short operator workflow.
