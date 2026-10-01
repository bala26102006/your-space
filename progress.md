# Memory Bank — Progress Tracker

> Update this file at the end of every stage.

**Last updated:** 2026-09-28
**Current stage:** Stage 2 — Projects & Hierarchy (COMPLETED)

---

## ✅ What's Built
- **Stage 0: Design & Docs** — All 7 documentation files confirmed, parsed, and initialized in the workspace.
- **Stage 1: Foundation & Quick Notes** — Full local-first infrastructure, design tokens, 3-pane shell, Quick Notes CRUD, debounced save, tag manager, global search, mobile bottom nav.
- **Stage 2: Projects & Hierarchy** — 3-Tier Creative Structure:
  - `projects` and `subprojects` tables indexed in Dexie.js.
  - 3-Level Altitude Navigation: `Projects List` → `Sub-projects List` (Acts, Characters, Bibles) → `Scenes/Notes List`.
  - Dynamic breadcrumbs in Grid pane (`Projects > The Last Train > Act 1`) for stepping back altitude instantly.
  - Drag-and-drop reordering with `@dnd-kit/core` & `@dnd-kit/sortable` for both Sub-projects and Notes with touch & keyboard sensors, saving updated `sort_order` directly to Dexie.
  - TipTap rich-text integration for writing scenes/notes distraction-free.
  - Focus Mode (`Ctrl+.` / `Cmd+.` or header icon) collapsing Sidebar and Grid pane for a centered writing canvas.
  - Full Archive & Trash support for Projects, Sub-projects, and Notes with soft-delete, visible 7-day countdown badges (`Purges in 7d`), Restore, and Purge controls.

## 🚧 In Progress
- Awaiting user approval to begin **Stage 3: Utility Workspaces**.

## ⏭️ Next Up
- **Stage 3: Utility Workspaces** — Journal (auto-dated daily entries with mood tags), Checklists (reusable lists with check/reorder), Wish List (optional price & link), Routines (weekly/monthly habit trackers with streak calculation), Sketch (HTML5 Canvas drawing saved as image attachment).

## ⚠️ Known Issues / Tech Debt
- None. Production build verified clean with Vite.

## 🧭 Decisions Log
| Date | Date | Decision | Reason |
|---|---|---|---|
| 2026-09-28 | 2026-09-28 | Integrated `@dnd-kit` into `ProjectsView` with touch activation constraint | Ensures smooth drag handles on both desktop mouse and touch screens |

---

### Stage Checklist Overview
- [x] Stage 0 — Design & Docs
- [x] Stage 1 — Foundation & Quick Notes
- [x] Stage 2 — Projects & Hierarchy
- [ ] Stage 3 — Utility Workspaces
- [ ] Stage 4 — Cloud Sync, AI & Export
- [ ] Stage 5 — Testing & QA
- [ ] Stage 6 — Deploy & Ship
