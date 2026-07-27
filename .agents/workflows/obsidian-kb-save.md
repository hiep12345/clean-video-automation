---
description: "Promote reviewed, reusable knowledge into the curated Obsidian vault."
skills: [obsidian-kb-save]
---

# /obsidian-kb-save

Use the `obsidian-kb-save` skill. The canonical knowledge rules live in:

- `content-planner-kb/obsidian-kb/_shared/kb-protocol.md`
- `.agents/skills/obsidian-kb-save/SKILL.md`

## Workflow

1. Confirm the material is reviewed, durable, reusable, and contains no secret.
2. Search before writing:

   ```powershell
   python content-planner-kb/scripts/kb_maintenance.py search --query "<identity>"
   ```

3. Update the existing note when possible; otherwise create one note in the
   channel folder defined by its MOC/SSOT.
4. Do not copy current SQLite, Notion, Buffer, or upload state into curated
   knowledge. Link to the source boundary instead.
5. Validate:

   ```powershell
   python content-planner-kb/scripts/kb_maintenance.py lint --strict
   ```

6. Hand the exact files and lint evidence to the Git integrator.

There is no unconditional auto-save. Unreviewed conversational output and
one-off operational data stay out of the vault.
