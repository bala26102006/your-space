# Architecture — Your Space

## 1. Tech Stack
| Layer | Choice | Notes |
|---|---|---|
| Frontend | **React 18 + Vite** | Fast HMR, lean bundle |
| Styling | **Tailwind CSS** | Utility-first; palette tokens as CSS variables (see `projectbrief.md`) |
| Local storage | **IndexedDB** via **Dexie.js** | Chosen over localForage for its query/index API — needed for tag filtering & hierarchy lookups |
| Cloud sync | **Supabase (PostgreSQL)** | Free-tier Postgres + Auth + Realtime (optional) |
| Rich text editor | **TipTap** (ProseMirror-based) | Script/journal writing, extensible for `#tag` autocomplete |
| Drag & drop | **dnd-kit** | Sub-project/note reordering |
| Drawing | **HTML5 Canvas** (native, or `react-sketch-canvas`) | Sketch workspace |
| AI Integration | **Gemini API** (primary) or OpenAI API | Auto-Organize, Summarize, Expand Idea |
| Export | **jsPDF** (PDF), **docx** (Word) | Export Engine |
| State management | **Zustand** | Lightweight global state for UI (active pane, focus mode, theme) — NOT for persisted data (that's Dexie's job) |
| Routing | **React Router** | Workspace-level routes |

## 2. Folder Structure
```
your-space/
├── public/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── routes/
│   │   ├── QuickNotes/
│   │   ├── Projects/
│   │   ├── Journal/
│   │   ├── Checklists/
│   │   ├── WishList/
│   │   ├── Routines/
│   │   ├── Sketch/
│   │   └── ArchiveTrash/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── GridListPane.jsx
│   │   │   ├── EditorPane.jsx
│   │   │   └── FocusModeToggle.jsx
│   │   ├── cards/
│   │   │   ├── NoteCard.jsx
│   │   │   ├── ProjectCard.jsx
│   │   │   └── SavedIndicator.jsx
│   │   ├── editor/
│   │   │   └── TipTapEditor.jsx
│   │   └── shared/
│   │       ├── TagPill.jsx
│   │       └── ColorPicker.jsx
│   ├── lib/
│   │   ├── db.js                # Dexie schema + instance
│   │   ├── supabaseClient.js
│   │   ├── sync/
│   │   │   ├── syncEngine.js     # debounce + push/pull logic
│   │   │   └── conflictResolver.js
│   │   ├── ai/
│   │   │   ├── autoOrganize.js
│   │   │   ├── summarize.js
│   │   │   └── expandIdea.js
│   │   └── export/
│   │       ├── exportPdf.js
│   │       ├── exportDocx.js
│   │       └── exportJson.js
│   ├── store/
│   │   └── uiStore.js            # Zustand store
│   ├── hooks/
│   │   ├── useDebouncedSave.js
│   │   ├── useLiveQuery.js       # wraps Dexie's useLiveQuery
│   │   └── useTags.js
│   └── styles/
│       └── tokens.css            # CSS variable palette (light/dark)
├── tailwind.config.js
├── vite.config.js
└── package.json
```

