# Task Breakdown — Your Space

Phased so each phase produces a **usable, demoable** app increment. An agentic IDE (Antigravity) should treat each phase as one work session/checkpoint.

---

## Phase 1 — Foundation & Quick Notes
**Goal:** A working local-first app with the core capture loop.

- [x] Scaffold Vite + React + Tailwind project; set up folder structure per `architecture.md`.
- [x] Define color tokens (`tokens.css`) for Light + Dark mode; build theme toggle.
- [x] Set up Dexie (`db.js`) with `workspaces` + `notes` + `tags` + `note_tags` tables.
- [x] Build 3-Pane layout shell: `Sidebar`, `GridListPane`, `EditorPane` (static, no data yet).
- [x] Implement Quick Notes workspace: create/edit/delete note, color picker, pin-to-top.
- [x] Implement `useDebouncedSave` + optimistic local write to Dexie (no cloud yet).
- [x] Build "Saved" indicator component (local-save state only for now).
- [x] Implement Tag creation + tag pills on notes.
- [x] Implement Global Search (client-side filter over Dexie via `useLiveQuery`).
- **Exit criteria:** User can create, color-code, pin, tag, and search Quick Notes — fully offline.

## Phase 2 — Projects & Hierarchy
**Goal:** The signature feature — structured creative work.

- [x] Add `projects` + `subprojects` tables to Dexie schema.
- [x] Build Projects workspace navigation: Project list → Sub-project list → Note list (breadcrumbs in Grid pane).
- [x] Integrate TipTap editor in Editor pane for Project notes.
- [x] Implement drag-and-drop reordering (dnd-kit) for sub-projects and notes.
- [x] Implement Focus Mode (collapse Sidebar + Grid pane, centered editor, keyboard shortcut).
- [x] Implement Archive toggle for Projects/Sub-projects/Notes.
- [x] Implement Trash (soft-delete + 7-day countdown UI + restore/permanent-delete actions).
- **Exit criteria:** A user can build a movie script with Acts and Characters as sub-projects, reorder them, and write distraction-free in Focus Mode.

## Phase 3 — Utilities & Wish List
**Goal:** Round out the daily-use workspaces.

- [x] Journal workspace: auto-dated entry creation, mood tag selector, calendar/list view.
- [x] Checklists workspace: reusable checklist notes with `checklist_items` (add/check/reorder).
- [x] Wish List workspace: `wishlist_items` with optional price + link, check-off state.
- [x] Routines workspace: weekly/monthly habit definitions, `routine_entries` completion grid, streak calculation.
- [x] Sketch workspace: HTML5 Canvas drawing tool, save as image → `attachments` table, thumbnail render in Grid pane.
- **Exit criteria:** Every non-AI, non-export feature in the PRD is functional end-to-end, offline.

## Phase 4 — AI, Export, Sync & Backup
**Goal:** Cloud sync, AI power-ups, and take-it-with-you export.

- [x] Set up Supabase project; mirror schema per `schema.md`; enable Row-Level Security by `user_id`.
- [x] Build `syncEngine.js`: debounced push, pull-on-load, offline queue + retry.
- [x] Wire "Saved" indicator to reflect cloud sync status (Saving / Saved / Offline).
- [x] Implement Auth (Supabase Auth — email/magic link minimum).
- [x] Build `lib/ai/` wrappers for Auto-Organize, Summarize, Expand Idea (Gemini/OpenAI, swappable via env).
- [x] Add AI action buttons in UI (Quick Notes toolbar for Auto-Organize; Project/Journal editor toolbar for Summarize/Expand).
- [x] Implement `ai_memory` caching to avoid redundant API calls.
- [x] Build Export Engine: PDF (`jsPDF`) and Word (`docx`) export for Projects/Sub-projects.
- [x] Build full JSON export/import (backup & restore) covering all tables.
- **Exit criteria:** Cross-device sync works reliably; AI suggestions are usable and non-destructive; a full script project can be exported to PDF/Word; a full account can be backed up and restored via JSON.

---

## Suggested Session Cadence for Antigravity
Run each phase as its own agentic task/checkpoint so the agent has a clean, verifiable "done" state to report against `memory-bank/progress.md` before moving on — see `.antigravityrules` and the memory-bank templates for how progress should be logged after each phase.
