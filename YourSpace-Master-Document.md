YOUR SPACE
Complete Project Master Document
Google Keep's speed. Notion's structure. Neither one's clutter.
Vision  ·  Design System  ·  Tech Stack  ·  Data Model  ·  Build Roadmap
Contents
1.  Project Overview	3
2.  Design System — “Anti-Clutter”	4
3.  Technology Stack	6
4.  Data Model — What Gets Stored	7
5.  Full Feature List	7
6.  Build Roadmap — Start to Finish	8
7.  Progress Tracker	10
8.  Appendix — Reference Files	11
1. Project Overview
1.1 Vision
“Your Space” is a minimalist, card-based notes and project workspace. It combines the instant capture speed of Google Keep with the hierarchical structure of Notion — without inheriting the visual clutter of either tool.
Simple thoughts stay simple: flat, fast, color-coded cards. Complex creative work — a movie script, a season of YouTube content, a novel — gets a dedicated 3-tier hierarchy: Project → Sub-project → Note. Structure only appears when the user actually needs it.
1.2 The Problem
Google Keep is fast and flat, but becomes a “wall of sticky notes” the moment a project grows past a few items. No hierarchy, no focus mode, no export.
Notion and similar tools give powerful hierarchy, but the UI is slow and overwrought even for a 2-second grocery list. High friction for quick capture.
Your Space gives every entity a home at the right altitude — quick thoughts live flat, real projects live nested — and the interface never forces one mode onto the other.
1.3 Who It's For
Persona
Primary Use
Screenwriters
Multi-act scripts, character bibles, scene reordering
YouTubers / Creators
Video idea backlog → structured content calendar
Journalers
Daily auto-dated entries with mood tracking
Daily Planners
Checklists, routines, wish lists, quick capture
1.4 What v1 Will NOT Do
No real-time multiplayer collaboration (single-user, cross-device sync only)
No native mobile app — responsive web only
No public sharing / publishing of notes
No plugin or extension system
1.5 How We'll Know It Works
A quick note can be captured in under 2 seconds from app open
A screenwriter can restructure a 3-act script by drag-and-drop, without leaving Focus Mode
The app never shows a loading spinner for local read/write — only a subtle “Saved” indicator
A full data export and re-import round-trips with zero data loss
2. Design System — “Anti-Clutter”
Every visual decision in this app answers to one philosophy: calm, airy, and fast. No heavy motion, no harsh borders, no visual noise.
2.1 Design Principles
Flat by default, hierarchical by choice — nothing forces structure until a project needs it
3-Pane layout: Sidebar → Grid/List → Editor. Each pane earns its space; none is ever crowded
Generous white space — no dense dashboards, cards breathe
Calm visual language — pastel palette, clean sans-serif type, motion only where it aids understanding
Dark Mode is a first-class citizen, with its own deliberately tuned palette — never a simple inversion
Never block the user — every save is optimistic; the UI never waits on the network
2.2 Locked Colour Palette
These exact values are final — do not substitute or approximate them during development.
Token
Light Mode
Dark Mode
Used For
Background
#FFFFFF
#121212
App background
Sidebar
#F8F9FA
#1A1A1A
Sidebar panel
Text — Primary
#202124
#FFFFFF
Body text, headings
Text — Muted
#5F6368
#B0B0B0
Metadata, timestamps
Active Nav
#FFF9C4
#3A371D
Active sidebar link fill
Card — Default
#FFFFFF
#1E1E1E
Default note card
Card — Yellow
#FFF9C4
#3A371D
Note colour option
Card — Red
#FFCDD2
#3A2323
Note colour option
Card — Blue
#B3E5FC
#1D3038
Note colour option
Card — Green
#C8E6C9
#233A26
Note colour option
Only these five card colours are used — no extra hues are introduced anywhere in the app.
2.3 Typography, Shape & Spacing
Property
Value
Font family
Inter (fallback: Roboto), sans-serif only
Headings
18px, Semi-Bold
Body text
14px, Regular
Card border radius
12px
Button border radius
8px
Shadow (hover only)
0 2px 8px rgba(0,0,0,0.05) — never a black drop shadow
Card padding
16px
Main container padding
24px
Icon set
Lucide, outlined style only
2.4 Motion Rules
Only opacity or transform transitions, capped at 200 milliseconds
Easing: ease-in-out or ease-out only — never a bounce or spring
No parallax, no confetti, no celebration animation anywhere — even for streak completions
2.5 The 3-Pane Layout
Sidebar (250px, collapsible): workspace switcher, global search, tag cloud. The active link gets a soft yellow fill with rounded corners — no borders.
Grid / List Pane (fluid width): the card grid for the current workspace. Cards show a colour dot, pin icon, title and first three lines. No shadow at rest; on hover, a soft shadow and a “⋯” menu fade in.
Editor Pane: slides in from the right (200 ms) when a card is clicked. No border around the writing area — a clean canvas. A tiny “Saved” label fades in and out at the top.
Focus Mode: hides the Sidebar and Grid pane, leaving only a centred Editor — toggled by a keyboard shortcut or a small persistent icon.
On mobile (below 768px): the Sidebar becomes a bottom navigation bar, the Grid pane goes full-screen, and the Editor opens as a full-screen modal.
3. Technology Stack
Layer
Choice
Why
Frontend
React 18 + Vite
Fast dev server, lean production bundle
Styling
Tailwind CSS
Utility-first; palette lives as CSS variables
Local storage
Dexie.js (IndexedDB)
Offline-first source of truth; query/index support
Cloud sync
Supabase (PostgreSQL)
Free-tier Postgres, Auth, cross-device sync
Rich text editor
TipTap
Script and journal writing, tag autocomplete
Drag & drop
dnd-kit
Reordering sub-projects and notes
Drawing
HTML5 Canvas
Sketch workspace, saved as an image attachment
AI integration
Gemini API (or OpenAI)
Auto-Organize, Summarize, Expand Idea
Export
jsPDF + docx
PDF and Word export of scripts/projects
UI state
Zustand
Active pane, focus mode, theme — never persisted data
Icons
Lucide
Outlined icon set, matches the calm visual language
3.1 The Local-First Data Flow
Every keystroke follows the same path, so the app is always instant and never waits on the network:
1.  React state updates instantly — optimistic, with no delay
2.  The change is written to IndexedDB immediately — this is the source of truth
3.  A one-second debounce timer resets on every keystroke
4.  After one second of inactivity, the change is pushed to Supabase in the background
5.  On success, the “Saved” indicator confirms it; on failure, it retries automatically and shows “Offline — will sync”
Components never read from or write to Supabase directly — only the sync engine talks to the cloud. Everything the screen shows comes from the local database.
4. Data Model — What Gets Stored
The same structure is used locally (IndexedDB) and in the cloud (Supabase/Postgres), field-for-field, so the two never drift apart.
Entity
What It Holds
Workspaces
The seven fixed sections: Quick Notes, Projects, Journal, Checklists, Wish List, Routines, Sketch
Projects
A top-level creative project, e.g. a movie or a content season
Sub-projects
A nested grouping inside a project, e.g. “Act 1” or “Characters”
Notes
The universal content unit — used by every workspace, with a type field that changes its behaviour
Tags
User-created labels (e.g. #Action, #Dialogue) usable across every workspace
Attachments
Sketch drawings and images attached to a note
Checklist items
Individual line items inside a checklist note
Wish list items
Items with an optional price and link
Routine entries
Daily/weekly completion records that drive streak counts
AI memory
A cache of past AI responses, so re-running Summarize or Expand doesn't always cost a new API call
4.1 Archive & Trash
Archiving hides an item from the main view without deleting it
Deleting moves an item to Trash, where it shows a visible 7-day countdown
From Trash, the user can restore an item or permanently delete it early
After 7 days, an item in Trash is automatically and permanently purged
5. Full Feature List
#
Feature
What It Does
1
Quick Notes
Default landing page. Fast entry, colour-coded, pin-to-top, tags
2
Projects
Project → Sub-project → Note hierarchy, drag-and-drop, Focus Mode, PDF/Word export
3
Journal
Auto-dated daily entries with mood tags
4
Checklists
Reusable lists — shopping, packing, pre-shoot
5
Wish List
Checkbox items with an optional price tag and link
6
Routines
Weekly / monthly habit trackers with streaks
7
Sketch
Freehand drawing on a canvas, saved as an attachment
8
Archive & Trash
Hide without deleting; soft-delete with a 7-day auto-purge
9
Search & Tags
Cross-workspace tag filtering and global search
10
AI Power-Ups
Auto-Organize, Summarize, Expand Idea — always user-triggered, never automatic
11
Export & Backup
Full JSON export/import for manual backup and restore
6. Build Roadmap — Start to Finish
This is the step-by-step path from an empty folder to a live, working app. Each stage lists what to build, which tool does the work, and how you'll know that stage is genuinely finished before moving to the next one.
7. Progress Tracker
Keep this section updated as you build — tick off each stage only once its “Done When” condition is genuinely true, not just “started.”
Stage
Status
Notes
0 — Design & Docs
☐ Not started   ☐ In progress   ☐ Done
1 — Foundation & Quick Notes
☐ Not started   ☐ In progress   ☐ Done
2 — Projects & Hierarchy
☐ Not started   ☐ In progress   ☐ Done
3 — Utility Workspaces
☐ Not started   ☐ In progress   ☐ Done
4 — Cloud Sync, AI & Export
☐ Not started   ☐ In progress   ☐ Done
5 — Testing & QA
☐ Not started   ☐ In progress   ☐ Done
6 — Deploy & Ship
☐ Not started   ☐ In progress   ☐ Done
8. Appendix — Reference Files
This document is the readable summary. For the agentic IDE (Antigravity) build itself, the following companion files hold the full technical detail and should sit alongside it in the project folder:
projectbrief.md — the full product requirements document
architecture.md — folder structure, sync engine, layout strategy in full detail
schema.md — every database table, field and index
.antigravityrules — the coding and design conventions the agent must follow
taskbreakdown.md — the granular, checkbox-level phase plan
memory-bank/projectbrief.md and memory-bank/progress.md — the agent's persistent working memory across sessions
End of document.