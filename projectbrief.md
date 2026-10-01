# Project Brief — Your Space

## 1. Product Vision
**Your Space** is a minimalist, card-based notes and project workspace that fuses the *instant capture speed* of Google Keep with the *hierarchical structure* of Notion — without inheriting the visual clutter of either.

Simple thoughts stay simple (flat, fast, color-coded cards). Complex creative work — a movie script, a season of YouTube content, a novel — gets a dedicated **3-tier hierarchy** (Project → Sub-project → Note) so structure only appears when the user actually needs it.

> **One-line pitch:** "Google Keep's speed. Notion's structure. Neither one's clutter."

## 2. Problem Statement
Creators and daily planners are stuck choosing between two flawed tools:
- **Google Keep** — fast and flat, but becomes a "wall of sticky notes" the moment a project (e.g. a movie script with acts, characters, and scenes) grows past a few items. No hierarchy, no focus mode, no export.
- **Notion / heavy PM tools** — powerful hierarchy, but slow, overwrought UI even for a 2-second grocery list. High friction for quick capture.

**Your Space** solves this by giving every entity a home at the right altitude: quick thoughts live flat, real projects live nested — and the UI never forces one mode onto the other.

## 3. Target Users
| Persona | Primary Use |
|---|---|
| **Screenwriters** | Multi-act scripts, character bibles, scene reordering |
| **YouTubers / Content Creators** | Video idea backlog → structured content calendar |
| **Journalers** | Daily auto-dated entries with mood tracking |
| **Daily Planners** | Checklists, routines, wish lists, quick capture |

## 4. Design Philosophy — "Anti-Clutter"
1. **Flat by default, hierarchical by choice.** Nothing forces structure on the user until a project genuinely needs it.
2. **3-Pane Layout.** Sidebar (navigation) → Grid/List (contents of current context) → Editor (focused content). Each pane earns its space; none is ever crowded.
3. **Generous white space.** No dense dashboards. Cards breathe.
4. **Calm visual language.** Pastel palette, clean sans-serif typography, no heavy motion/animation — transitions are quick fades/slides only (≤150ms), never bouncy or decorative.
5. **Dark Mode as a first-class citizen**, not an inverted afterthought — a separate, deliberately tuned palette.
6. **Never block the user.** Every save is optimistic; the UI never waits on the network.

### Locked Color Palette (v2 — finalized from UI spec)
| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--bg-primary` | `#FFFFFF` | `#121212` | App background |
| `--bg-sidebar` | `#F8F9FA` | `#1A1A1A` | Sidebar panel |
| `--text-primary` | `#202124` | `#FFFFFF` | Body text, headings |
| `--text-muted` | `#5F6368` | `#B0B0B0` | Metadata, timestamps |
| `--active-nav-bg` | `#FFF9C4` | `#3A371D` | Active sidebar link background |
| `--card-default` | `#FFFFFF` | `#1E1E1E` | Default note card |
| `--card-yellow` | `#FFF9C4` | `#3A371D` | Note card color option |
| `--card-red` | `#FFCDD2` | `#3A2323` | Note card color option |
| `--card-blue` | `#B3E5FC` | `#1D3038` | Note card color option |
| `--card-green` | `#C8E6C9` | `#233A26` | Note card color option |

**Shape & elevation:** border radius `12px` (cards), `8px` (buttons); shadow `0 2px 8px rgba(0,0,0,0.05)` only — no black drop shadows, no borders on cards (elevation via shadow alone).

**Spacing:** `16px` internal card padding, `24px` main-container padding — generous, never tightened to fit more content.

**Typography:** **Inter** (fallback Roboto), sans-serif. Headings `18px` / Semi-Bold. Body `14px` / Regular. No serif, no decorative fonts, no more than these two weights anywhere.

**Icons:** Lucide, outlined style only — no filled/solid icon sets.

## 5. Core Feature Set (Workspaces)
1. **Quick Notes** — default landing page; fast entry, color-coded, pin-to-top, tags.
2. **Projects (Scripts & Content)** — Project → Sub-project → Note hierarchy; drag-and-drop reordering; Focus Mode; export to PDF/.docx.
3. **Journal** — auto-dated daily entries with mood tags.
4. **Checklists** — reusable lists (shopping, packing, pre-shoot).
5. **Wish List** — checkbox items with optional price tags.
6. **Routines** — weekly/monthly habit trackers with streaks.
7. **Sketch** — HTML5 Canvas drawing, saved as an image attachment.
8. **Archive & Trash** — archive hides from view; trash auto-purges in 7 days with manual restore/permanent-delete.
9. **Global Search & Tags** — cross-workspace tag filtering (e.g. `#Action`, `#Dialogue`).
10. **AI Power-Ups** — Auto-Organize, Summarize, Expand Idea.
11. **Export & Backup** — full JSON export for manual backup.

## 6. Non-Goals (v1)
- No real-time multiplayer collaboration (single-user, cross-device sync only).
- No mobile native app (responsive web only for v1).
- No public sharing/publishing of notes.
- No plugin/extension system.

## 7. Success Criteria
- A user can capture a quick note in **under 2 seconds** from app open.
- A screenwriter can restructure a 3-act script via drag-and-drop **without leaving Focus Mode**.
- The app **never shows a loading spinner** for local read/write — only for cloud sync status (subtle "Saved" indicator).
- Full data export/import round-trips with zero data loss.