## 3. 3-Pane UI Layout Strategy
```
┌──────────┬─────────────────────┬───────────────────────────┐
│ Sidebar  │   Grid / List Pane  │        Editor Pane         │
│          │                     │                             │
│ Quick    │  [Card] [Card]      │  Selected note/project      │
│ Notes    │  [Card] [Card]      │  content — TipTap editor,   │
│ Projects │  [Card] [Card]      │  or empty state if nothing  │
│ Journal  │                     │  selected.                  │
│ ...      │  (responsive grid,  │                              │
│          │   collapses to list │  Focus Mode hides Sidebar    │
│          │   on narrow widths) │  + Grid pane entirely.       │
└──────────┴─────────────────────┴───────────────────────────┘
```
- **Sidebar** (`250px`, collapsible): workspace switcher (Quick Notes, Projects, Journal, Checklists, Wish List, Routines, Sketch, Archive, Trash) + global search + tag cloud. Links are plain text + Lucide outlined icons; active link gets a `--active-nav-bg` fill with `8px` rounded corners — no borders, no bold weight change.
- **Grid/List Pane**: fluid width, contents of the active workspace/context. For Projects, this pane shows the current hierarchy level (Project list → Sub-project list → Note list) with breadcrumb navigation. Cards: `12px` radius, `16px` padding, color dot + pin icon + title + first 3 lines. Resting state has no shadow; on hover, `0 2px 8px rgba(0,0,0,0.05)` fades in along with a "more" (⋯) menu.
- **Editor Pane**: does **not** sit statically alongside the Grid pane — it **slides in from the right** on card click, `200ms ease-in-out` transform transition, overlaying/pushing the Grid pane. No border around the text area; pure canvas. A tiny "Saved" text fades in/out at the top of the editor (opacity transition only, no layout shift).
- **Focus Mode**: collapses Sidebar + Grid pane (not unmount — CSS transform, state preserved), leaving only the Editor pane centered on screen. Toggle via keyboard shortcut (e.g. `Cmd/Ctrl + .`) and a persistent small icon.
- **Responsive breakpoints**: below `md` (768px), panes stack — Sidebar becomes a **bottom nav bar**, Grid pane becomes full-screen, and the Editor becomes a **full-screen modal** (not a slide-in panel) when a card is tapped.
- **Motion budget, app-wide**: only opacity/transform, `≤200ms`, `ease-in-out` or `ease-out`. No bounce/spring, no parallax, no celebratory animation.

## 4. Local-First Data Flow (The "Whiteboard")
```
User types
   │
   ▼
1. Update React state instantly (optimistic UI — no delay, ever)
   │
   ▼
2. Write to IndexedDB (Dexie) immediately — this is the source of truth
   │     Show "Saving…" indicator
   ▼
3. Debounce timer (1000ms) resets on every keystroke
   │
   ▼  (after 1s of inactivity)
4. Fire background sync to Supabase (upsert changed row(s))
   │
   ▼
5. On success → "Saved" indicator + updated `synced_at` timestamp
   On failure → retry with exponential backoff; indicator shows "Offline — will sync"
```

### Debounce Implementation Sketch
```javascript
// useDebouncedSave.js
function useDebouncedSave(saveFn, delay = 1000) {
  const timer = useRef(null);
  return useCallback((data) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveFn(data), delay);
  }, [saveFn, delay]);
}
```
- **Local write** (Dexie) happens on every change — NOT debounced. Only the **cloud push** is debounced.
- This guarantees zero data loss even if the tab is closed mid-typing (IndexedDB already has it), while keeping Supabase writes cheap and infrequent.

## 5. Cloud Sync Engine
- **Pull-on-load**: on app boot / login, pull all rows updated since `last_synced_at` (stored in local metadata table).
- **Push-on-debounce**: as above.
- **Conflict resolution**: last-write-wins by `updated_at` timestamp for v1 (simple, sufficient for single-user cross-device use); flag for future CRDT upgrade if multi-device *simultaneous* editing becomes common.
- **Offline queue**: failed pushes are queued in a Dexie `syncQueue` table and retried on reconnect (`navigator.onLine` listener).

## 6. AI Power-Up Integration
- All AI calls are **explicit user actions** (button click), never automatic background calls — respects cost and privacy.
- Requests go through a thin `lib/ai/` wrapper so the underlying model (Gemini/OpenAI) can be swapped via `.env` config without touching UI code.
- Responses are inserted as **suggestions** (Auto-Organize proposes a grouping the user must confirm; Expand Idea produces a draft outline the user can accept/discard) — AI never silently mutates existing data.

## 7. Export Engine
- **PDF**: `jsPDF` renders each Note/Sub-project's TipTap JSON → plain formatted text with headings preserved.
- **Word (.docx)**: `docx` library maps the same content tree to `docx` `Paragraph`/`Heading` nodes.
- **JSON backup**: full dump of the Dexie database (all tables) for manual backup/restore — this is the disaster-recovery path independent of Supabase.

## 8. Performance Rules
- No component fetches from Supabase directly for render — always reads from the local Dexie cache via `useLiveQuery`, so the UI is always instant regardless of network.
- Large lists (Quick Notes grid) are virtualized once item count exceeds ~100 (e.g. `react-window`) to keep the "Anti-Clutter" philosophy from becoming an anti-performance liability.
