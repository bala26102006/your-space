# Memory Bank — Progress Tracker

> Update this file at the end of every stage.

**Last updated:** 2026-09-29
**Current stage:** Stage 5 — Testing & QA (COMPLETED)

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
  - **Stage 2.1 Fixes applied:** 3-pane cascade correctly opens EditorPane for both Notes (rich text) and Sub-projects (title/description editing). Grid panes transition accurately through the 3-level altitudes.
  - **Stage 2.2 Fixes applied:** Sidebar navigation instantly resets breadcrumbs/search/tags. Global search and tag filtering route notes globally across workspaces, and jumping to a search result properly resolves to its parent workspace/project. Breadcrumbs support fast reverse-altitude jumps.
  - **Stage 2.3 Fixes applied:** Projects/Sub-projects creation flow bypassing modals entirely for an instantaneous 'click-and-type' flow matching Quick Notes. `EditorPane` extended to natively support editing root Project entities.
  - **Stage 3.1 completed:** Advanced Journal Workspace with 3-column layout (Date Timeline, Prompts/Insights, Writing Canvas). Implemented Daily Prompts (30 rotating), On This Day queries, 30-day Mood Heatmap, Journal Streak counter, and Mood Selector inside the Editor Pane. Added TipTap image attachment support.
  - **Stage 3.2 completed:** Advanced Checklists Workspace. Built custom specialized editors and grid views for Checklists. Added Template Modes, Sub-tasks, etc.
  - **Stage 3.3 completed:** Wish List Workspace. Built `WishListView` with 10 default Folders, rich Item Cards, URL pasting (mock auto-fill), Priority/Price metadata, Tag filters, "Why I Want This" notes, "Total Cost" summaries, and a "Got It" completion flow. Upgraded Dexie schema to `v4` for `wishlist_items` and `wishlist_folders`.
  - **Checklists Refactor (Stage 3.2 Extended):** Built `ChecklistsView` with Categories (Folders) structure. Upgraded Dexie schema to `v2` to support `checklist_items` table with `parent_item_id`, `due_date`, and `sort_order`. Re-wrote `ChecklistEditor` to use live queries, dnd-kit for flat-list reordering, indentation via Tab key, Template Mode, and Duplicate & Reset.

  - **Stage 3.4 (Routines Workspace) completed:** Built the Routines workspace UI with Dexie `routine_entries` integration. Implemented calm habit tracking including a "Visual Streak Calendar" (monthly/weekly toggles), "Streak Count", "Streak Freeze", and "Habit Notes" field. Added subtle completion grid and gentle end-of-day reminders.
  - **Stage 3.4.1 (Routines UI Polish & Edit Feature) completed:** Enhanced Routines workspace UI. Added card action menu ("..." with Edit, Duplicate, Archive, Delete), top-bar Edit button (pencil icon), and a clean centered Edit Modal to modify routine title, frequency (Daily/Weekly/Monthly), and pastel color with instant Dexie updates. Redesigned Routine cards to be compact with 18px semi-bold titles, dynamic streak calculation, and soft, clear completion dots. Fixed grid scrolling with 16px gap and 24px padding. De-cluttered the detail view with a centered max-w-[720px] canvas, 32px padding, clean weekly/monthly toggles, and soft streak freeze controls. Polished header and empty state.
  - **Stage 3.5 completed:** Project Enhancements & AI Power-Ups. Added Project Templates (Movie Script, YouTube Video, Novel) for quick hierarchy creation. Added Project color coding and a dynamic subproject completion progress bar. Added a "Send to Project" quick-move flow in the Quick Notes editor. Created mock AI wrappers (Summarize, Expand Idea, Auto-Organize) using `indexedDB` caching in the `ai_memory` table and integrated them into the Editor toolbar. Built an Export Engine for Projects to PDF (`jsPDF`) and Word (`docx`).

## 🚧 In Progress
- [x] **Stage 3.5.1 completed:** Top Bar & View Controls. Added global persistent header to the Grid pane. Implemented dynamic breadcrumbs, a sort dropdown (Date/Name/Priority), List/Grid view toggle, and a Focus Mode icon. Breadcrumbs correctly reflect active workspaces and hierarchy paths (e.g. Projects, Checklists).
- [x] **Stage 3.5.2 completed:** Actionable Cards. Upgraded `NoteCard` and `ProjectCard` to display rich metadata. Added a visual progress bar for Checklists, Total Cost for Wishlist items, sub-project counts for Projects, and refined padding/border radii.
- [x] **Stage 3.5.3 completed:** Today Dashboard. Built an immersive empty-state for the Editor pane that surfaces tasks due today, a daily routine summary, and recently edited notes with a responsive greeting and zero-state graphic.
- [x] **Stage 3.6 completed:** Backend Logic for UI Enhancements. Built scalable Dexie aggregation queries in `cardSummary.js` and `todayDashboard.js`, and upgraded Zustand `uiStore` to power the Top Bar (SortBy, SortOrder, ViewMode) and Actionable Cards.
- [x] **Backend Phase 1 completed:** Unified Dexie Schema. Rebuilt and merged all local-first database tables into `db.version(5)` with proper soft-delete (`is_deleted`, `deleted_at`) indexing and full table compatibility for all workspaces.
- [x] **Backend Phase 2 completed:** Centralized Zustand Store. Scaled `uiStore.js` to comprehensively track visual state (`activePane`, `isFocusMode`, `activeModal`) globally, decoupling it from localized UI components while retaining strict cross-workspace preference syncing.
- [x] **Backend Phase 3 completed:** Service Layer & Queries. Extracted all raw database logic from React components into dedicated service modules (`noteService`, `checklistService`, `wishlistService`, `dashboardService`) to ensure decoupled architecture, predictable state updates, and safe error handling.
- [x] **Backend Phase 4 completed:** Autosave Engine. Verified `useDebouncedSave` and implemented the `useAutoSaveNote` hook. Confirmed immediate Dexie writes preventing data loss mid-keystroke, while effectively debouncing the Supabase sync pushes to exactly 1000ms.
- [x] **Backend Phase A (Service Layer + Zustand Store) completed:** Rebuilt Dexie schema to `db.version(1)`, rebuilt `uiStore.js`, and created service files for decoupled logic.
- [x] **Backend Phase B (Supabase Cloud Sync & Auth) completed:** Set up Supabase client, mapped Dexie schema to Supabase with RLS, built `syncEngine.js` (debounce, pull-on-load, offline queue, LWW conflict resolution), and built Supabase Auth login screen with protected routes.
- [x] **Phase C (AI Power-Ups) completed:** Implemented real AI calls using Gemini API for `autoOrganize`, `summarize`, and `expandIdea`. AI responses are cached in Dexie's `ai_memory` table using `input_hash` to prevent redundant API calls. AI actions are strictly user-triggered (via Editor toolbar and Quick Notes UI) and surface as suggestions for explicit user confirmation, ensuring no silent mutations. Model swappable via `.env`.
- [x] **Phase D (Export Engine) completed:** Built PDF and Word export engines in `src/lib/export/` (`exportPdf.js`, `exportDocx.js`) for full projects. Built full JSON database backup and restore functions (`exportJson.js`, `importJson.js`). Wired PDF/Word export buttons into the Project Editor toolbar and JSON export/import buttons into a new Settings workspace.
- [x] **Phase E (Navigation & Global State Fix) completed:** Ensured clicking a workspace resets sub-navigation and breadcrumbs; fixed breadcrumb clicks to safely close the Editor and step back the Grid; fixed global search/tag navigation race conditions by synchronously dispatching Zustand updates so the Editor opens cleanly alongside its parent Grid; added native editor `onClick` triggers for Project/Sub-project items in the Archive and Trash views.
- [x] **Pre-Test Cleanup & QA Phase 1:** Purged unused `clsx` and `tailwind-merge` dependencies. Deleted 11 unused/dead `.jsx` components and hooks. Fixed a CSS compilation error caused by invalid `@import` ordering in `tokens.css`. Verified `console.log`, `TODO`, and `debugger` hygiene.
- [x] **Login Fix & Local Mode Phase:** Styled AuthScreen with clean layout, integrated Supabase OTP Magic Link logic, added a persisted Local Mode bypass to Zustand store, integrated local bypass logic into `App.jsx`, added a Sign Out button to the Sidebar footer, and updated `SavedIndicator` to show "Saved" instead of "Offline - will sync" when in Local Mode.
- [x] **Auth Removal & Layout Shift Phase:** Permanently stripped Supabase authentication from the app, hardcoded local user fallback, and completely refactored the layout to permanently pin the Sidebar to the left on all devices (bypassing the mobile bottom nav).
- [x] **Alternative Soft Color Palette Phase:** Applied "Soft Organic" color tokens globally to replace the Google Keep pastel colors. Added muted earthy tones (Terracotta, Sage, Dusty Blue, Lavender, Mustard). Softened box-shadows.
- [x] **Master Stabilization Phase 1 (Wish List Bug Fix):** Repaired `WishListView.jsx` default folder initialization to prevent duplicate seeding (used transaction deduplication and deterministic IDs). Replaced `crypto.randomUUID()` with environment-safe fallbacks for folder and item creation to guarantee Dexie writes, and verified `Total Cost` accurately calculates strictly against unchecked items.
- [x] **Master Stabilization Phase 2 (Routines Workspace):** Validated Stage 3.4 Routines Workspace functionality and ensured database schema matches requirements for habit tracking.
- [x] **Master Stabilization Phase 3 (Sketch Workspace):** Built `SketchView` and `SketchEditor` with an HTML5 canvas drawing tool, Base64 image saving to the `attachments` table, and a "Save to Note" dropdown attachment feature.
- Awaiting user approval to begin **Master Stabilization Phase 4: Dynamic Data Accuracy**.

## ⏭️ Next Up
- **Stage 6: Deploy & Ship** — Final build generation, hosting configuration, environment variable lock down, and production handoff.

## ⚠️ Known Issues / Tech Debt
- None. Production build verified clean with Vite.

## 🧭 Decisions Log
| Date | Date | Decision | Reason |
|---|---|---|---|
| 2026-09-28 | 2026-09-28 | Integrated `@dnd-kit` into `ProjectsView` with touch activation constraint | Ensures smooth drag handles on both desktop mouse and touch screens |
| 2026-09-29 | 2026-09-29 | Added Stage 2.1 Hierarchy Fixes | Resolved 3-pane navigation flow; Grid accurately shows nested notes, Editor correctly allows editing Sub-project titles/descriptions natively alongside standard Notes. |
| 2026-09-29 | 2026-09-29 | Added Stage 2.2 Navigation Fixes | Patched `uiStore` reset flows, enabled global note search interception via `activeTagId` and `searchQuery`, added Sub-projects support in Archive/Trash panes. |
| 2026-09-29 | 2026-09-29 | Added Stage 2.3 Creation Flow Fixes | Extended `EditorPane` to natively edit root Projects, and replaced all `ProjectsView` creation modals with instant-instantiation flows matching Quick Notes. |
| 2026-09-29 | 2026-09-29 | Added Stage 3.1 Advanced Journal | Built `JournalView.jsx` with Timeline, Daily Prompts, Heatmap, Streak counter, and On This Day. Enhanced `EditorPane` with a metadata Mood Selector. Added Image extension to TipTap. |
| 2026-09-29 | 2026-09-29 | Added Stage 3.2 Checklists | Built custom specialized editors and grid views for Checklists. Added Template Modes, Sub-tasks, etc. Refactored Checklists to use Folders structure and Dexie v2 `checklist_items` with dnd-kit. |
| 2026-09-30 | 2026-09-30 | Added Stage 3.3 Wish List | Built custom specialized grid view for Wish List. Added 10 default Folders, rich Item Cards, Link Pasting, Priority/Price metadata, "Why I Want This" note, Tag Filters, "Total Cost" calculation, and a "Got It" flow. Updated Dexie schema to v4 for `wishlist_items` and `wishlist_folders` tables, and built internal folder-to-item navigation inside `WishListView.jsx`. |
| 2026-09-29 | 2026-09-29 | Added Stage 3.2.2 Advanced Checklist Items | Indexed `is_completed` and `due_date` in Dexie schema v2. Upgraded `NoteCard.jsx` to dynamically fetch `checklist_items` to calculate accurate progress counts and render subtle due date badges on cards. |
| 2026-09-29 | 2026-09-29 | Added Stage 3.2.3 Checklist Templates & Starter Kits | Added 'Template Mode' toggle to Checklists Editor. Implemented 'Duplicate & Reset' for templates via Editor & NoteCard menus. Built 'Starter Kits' grid section with 7 hardcoded templates and a dynamic 'Use This Template' creation flow. |
| 2026-09-29 | 2026-09-29 | Added Stage 3.2.4 Checklist Bug Fixes & Document Sections | Fixed UI re-render sync issue on folder creation. Bupmed Dexie schema to v3 to add `item_type` for `checklist_items`. Added UI for inserting and rendering distinct "Headers", "Notes", and "Tasks", ensuring drag-and-drop and progress calculation correctly filters them. |
| 2026-09-29 | 2026-09-29 | Added Stage 3.4 Project Enhancements & AI | Implemented Project templates, color coding, progress bars, and a "Send to Project" move feature. Added Mock AI wrappers for summarization and idea expansion with IndexedDB caching. Built export engines for PDF and Word docx formats. |

---

### Stage Checklist Overview
- [x] Stage 0 — Design & Docs
- [x] Stage 1 — Foundation & Quick Notes
- [x] Stage 2 — Projects & Hierarchy
- [x] Stage 3 — Utility Workspaces
- [x] Stage 4 — Cloud Sync, AI & Export
- [x] Stage 5 — Testing & QA
- [ ] Stage 6 — Deploy & Ship
