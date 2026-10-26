# Memory Bank — Progress Tracker

> Update this file at the end of every stage.
**Last updated:** 2026-10-26
**Current stage:** Calendar ("Life Lens") — Milestone 2 (More Views + Events CRUD + Countdowns + Quick Add + Rescheduling) — COMPLETED

---

## ✅ What's Built
- **Calendar ("Life Lens"): Milestone 2 (More Views + Events CRUD + Countdowns + Quick Add + Rescheduling)**:
  1. **Segmented View Switcher (`src/components/calendar/CalendarView.jsx`)**:
     - View tabs: `[ Month | Week | Agenda | Year ]` persisted in `localStorage.getItem('calendar_active_view') || 'month'`.
     - Harmonious styling with active teal pill, accessible `role="tablist"` and keyboard-friendly switching.
     - Dynamic header navigation and dates formatting adapted for all 4 views (Month year, Week range, Agenda year, and Year number).
  2. **Week View (`src/components/calendar/WeekView.jsx`)**:
     - 7 columns of stacked items (anti-clutter, content-driven, not artificial time-slot grid).
     - Column header with day number, weekday label, and quick `+` add button.
     - Pointer drag-and-drop to reschedule items between days with live drag-over drop target indicator.
     - Keyboard & touch accessible "Move to date..." button on every draggable item.
  3. **Agenda View (`src/components/calendar/AgendaView.jsx`)**:
     - Linear grouped stream: Overdue section (prominent soft red alert card), Today section, and Next 14 Days grouped by day.
     - Ideal for narrow mobile viewports and rapid daily triage.
     - Move to date buttons and direct one-click navigation to native panels.
  4. **Year in Pixels View (`src/components/calendar/YearView.jsx`)**:
     - 12 mini months grid (Jan to Dec) with clickable pixel cells.
     - 3-mode switcher: `Activity Density` (teal heat map), `Journal Mood` (mood palette colors), and `Routine Completion` (emerald 100%, amber partial, soft red missed).
     - Click any pixel to open that day's Life Lens detail panel.
  5. **Lightweight Calendar Events CRUD (`src/components/calendar/EventModal.jsx`)**:
     - Light dialog to create and edit events: title, date, optional end date, all-day toggle, start time, color picker (7 curated palette hues), notes, and countdown toggle.
     - Soft-delete integration with confirm store (`openSoftDelete`).
     - Stored cleanly in `db.notes` with `workspace_id = 'calendar'` and `note_type = 'event'` with complete leak isolation from Quick Notes, Archive, Trash, and Today recent notes.
  6. **Upcoming Countdowns Strip (`src/components/calendar/CountdownsStrip.jsx`)**:
     - Horizontal highlight strip displaying up to 3 upcoming countdown events (Exams, Birthdays, Trips).
     - Relative badge labels ("Today!", "in 12 days") and pulsating indicator on today's events.
     - Click countdown pill to open EventModal in edit mode.
  7. **Quick Add Dialog (`src/components/calendar/QuickAddModal.jsx`)**:
     - Rapid creation dialog for any selected date:
       - Event: creates calendar event with default color.
       - Task: adds a new checklist task with due date into a selected user checklist.
       - Wish: adds a wish with target date and category into the Wish List.
     - Accessible directly via `+ New` button in calendar header and `+ Add` button in Day Detail Panel.
  8. **Accessible Rescheduling & Move Date Modal (`src/components/calendar/MoveDateModal.jsx`)**:
     - Non-drag accessible reschedule dialog with quick jump chips ("Today", "Tomorrow", "In 3 days", "Next Monday") + date picker.
     - Universal `rescheduleCalendarItem(item, newDateStr)` helper updating only `due_date` or `target_date` and `updated_at`.
     - Non-draggable safety: Routine entries and journal entries are strictly non-draggable and cannot be rescheduled.
     - Immediate Undo toast with 6-second countdown timer allowing instant reversal.
  9. **Day Detail Panel Enhancements (`src/components/calendar/DayDetailPanel.jsx`)**:
     - `+ Add` button in header to quickly add events/tasks/wishes for the selected date.
     - "Move to date..." button on draggable items.
     - Click on event opens `EventModal` in edit mode.
     - Sticky positioning on wide viewports with responsive max-height and local scrolling.
  10. **Zero Schema Changes & 100% Offline**:
     - Pure additive queries on Dexie tables. Zero schema modifications.
     - Zero new external packages.
- **Calendar ("Life Lens"): Milestone 1 (Foundation + Month View — Read-Only)**:
  1. **Strict Local Date Engine (`src/lib/calendar/calendarUtils.js`)**:
     - Strict local-date arithmetic (no UTC offsets, zero `toISOString` day key shifts, DST-safe).
     - 6x7 Month Grid matrix generator (42 cells with leading/trailing days and ISO weekday indices).
     - Week start preferences (Monday default, Sunday alternative) persisted in `localStorage.getItem('calendar_week_start')`.
     - `isSameDay`, relative date labels ("Today", "Tomorrow", "in 12 days", "3 days ago"), and automatic midnight rollover listener.
  2. **Multi-Source Read-Only Normalized Service (`src/lib/calendar/calendarService.js`)**:
     - Unified normalized adapter across all app sources: `{ key, id, source, type, date, title, subtitle, status, colorToken, bgToken, dotClass, payload }`.
     - Source 1 (Checklists): Direct indexed date range query on `checklist_items.due_date` + list-level `content.dueDate`. Excludes archived/deleted notes and non-task headers/notes. Detects overdue vs done vs open.
     - Source 2 (Routines): Direct indexed query on `routine_entries.entry_date` + active habit definitions. Distinguishes past evaluated completions (done, missed, frozen) from upcoming scheduled habits.
     - Source 3 (Journal): Date-mapped mood dots via safe `getMoodConfig` fallbacks.
     - Source 4 (Wish List): Target dates mapped to open/overdue wishes, excluding already-purchased (`got_it`) items.
     - Source 5 (Sketches): Creation date quiet info dots, avoiding heavy image attachments.
     - Source 6 (Quick Notes): Creation date quiet info dots.
     - Source 7 (Events): Isolated calendar events in `db.notes`.
     - In-memory LRU prefetch cache for instant navigation without secondary Dexie schemas.
  3. **Today Tab Integration (`src/components/layout/TodayDashboard.jsx`)**:
     - Top tab switcher: `[ Today | Calendar ]` with state persisted in `localStorage.getItem('today_active_tab')`.
     - `data-panel="calendar"` applied to `document.documentElement` when Calendar tab is active, restored cleanly to `data-panel="today"` when returning or switching away.
     - Interactive "Next 7 Days" strip on Today tab: displays upcoming 7-day pill overview with direct jump to Calendar.
     - Zero changes to `Sidebar.jsx`; sidebar component remains 100% untouched.
  4. **Wall Calendar Visual Personality & Design Tokens (`src/styles/panelPersonalities.css`)**:
     - Light mode: Warm off-white paper (`#FAF8F5`), crisp calendar sheet (`#FFFFFF`), charcoal ink (`#1E2328`, 15.83:1 AAA), deep teal accent (`#0F766E`, 5.47:1 AA button, `#0D655E` 6.91:1 AA text).
     - Dark mode: Deep slate (`#0F1318`), elevated sheet (`#161C23`), chalk ink (`#F1F5F9`, 15.65:1 AAA), soft luminous teal (`#2DD4BF`, 9.82:1 AAA button, 9.21:1 AAA text).
     - CSS-only binder holes bar (`.calendar-binder-track` and `.calendar-binder-ring`) on tear-off header band.
     - Static `--panel-calendar-accent` (`#0F766E` / `#2DD4BF`) in `:root` and `.dark`.
     - 100% PASS on WCAG 2.1 AA/AAA contrast checks across all 14 dual-mode tokens.
  5. **Components (`MonthGrid.jsx`, `DayDetailPanel.jsx`, `CalendarEmptyState.jsx`, `CalendarView.jsx`)**:
     - `MonthGrid`: 6x7 accessible grid, weekday headers, today highlight, faded non-month days, density tints, overdue warning pips, container query dot/chip switching (`@[480px]`).
     - Accessible keyboard grid navigation (Arrow keys, PageUp/PageDown, Home/End, T for today, Enter/Space for details, Esc to close).
     - `DayDetailPanel`: Side panel on wide viewports, bottom sheet on narrow viewports; groups selected day items by layer with open-in-panel navigation.
     - `CalendarEmptyState`: Original SVG tear-off wall calendar illustration.
  6. **Defensive Leak Prevention**:
     - `todayDashboard.js` `getRecentNotes` guarded against calendar events.
     - `CommandPalette.jsx` `allNotes` guarded against calendar events in generic recent notes.
     - `ArchiveView.jsx` and `TrashView.jsx` updated with `calendar` workspace definition so events never mislabel as Quick Notes.
- **Panel Personalities: Milestone 3 (Routines "Calm Horizon" + Sketch "Art Studio" + Today Hub) & Full QA Pass**:
  1. **Routines "Calm Horizon"**:
     - Serene sky blue & ocean dawn horizon aesthetic in Light mode (`#F0F8FF` page, `#FFFFFF` paper, `#0369A1` button/accent with white text at 5.93:1 AA); clean merge with approved Material 3 dark surface tokens in Dark mode (`#0E1116` page, `#151A21` paper, `#1C232C` raised, `#38BDF8` button with `#0B1220` dark ink text at 8.74:1 AAA contrast).
     - Hero gradient preserved: soft sky tint `#192735` to `#151A21` in Dark mode with 12% white ring track and luminous glow.
     - 8 tonal dual-mode palettes (`sky`, `emerald`, `amber`, `coral`, `indigo`, `violet`, `rose`, `teal`) and routine cards fully preserved with zero regressions.
     - Scoped horizontal calm horizon line texture (`--texture`) with local scrolling.
     - Tokenized New Routine button with `bg-[var(--btn-bg)] text-[var(--btn-fg)]`.
  2. **Sketch "Art Studio"**:
     - Warm terracotta & burnt orange creative studio aesthetic in Light mode (`#FFF7ED` page, `#FFFFFF` paper, `#C2410C` button at 5.18:1 AA); deep warm dark canvas studio in Dark mode (`#14110F` page, `#1E1A17` paper, `#FB923C` button with `#14110F` dark ink text at 8.31:1 AAA contrast).
     - Heading: Crisp Inter / system-ui headline (`Sketch Studio`) with hand-drawn SVG underline.
     - Tagline font: `@fontsource` / Google Font `Caveat` cursive font (`.sketch-tagline`, 18px / 1.125rem) strictly scoped to the tagline only (`A creative canvas for playful doodles, visual notes, and detailed artwork.`).
     - Scoped artist canvas weave stippling texture (`--texture`) with local scrolling.
  3. **Today Hub ("Today Hub")**:
     - Warm focus summary & sunlit daily command center (`#FAF9F5` page, `#FFFFFF` paper light; `#121110` page, `#1A1917` paper dark).
     - Standardized static panel tokens applied across all cards:
       - Routines card keeps `--panel-routines-accent` and `--panel-routines-accent-soft` (sky blue).
       - Checklists card keeps `--panel-checklists-accent` and `--panel-checklists-accent-soft` (emerald green).
       - Journal prompt card keeps `--panel-journal-accent`, `--panel-journal-accent-soft`, and `--panel-journal-btn-bg` (warm sanctuary bronze/gold).
       - Recent Notes card keeps `--panel-notes-accent` and `--panel-notes-accent-soft` (amber/butter-yellow).
       - Wish List card keeps `--panel-wishlist-accent` and `--panel-wishlist-accent-soft` (celestial violet).
       - Consistency / Habit Pulse card keeps warm amber hub glow (`#D97706` / `#FBBF24`).
     - Pre-script `panelMap` in `index.html` updated with `today: 'today'`, ensuring instantaneous zero-flash load on refresh in Dark mode.
  4. **Strict Contrast Verification (ALL 8 Panels / 16 Configurations)**:
     - `scripts/calculate-contrast.js` executed across ALL panels (Quick Notes, Projects, Checklists, Wish List, Routines, Sketch, Today Hub, Journal in Light & Dark modes).
     - 112 checks executed: **100% PASS** (all body/secondary/accent/header text ≥ 4.5:1 AA / 7.0:1 AAA; all buttons ≥ 5.0:1 AA / 8.0:1 AAA; all borders ≥ 1.2:1 UI).
  5. **Real Font Size & Typography Report**:
     - `scripts/generate-font-report.js` verified font families, weights, and rem/px sizes.
     - Verified `Caveat` is strictly applied exclusively to the Sketch tagline (`.sketch-tagline`). All other headings and text maintain crisp sans-serif/serif readability.
  6. **Journal Unchanged (Before/After Verification)**:
     - `src/styles/journalTheme.css`, `JournalView.jsx`, and `JournalEditor.jsx` confirmed 100% untouched.
     - Scoped under `data-style="warm"` with zero interference from `data-panel`.
  7. **Full QA Pass Across Viewports & Modes**:
     - Tested in Light, Dark, and System modes.
     - Tested at 360px (mobile), 768px (tablet), 1280px (standard desktop), and 1920px (large screen).
     - Editor modals (NoteModal, ChecklistEditor, WishlistEditor) opened and closed cleanly without layout shifting.
     - Zero horizontal scroll (`scrollLeft = 0` on window, documentElement, body, and root).
     - No nested scrollbars; all pane scrollers scroll cleanly with localized textures.
     - Dark mode reload tested: instant pre-paint theme application with zero white flash.
  8. **Pure Styling Rule Enforced**:
     - Styling and design tokens only. Zero changes to Dexie schema, database models, Zustand state logic, or queries.

- **Panel Personalities: Milestone 2 (Checklists "Field Clipboard" + Wish List "Dreamy Boutique")**:
  1. **Checklists "Field Clipboard"**:
     - Utilitarian sage & forest guide aesthetic in Light mode (`#F2F6F3` page, `#FFFFFF` paper, `#15803D` button/accent); deep evergreen forest in Dark mode (`#0D1510` page, `#141F18` paper, `#34D399` button with `#0B1510` dark ink text at 9.68:1 AAA contrast).
     - Heading font: `@fontsource/chivo` (weights 600 & 700, latin woff2).
     - Scoped card decoration: Subtle brass/gunmetal clip clamp (`.checklist-card-clip`) visible exclusively under `[data-panel="checklists"]`.
     - Scoped graph paper grid texture (`--texture`) with local scrolling.
     - Custom SVG Field Clipboard empty state illustration with clipboard clip and check rows.
     - Tokenized progress rings, checkmarks, badges, search bar, and action buttons.
  2. **Wish List "Dreamy Boutique"**:
     - Soft lavender & violet celestial boutique aesthetic in Light mode (`#FAF7FD` page, `#FFFFFF` paper, `#7C3AED` button); midnight starry violet in Dark mode (`#120E1C` page, `#1A1528` paper, `#7C3AED` button with white text at 5.70:1 AA contrast).
     - Heading font: `@fontsource/playfair-display` (weights 600 & 700, latin woff2).
     - Scoped card decoration: Boutique ribbon gift tag (`.wishlist-card-tag`) hanging delicately from each card's top edge under `[data-panel="wishlist"]`.
     - Scoped celestial stardust dot texture (`--texture`) with local scrolling.
     - Custom SVG boutique gift tag & stardust ribbon empty state illustration.
     - Tokenized selection rings, price tags (`text-[var(--accent-text)]`), pin icons, category pills, quick-add input, and summary stat cards.
  3. **Strict Contrast & Accessibility Verification**:
     - Script `scripts/calculate-contrast.js` verified 100% PASS for all text (≥4.5:1 AA/AAA) and borders/UI (≥3.0:1) across Light and Dark modes.
     - Checklists Light: Body 15.57:1 (AAA), Secondary 9.54:1 (AAA), Muted 6.74:1 (AA), Accent 5.02:1 (AA), Button 5.02:1 (AA), Header 13.35:1 (AAA).
     - Checklists Dark: Body 16.09:1 (AAA), Secondary 13.22:1 (AAA), Muted 7.48:1 (AAA), Accent 8.82:1 (AAA), Button 9.68:1 (AAA), Header 14.79:1 (AAA).
     - Wish List Light: Body 16.99:1 (AAA), Secondary 10.51:1 (AAA), Muted 6.28:1 (AA), Accent 7.10:1 (AAA), Button 5.70:1 (AA), Header 13.90:1 (AAA).
     - Wish List Dark: Body 16.20:1 (AAA), Secondary 12.80:1 (AAA), Muted 5.74:1 (AA), Accent 12.80:1 (AAA), Button 5.70:1 (AA), Header 15.00:1 (AAA).
  4. **Self-Hosted Offline Fonts (`@fontsource`)**:
     - `chivo-latin-600-normal.woff2`: 15.24 kB
     - `chivo-latin-700-normal.woff2`: 15.10 kB (Total Chivo: 30.34 kB woff2)
     - `playfair-display-latin-600-normal.woff2`: 23.23 kB
     - `playfair-display-latin-700-normal.woff2`: 23.22 kB (Total Playfair Display: 46.45 kB woff2)
     - Max 2 weights each, latin subset only, swap display, cached via service worker.
  5. **Journal Baseline Pixel-Level Proof**:
     - Browser verification with pixel-for-pixel comparison confirmed Journal is 100% identical to baseline in Light and Dark modes (both list view and editor modal).
  6. **Zero Logic Changes**:
     - Pure styling, CSS tokens, and presentational SVGs only. No changes to Dexie, stores, queries, or business logic.

- **Panel Personalities: Milestone 1 (Shared Token Architecture + Quick Notes "Sticky Desk" + Projects "Blueprint Studio")**:
  1. **Token Architecture & Scoping (`panelPersonalities.css`, `App.jsx`, `index.html`)**:
     - Implemented 17-token standardized system per workspace scoped via `document.documentElement` attributes (`[data-panel="notes"]`, `[data-panel="projects"]`, etc.).
     - Static always-available panel tokens (`--panel-notes-accent`, `--panel-projects-accent`, etc.) defined in `:root` and `.dark` for un-scoped consumption by Today cards, Ctrl+K search chips, and sidebar items.
     - Legacy token mapping implemented in every `:root[data-panel="..."]` block (`--bg-primary: var(--bg)`, `--card-default: var(--paper)`, etc.) so shared and unedited components automatically pick up the theme.
     - 180ms smooth color transition with `prefers-reduced-motion` override.
     - Zero flash on reload: `index.html` inline script pre-sets `data-panel` and theme before first paint.
     - Journal theme preserved: Journal continues using `data-style="warm"` strictly without any `data-panel="journal"` interference.
  2. **Quick Notes "Sticky Desk"**:
     - Warm butter-yellow & amber palette in light mode (`#FFF4D6` page, `#FFFBEB` paper, `#92400E` button); deep charcoal/amber in dark mode (`#15130F` page, `#1E1B15` paper, `#FBBF24` button).
     - Heading font: `@fontsource/nunito` (600 & 700 weights, latin woff2).
     - Scoped card decoration: Subtle pinned tape header detail (`.note-card-desk-pin`) visible exclusively under `[data-panel="notes"]`.
     - Custom SVG Sticky Desk empty state illustration with layered paper, tape, and memo lines.
  3. **Projects "Blueprint Studio"**:
     - Architectural drafting grid & indigo studio aesthetic in light mode (`#EEF1FB` page, `#FFFFFF` paper, `#4338CA` button); deep navy drafting canvas in dark mode (`#0C1020` page, `#131A30` paper, `#4F46E5` button).
     - Heading font: `@fontsource/space-grotesk` (600 & 700 weights, latin woff2).
     - Scoped card decoration: Blueprint folder-tab notch (`.project-card-tab`) on project cards.
     - Segmented blueprint progress bar (`.blueprint-progress-segmented`).
     - Custom SVG architectural drafting compass & grid empty state illustration.
  4. **Strict Contrast & Accessibility Verification**:
     - Contrast script `scripts/calculate-contrast.js` verified 100% PASS for all text (≥4.5:1 AA/AAA) and borders/UI (≥3.0:1) across Light and Dark modes.
  5. **Journal Baseline Pixel-Level Proof**:
     - Before & after browser screenshots confirmed 100% pixel-level identical appearance for Journal in Light and Dark modes (list view and editor modal).
  6. **Self-Hosted Offline Fonts**:
     - Nunito (32.79 kB) + Space Grotesk (26.12 kB) = 58.91 kB total woff2 added to bundle. Caching confirmed via `sw.js` `/assets/` cache strategy.

- **Quick Notes Dark Mode & Letter Visibility Overhaul**:
  1. **High-Contrast Letter Visibility on Buttons & Cards**:
     - Fixed `+ New Note` buttons to use dark ink text (`var(--workspace-accent-text): #121417` in dark mode, `#1C1917` in light mode) over the amber/yellow background (`#FBBF24`), elevating contrast from an illegible 1.4:1 to **12:1 WCAG AAA**.
     - Fixed `NoteCard` preview text from `text-text-muted` (`#7C8392`) to `text-text-secondary dark:text-[#D1D5DB]`, achieving **10:1 WCAG AAA contrast** across all dark mode colored card backgrounds.
     - Upgraded card grid layout from squished `minmax(160px, 1fr)` to `minmax(220px, 1fr)`, preventing titles from truncating after only two words.
  2. **Material 3 Dark Tonal Card System (`tokens.css`, `NoteCard.jsx`, `ColorPicker.jsx`)**:
     - Upgraded muddy dark cards to rich chromatic Material 3 surfaces: Warm Mustard (`#2E2718`), Terracotta (`#2E1B1B`), Dusty Blue (`#162636`), Sage (`#182A1E`), Lavender (`#271B33`), and Default (`#1A1D23`).
     - Added 25% tint borders (`dark:border-amber-500/25`, etc.) with subtle top rim highlights (`dark:shadow-[inset_0_1px_0_0_rgba(...,0.12)]`), eliminating invisible `dark:border-*-900/30` outlines.
     - Updated ColorPicker dots to render dark tonal surfaces with glowing rims and high-contrast checkmarks in dark mode.
  3. **NoteModal & TipTap Editor Contrast Overhaul**:
     - Seamless modal header: replaced mismatched `bg-bg-primary/95` with `bg-inherit/90 backdrop-blur-md` so colored notes blend naturally.
     - Upgraded TipTap editor toolbar buttons (`B`, `I`, `H1`, `H2`, lists, quote, code, image) from `text-text-muted` to `text-text-secondary hover:text-text-primary dark:text-[#A7ADBA] dark:hover:text-[#ECEEF2]`, making all action letters immediately readable.
     - Added dedicated high-contrast text selection glow (`rgba(251, 191, 36, 0.35)` with `#FFFFFF` text), fixing the invisible 6% white selection bug.
     - Added amber caret cursor (`caret-[var(--workspace-accent,#FBBF24)]`) and higher contrast placeholder text in dark mode (`#8E96A4`).
  4. **Workspace Functional Bugs Resolved**:
     - Fixed sorting bug: wired `sortBy` ('title', 'date', 'updated') and `sortOrder` ('asc', 'desc') in `GridListPane.jsx`, restoring working Title A-Z and chronological sorting in Quick Notes.
     - Fixed empty note cleanup on modal close so blank phantom notes do not clutter the database.
     - Fixed AI auto-organize plain text snippet extraction from TipTap note content structures.
     - Elevated dropdown menus (Color popover, More menu, Move to project) to `bg-surface-card dark:bg-[#1C2028] shadow-2xl` with readable secondary text.
  5. **Verification**:
     - Production build verified (`npm run build` completed in 27.66s with zero errors).
     - Automated browser subagent verified "+ New Note" dark ink readability, note preview text clarity, editor modal blending, toolbar letter visibility, text selection highlight, color switching, and sort toggling.

- **Routines Dark Mode ("Make Dark Mode Perfect")** — Complete Material 3 tonal surface overhaul across the Routines workspace and related surfaces on branch `routines-dark-mode`:
  1. **Audit & Token Foundations (`src/styles/routinesTheme.css`, `main.jsx`, `App.jsx`)**:
     - Audited all color sources in Routines, Today Dashboard, RoutineSheet, and compared with ChecklistCard (confirmed checklists use separate Tailwind defaults and do not share palette tokens).
     - Replaced hard-coded inline pastel colors (`palette.bgLight`, `palette.containerLight`, `palette.textLight`, `palette.accentLight`) with CSS token variables applied at document root (`:root` and `.dark`), ensuring universal theming for modals, sheets, and menus with zero flash on reload.
     - Document-level workspace scoping: `data-workspace={activeWorkspace}` applied to `document.documentElement` dynamically.
  2. **Material 3 Dark Surface System**:
     - Page: `#0E1116`, Card Surface: `#151A21`, Raised/Hover: `#1C232C`, Border: `rgba(255, 255, 255, 0.08)`.
     - Text hierarchy: Primary `#E8EDF3` (14.85:1 contrast AAA), Secondary `#AEB8C5` (8.71:1 contrast AAA), Muted `#7F8B9A` (5.04:1 contrast AA).
     - Surface elevation using lighter tones and subtle inner highlight (`inset 0 1px 0 0 rgba(255, 255, 255, 0.06)`) and soft colored border glow on hover (`0 8px 24px -4px var(--palette-glow)`), eliminating dead flat black and washed-out shadows.
     - Today Hero: Harmonized with a soft sky tint gradient (`#192735` to `#151A21`) replacing the navy gradient.
  3. **8 Curated Tonal Palettes (Light & Dark) (`src/lib/routines/routineUtils.js`, `routinesTheme.css`)**:
     - Supported palettes: `sky` (`#38BDF8`), `emerald` (`#34D399`), `amber` (`#FBBF24`), `coral` (`#FF8A75`), `indigo` (`#818CF8`), `violet` (`#A78BFA`), `rose` (`#FB7185`), `teal` (`#2DD4BF`).
     - Dark containers: accent hue at 12–16% over dark surface (`color-mix` / solid tone); on-container text is a light tint (≥9.5:1 AAA).
     - Filled accent buttons & cells use dark ink check marks (`#0B1220`), achieving between 6.28:1 and 11.22:1 AAA contrast across all 8 colors.
     - Legacy color mapping (`default`, `yellow`, `blue`, `green`, `purple`, `red`) preserved and mapped seamlessly in both modes.
  4. **Component Polish Pass**:
     - **Routine Card (Grid & List)**: Container surfaces, high-contrast readable titles, streak pills with amber flame, schedule and time chips with theme-aware `chipBg`, icon bubbles, and calm, readable completed states.
     - **Check-in Button**: 48px interactive button with accent ring and `bg-white/5` when unchecked; filled accent with dark check mark (`#0B1220`) and luminous colored glow (`var(--palette-glow)`) when checked; animated ripple in accent hue.
     - **Weekly Strip Cells**: Done = solid accent with dark check; Missed = dashed outline; Frozen = ice snowflake; Today = distinct accent ring; Future = faded.
     - **Today Hero**: 84px progress ring with 12% white background track (`rgba(255, 255, 255, 0.12)`), sky 400 stroke with soft luminous drop shadow (`drop-shadow(0 0 6px rgba(56, 189, 248, 0.45))`), percentage counter, motivational line, elevated stat pills (`#1C232C`), and confetti with 6 luminous dark-friendly hues.
     - **Filter Chips**: "All Habits", "Today", "Pending", "Done" styled with soft sky tint (`bg-sky-500/15 dark:bg-sky-400/15 text-sky-800 dark:text-sky-300 border border-sky-500/30 dark:border-sky-400/30`) and high-contrast count badges.
     - **Sticky Section Headers**: Opaque `bg-bg-primary` matching page background so cards scroll cleanly underneath with zero text bleed-through.
     - **Routine Sheet Modal**: Themed live preview card, 8 dark tonal palette buttons, input fields, and high-contrast primary buttons.
     - **Sidebar Search Divider**: Added `border-b border-black/5 dark:border-[var(--divider-color)] bg-bg-sidebar relative z-10` under search box to prevent collisions when scrolling items.
  5. **Contrast & Verification**:
     - Automated WCAG 2.1 script computed 100% PASS for all 8 palettes in both Light and Dark modes.
     - Production build verified (`npm run build` completed in 41.31s with zero errors).
     - Browser verification completed across 1280px, 768px, and 360px viewports testing unchecked, checked, sheet modal, Today dashboard, and theme toggling.

- **Sketch Panel Redesign: Milestone 1 (Gallery Redesign & Performance Architecture)** — Transformed Sketch into a high-performance gallery and studio: (1) **Benchmark & Lightweight Derived Cache (`sketchCacheDb`)**: Measured 105 synthetic sketches (including photo payloads); current query took 1,500.4 ms and 37.35 MB payload; plain notes query took 598.5 ms and 18.28 MB; derived cache database (`yourspace_sketch_cache`) reduced query time to **26.9 ms** (55x speedup) and payload to **1.04 MB** (97% memory reduction); (2) **Transactional Synchronization**: Added Dexie table hooks on `db.notes` and `db.attachments` executing cache writes in separate transactions after main commits; implemented idle reconciliation by primary keys and manual "Rebuild gallery cache" in More menu; (3) **Atomic Merging Saves**: Updated `saveSketch` and card actions (star favorite, pin, sketchbook move, rename) to use Dexie `.modify()`, ensuring metadata fields are never clobbered by autosave and `updated_at` is only modified on genuine drawing/title edits; (4) **Start Strip & Header**: Added generous header padding under sticky TopBar, hand-drawn SVG underline, and 4-tile Start strip (Quick Doodle with shortcut `D`, New Sketch, From Photo with file picker/camera, and Templates); collapses to 2x2 compact layout on narrow panes; (5) **Three View Modes (Grid, Wall, List)**: Added responsive Grid (`minmax(200px, 1fr)`), unique Wall masonry pin-board (CSS columns with CSS-only tape corners and static ±1.5° tilt, disabled for reduced motion), and compact List (table-of-contents rows); (6) **TopBar Integration**: Added Wall toggle button strictly scoped to Sketch workspace (`workspaceViewModes.sketch`), wired sort options (Last edited, Created, Title A–Z) with single-click Desc/Asc toggle; (7) **Sketchbooks & Organization**: Search across titles, descriptions, and sketchbooks; filter chips (`All`, `Doodles`, `Sketches`, `Photos`, `Favorites`); sketchbook folder collections with customizable palette colors; (8) **Empty Sketch Cleanup**: Fixed untouched new sketch detection on exit, and added "Clean up empty sketches" in More menu with selective checkboxes and confirmation before moving to Trash; (9) **Contrast & Accessibility**: Primary orange buttons upgraded to `#C2410C` with white text (≥5.8:1 contrast), cards support arrow navigation, `Enter` to open, `F2` for inline rename, and descriptive thumbnail alt text.
- **Journal Panel Redesign: Milestone 1 Continuation (Timeline Upgrade & Left Shift Fixes)** — Resolved timeline and layout symptoms on `journal-redesign`: (1) **Left Shift Root Cause Fix**: Diagnosed horizontal ancestor displacement caused by `scrollIntoView()` on selected entry cards ([src/components/journal/JournalView.jsx:188](file:///d:/projects/Ai%20powered%20notes%20application/your%20space/src/components/journal/JournalView.jsx#L188)) together with `overflow: hidden` on the app shell container ([src/App.jsx:70](file:///d:/projects/Ai%20powered%20notes%20application/your%20space/src/App.jsx#L70)); replaced `scrollIntoView` with vertical-only `.pane-scroller` `scrollTop` calculations, applied `overflow-x: clip overflow-y: hidden` to the shell, sidebar, and grid-list panes, and implemented active `scrollLeft = 0` locks ensuring sidebar and logo are never clipped; (2) **Sticky Month Heading**: Built sticky month heading as an opaque normal-flow block (`var(--journal-bg)` with subtle bottom border, month on left, entry count on right, `z-index: 10`), guaranteeing cards scroll cleanly underneath with zero text bleed-through in both Light and Dark modes; (3) **TopBar Sort & View-Mode Integration**: Wired `JournalView` to `uiStore` (`viewMode`, `sortOrder`, `sortBy`); added single-click Desc/Asc toggle button, sort dropdown menu (Newest first, Oldest first, Title A–Z) rendered in a portal with zero clipping; Title sort renders a flat list without month dividers; (4) **"PAGES" Grid View**: Responsive portrait paper cards (`repeat(auto-fill, minmax(220px, 1fr))`, ~4/5 aspect ratio, equal heights), mood-colored left spine, CSS folded corner, 2-line clamped title, 6-line faint ruled preview or italic "Blank page", and footer with mood badge, word count, and tags; (5) **"CONTENTS" List View**: Compact table-of-contents rows (~56-60px) with date chip, title, 1-line preview, mood badge, word count (`{count}w`), and tags; (6) **Manual Empty Entry Cleanup**: Added "Clean up empty entries" to the Journal header More menu (`...`); opens a confirmation modal scanning for entries with no title, no content, and no mood, with selective checkboxes, confirmation dialog, soft-delete to Trash, and Undo toast (zero automatic deletions).
- **Journal Leftover Pink Removal & Warm Accent Harmonization (UI/CSS Only)** — Eliminated all legacy rose/pink (`#F43F5E`, `#FB7185`) accents across the app for the Journal workspace: (1) Replaced `--accent-journal` with bronze `#8A5A1B` in Light Mode and light gold `#E8B872` in Dark Mode, and `--accent-journal-bg` with soft gold tints (`rgba(184, 137, 68, 0.16)` light, `rgba(222, 175, 104, 0.18)` dark); (2) Harmonized active "Journal" sidebar navigation item to use soft gold background with bronze/gold icon and label; (3) Harmonized TopBar active grid/list toggle buttons and sort dropdown to use soft gold/bronze active styling; (4) Updated Sidebar top header (brand "YS" icon, search box, theme toggle button) under `[data-style="warm"]` to blend with the warm parchment/candlelit palette; (5) Updated Today Dashboard Card 3 (Journal Daily Prompt) from indigo to warm amber/gold and Card 6 (Streak Summary) from rose to amber; (6) Replaced rose badge styling in `ArchiveView` and `TrashView` with warm amber/gold; (7) Replaced smile icon rose color in `JournalEditor` with `var(--journal-gold)`; (8) Added warm scrollbar thumb styles under `[data-style="warm"]`. Verified across Light, Dark, and System modes with zero visual defects.
- **Journal Panel Redesign: Milestone 1 (Warm Sanctuary Theme + Page Redesign)** — Transformed the Journal workspace into a bookish sanctuary: (1) **Theme Tokens (`journalTheme.css`)**: Light "Parchment" (`#EFE3C3` page, `#FDF9EE` paper cards, `#43332A` espresso header band, `#2F231B` text at 11.2:1 AAA contrast, `#B88944` gold lines) and Dark "Candlelit" (`#140E0A` page, `#1D1510` paper cards, `#201712` header band, `#F4E8D3` text at 14.1:1 AAA contrast, `#DEAF68` gold accents). All tokens meet WCAG AA contrast (≥4.5:1 text, ≥3:1 borders/icons); (2) **Theme Scoping**: Scoped via `data-style="warm"` attribute dynamically applied to `document.documentElement` while Journal is active, seamlessly reaching portals, modals, and tooltips across Light, Dark, and System modes with zero flash; (3) **Offline Serif Typography**: Integrated `@fontsource/lora` latin subsets (`400`, `500`, `600`, `400-italic`) bundled into local assets with Georgia fallback; (4) **Espresso/Candlelit Header Band**: Serif title, custom tagline ("A quiet place for your thoughts"), lit/unlit SVG candle streak badge with `prefers-reduced-motion` safe flame, and "Write Today" button; (5) **"What's on your mind?" Writing Card**: Categorized prompt packs (Reflection, Gratitude, Brain dump, Morning intention, Evening wind-down, Advice to a friend), deterministic day-of-year picker shared with Today Dashboard, client-side Shuffle, and 1-tap "Tiny entry (3 lines)"; (6) **35-Day Mood Heatmap**: 7-column × 5-row compact calendar matched strictly by local `entry_date` (falls back to local conversion of `created_at` only if missing), displays mood of the most recent entry with a mood, neutral warm gold dots for moodless entries (not blue), today's gold ring, safe portal tooltips ("Date · Mood · Title"), and Mood of the Week summary; (7) **Month-Grouped Timeline**: Sticky month headings with thin gold dividers, paper cards with mood-colored left spine, date chips, mood badges, serif titles, 2-line preview, tags, pinned bookmark ribbon, and 32px hit-area card actions (Color, Pin, Archive, Trash); (8) **Gentle Streak Engine (`journalUtils.js`)**: Calculates consecutive writing days with 1 grace day per week, whole-day numbers with `Date.UTC(y, m-1, d)`, and local date anchoring, synchronizing both JournalView and TodayDashboard so streaks never drop; (9) **Empty Entry Protection**: `isJournalEntryEmpty` recognizes prompt-only or blank entries and auto-deletes them on close; (10) **Sidebar Fix**: Refined top padding and scroll offset ensuring the "WORKSPACES" label and "Today" item are never obscured under the search bar.
- **Sketch Engine Optimization & Experience Fixes (Drawing Lag, Strokes, and Layout):**
  - **Drawing Lag Eliminated (60fps steady, <2ms pointermove handler):**
    - **Dual-Canvas Architecture:** Decoupled the drawing workspace into (1) a cached `committedCanvasRef` holding all completed layers, background pattern, and guides (redrawn only on undo/redo, layer changes, zoom, or resize), and (2) an ultra-fast `liveCanvasRef` (`desynchronized: true`) that only renders the single in-flight active stroke.
    - **Zero-Re-Render Pointer Handling:** Eliminated React state (`setCursorPos`) and store mutations on `pointermove`. All pointer tracking occurs outside the React component lifecycle using refs and direct canvas rendering batched in `requestAnimationFrame`.
    - **High-Performance Direct Outlines:** Replaced dynamic SVG string parsing (`reduce` + `Path2D`) in `strokeRenderer.js` with direct Canvas 2D quadratic Bézier curve polygon filling (`drawDirectOutline`), eliminating hundreds of memory allocations per frame.
    - **Hardware-Accelerated Cursor Preview:** Replaced DOM React-state cursor follower with a lightweight, GPU-transformed div updated directly via `style.transform = translate3d` in the native pointer handler with zero React re-renders.
    - **Coalesced Points & Subpixel Filter:** Integrated `e.getCoalescedEvents()` to capture high-density intermediate pointer points without dropping curve segments, and filtered out subpixel micro-jitter points (<0.5px).
    - **Ramer-Douglas-Peucker Simplification:** Added `simplifyPoints` algorithm with epsilon 0.3px executed on `pointerup`, reducing stored stroke points cleanly without visible geometry degradation.
  - **Clumsy / Wobbly Strokes Fixed:**
    - **Uniform Width for Mouse Input:** Detected `hasRealPressure`. For mouse input (where browser pressure defaults to 0.5), `thinning` is set to 0, completely removing velocity-based thickness fluctuations. Real pressure variation (`thinning: 0.35`) is active only when true stylus hardware pressure is detected.
    - **Responsive Distance-Based Smoothing:** Default stabilizer tuned to snappy 15% distance-based smoothing (`streamline: 0.075`), eliminating trailing line latency and wobbles.
    - **Shift-Key Angle Snap:** Holding Shift constrains the in-flight line to strict 15° incremental angles for pixel-perfect straight lines.
  - **Layout & UI Bugs Fixed:**
    - **Viewport Fitting:** Added responsive `handleFitToScreen` calculation with 24px margins and responsive centering, plus a `1:1` zoom reset shortcut in the top bar.
    - **Tool Rail Overflow & Reachability:** Added custom thin scrollbars (`[scrollbar-width:thin] overflow-y-auto pb-6`) to the left tool rail, ensuring all tools (Eraser, Fill, Text, Stamps, etc.) are reachable and clickable at any viewport height down to 480px.
    - **Title Input Truncation:** Added `min-w-[140px]` with flexible expansion and tooltip title to prevent the title from displaying as `"Unti..."`.
    - **Brush Size Chip:** Corrected text from truncated `"4p"` to full `"4px font-medium"`. Clicking the chip opens the brush & color popover.
    - **Photo Locked Chip:** Strictly gated the chip behind `{hasPhoto && ...}`, ensuring it remains hidden on clean sketches without image layers.
  - **Verification:**
    - `npm run build` succeeds cleanly in 11.72s with zero errors.
    - Automated browser subagent verified drawing smoothness, straight line snapping with Shift, tool rail reachability, brush size popover, and top bar fixes with zero console exceptions.
- **Sketch Studio Phase 1B (Doodle Experience) completed:**
  - **Instant Doodle Start (<1s):**
    - "New Sketch" opens a ready, blank, full-size canvas immediately (defaults to Free canvas, white in light mode, dark in dark mode) with zero initial size picker prompt.
    - Added "Quick Doodle" button (and global keyboard shortcut `D` from the Sketch panel) to start sketching in 1 click.
    - Database persistence is deferred until the user actually draws on the canvas (preserves empty-sketch cleanup).
    - Canvas size, background patterns, and aspect ratio presets moved into the "Canvas" option in the top More menu, changeable anytime.
  - **8 Doodle Brushes (`src/lib/sketch/strokeRenderer.js`, `types.js`):**
    - **Pen**: ultra-smooth ink with `perfect-freehand` spline smoothing and stylus pressure dynamics.
    - **Marker**: bold, chiseled edges with consistent ink saturation.
    - **Highlighter**: translucent ink wash with multiply blend mode (`globalCompositeOperation = 'multiply'`).
    - **Pencil**: textured graphite tooth with stippled grit specks along the stroke path.
    - **Crayon**: rough waxy edges with polygon jitter algorithm.
    - **Neon**: electric luminous halo with dual-pass outer `shadowBlur` and white core discharge line.
    - **Watercolor**: soft, layered translucent washes with feathered edge bleeding.
    - **Rainbow**: dynamic HSL color cycling smoothly across stroke distance.
    - Live brush preview circle, size slider, opacity slider, and stroke stabilizer slider (0 to 100%).
  - **Flood Fill Bucket & Color Studio (`src/lib/sketch/floodFill.js`, `ToolOptionsPopover.jsx`):**
    - 4-way BFS scanline flood fill engine with adjustable tolerance (0 to 100). Fills active layer instantly as an isolated raster PNG mask layer for 60fps interaction and flawless undo/redo.
    - Curated palette presets (Pastel, Neon, Earth, Mono), 6 recent colors memory, and eyedropper tool.
    - Two-color gradient brush toggle (`color` to `colorB` linear interpolation).
    - Background color & pattern changes without altering drawing layers.
  - **Symmetry & Shape Assist (`src/lib/sketch/symmetryUtils.js`, `strokeRenderer.js`):**
    - Symmetry modes: Vertical mirror, Horizontal mirror, Radial 4, Radial 6, and Radial 8 axes with faint guide lines. Strokes draw simultaneously across all symmetric axes.
    - Hold-to-snap Shape Assist: pauses at the end of a stroke offer instant snapping to clean circles, rectangles, triangles, lines, and arrows, with a clean "Undo Snap" toast button.
  - **Stamps & Stickers Tray (`src/components/sketch/StickerPickerModal.jsx`):**
    - Curated tray of 40 emojis and doodle shapes with recent stamps row stored in localStorage.
    - Single Stamp placement (tap to place, then drag, resize, rotate) and **Stamp Brush** mode scattering stamps dynamically along a stroke with random scale and rotation.
  - **Doodle on Photos (`src/components/sketch/SketchEditor.jsx`):**
    - Automatically enters "Doodle on photo" mode on image import: photo is placed and locked in the background with an unlock button.
    - Quick photo doodle presets banner: White Outline Marker, Neon Glow Pen, and Sticker Border brush (thick white halo with shadow).
    - 4 Google casual/handwriting fonts loaded (`Caveat`, `Patrick Hand`, `Kalam`, `Indie Flower`) with text outline and drop shadow toggles for photo legibility.
  - **Fun, Feel & Replay Engine (`src/components/sketch/ReplayModal.jsx`):**
    - Stroke-by-stroke Drawing Replay modal with play/pause, restart, 1x/2x/4x playback speed, scrub timeline, and `MediaRecorder` WebM video export.
    - Smooth hover circle cursor matching brush size and canvas zoom.
    - Touch gesture support: 2-finger tap for undo, 3-finger tap for redo, pinch to zoom, palm rejection.
    - Clear Canvas confirmation modal with instant undo support.
  - **Sharing & Export Ready (`src/lib/sketch/exportEngine.js`):**
    - Updated export engine to composite fill layers, neon glowing halos, stamps, symmetric strokes, and sticker borders identically in PNG/JPG/PDF exports.
  - **Verification:**
    - `npm run build` compiled cleanly with zero errors (`vite build` in 17.59s).
    - Browser subagent verified navigation, instant canvas start, brush picker, neon drawing, stroke rendering, and canvas persistence.
- **Phase 3 — Feature 1: Today Dashboard (Home Screen) completed:**
  - **Today Home Screen Layout (`src/components/layout/TodayDashboard.jsx`):**
    - Calm, responsive, anti-clutter home screen presenting a unified daily command center.
    - Warm Amber design tokens (`--accent-today`, `#F59E0B` in Light mode, `#FBBF24` in Dark mode).
    - Top header with personalized time-based greeting, full date display, and global streak pill.
    - **Card 1: Today's Routines:** Lists daily habits and routines with 1-tap completion toggles, progress bar indicator, and direct routine creator shortcut.
    - **Card 2: Due Today (Tasks):** Filters checklist tasks due today or overdue with 1-tap checkoff and breadcrumb linking to parent checklist.
    - **Card 3: Daily Journal Prompt:** Curated daily reflection prompts with instant "Write Entry" / "Continue Today's Entry" button seamlessly transitioning to Journal workspace.
    - **Card 4: Recent Notes:** Exactly 3 most recent notes across any workspace with live type icons, relative timestamps, and 1-click opening.
    - **Card 5: Monthly Wishes:** Highlights active wishlist targets due in the current month with category badges, priority dots, and formatted prices.
    - **Card 6: Consistency & Streaks:** Visual habit & journal momentum tracker with motivational feedback badges.
    - Friendly, encouraging empty states with quick-creation triggers for every card.
  - **Navigation & Integration:**
    - Sidebar has "Today" (`Sun` icon) at the very top of navigation items with amber active accent.
    - Breadcrumbs in TopBar updated to support Today home crumb.
    - Command Palette (`Ctrl+K`) updated with Today workspace as the top destination.
  - **Dexie Query Suite (`src/lib/queries/todayDashboard.js`):**
    - Fully resilient, safe queries (`getTasksDueToday`, `getRoutinesStatusForToday`, `getRecentNotes`, `getMonthlyWishes`, `getStreakSummary`, `getTodayJournalInfo`) avoiding Dexie key/index errors with robust in-memory filtering and fallback handling.
  - **Verification:**
    - Production build verified (`npm run build` succeeds cleanly with exit code 0).
    - Browser subagent verified responsive layouts at 360px (mobile), 768px (tablet), 1280px (desktop), and 1920px (ultrawide) in both Light and Dark modes.
    - Interactive routine completion, journal transition, and sidebar navigation verified.
- **Sketch Studio Phase 2 (Export + Share & PWA Integration) completed:**
  - **Export Engine (`src/lib/sketch/exportEngine.js`):**
    - Multi-layer offscreen canvas renderer composite omitting guide grids.
    - Resolution scale selection: 1x, 2x (Retina / print), 3x (Ultra HD).
    - Formats: PNG (with alpha transparency toggle), JPG (with quality slider 40-100%), and single-page vector PDF via `jspdf`.
    - Social Aspect Presets: Instagram Post (1080x1080), Instagram Story (1080x1920), WhatsApp Status (1080x1920), and Original Size. Supports "fit" (letterboxed) and "crop" modes.
    - Optional customizable watermark text (default off).
    - Asynchronous offscreen rendering with object URL garbage collection.
  - **Comprehensive Share Sheet (`src/components/sketch/ShareModal.jsx`):**
    - Live render preview with computed resolution badge (`px • scale`).
    - **Native Web Share API**: checks `navigator.canShare({ files })` and triggers native system share sheet (Instagram Stories/DM, WhatsApp, Photos, AirDrop, etc.). Gracefully handles user `AbortError`.
    - **Download / Save Image**: clean filenames like `sketch-title-YYYY-MM-DD.png`.
    - **Copy Image**: writes directly to clipboard using `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])` with `Copied ✓` feedback for WhatsApp Web, Instagram Web DM, or Google Docs.
    - **WhatsApp & Instagram Fallbacks**: native file share when supported; desktop fallback copies image or downloads with direct deep-links and clear instructions.
    - **Email (mailto:)**: pre-fills subject and body with attachment reminder.
    - **Share Description Toggle**: optionally passes sketch description as caption text.
  - **PWA Setup & Web Share Target (`manifest.webmanifest`, `sw.js`):**
    - Web app manifest with standalone display, brand colors, and adaptive SVG icons.
    - Service worker (`sw.js`) handling offline caching and Web Share Target `POST /?share-target=true`.
    - Receiver in `main.jsx` captures photos shared directly from the mobile gallery into Your Space and automatically opens a new sketch with the photo imported.
  - **Quick Action Integration:**
    - Gallery cards feature 1-click **Share** button (`Share2` icon) opening the share sheet directly without needing to open the editor.
    - Sketch Studio top bar includes a primary **Share** button and **Export & Share...** option in the More menu.
  - **Verification:**
    - `npm run build` compiled cleanly with exit code 0 (`vite build` in 13.36s).
    - Browser subagent verified navigation, card share action, studio top bar Share button, live preview, presets, format switching (JPG quality slider, PDF), Copy Image confirmation (`Copied ✓`), Download, and clean modal close.
- **Sketch Studio Phase 1 (Canvas + Image Import + Drawing) completed:**

  - **Custom Canvas 2D Multi-Layer Architecture & Pressure Dynamics:**
    - Integrated `perfect-freehand` for smooth, pressure-sensitive inking across stylus (Apple Pencil / S-Pen / Wacom), mouse, and touch.
    - Standardized on `PointerEvent` with palm rejection (`pointerType === 'pen'` filters extraneous touch events).
    - Multi-touch gesture engine: tracks active pointers in memory, smoothly triggering two-finger pinch-to-zoom and two-finger pan.
  - **Non-Destructive Storage & Additive Dexie v7 Migration:**
    - Upgraded Dexie schema to `db.version(7)` in [db.js](file:///d:/projects/Ai%20powered%20notes%20application/your%20space/src/lib/db.js) additively preserving all legacy records.
    - Structured non-destructive multi-layer document model (`{ version: 2, preset, width, height, background, layers: [...] }`).
    - Built transparent backward compatibility in `migrateLegacySketchDoc`: legacy flattened bitmaps load as base photo layers and old stroke arrays load into active artwork layers.
    - Flattened high-resolution thumbnails generated via canvas and saved into `attachments.image_data` ensuring immediate backward compatibility across gallery cards and note attachments.
  - **Canvas Setup & Aspect Ratio Presets (`CanvasPresetsModal.jsx`):**
    - "New Sketch" opens a size picker with Free canvas, Square 1:1 (1080x1080), Portrait 4:5 (1080x1350), Story 9:16 (1080x1920), Landscape 16:9 (1920x1080), and A4 Document (1240x1754).
    - Remembers last chosen preset in `localStorage`.
    - Backgrounds: White, Dark Surface, Transparent (checkerboard), Dot Grid, Graph Grid, and Lined Paper, with an instant toggle to show/hide pattern guides without baking into exports.
  - **Image Import & Transformation Engine (`imageUtils.js`, `ImageActionToolbar.jsx`):**
    - 4 import pathways: file picker, drag-and-drop onto canvas, clipboard paste (`Ctrl+V`), and mobile camera capture (`capture="environment"`).
    - Automatic downscaling for large images (>2500px) maintaining 60 FPS performance and lean storage.
    - Interactive transform gizmo: 8 corner/edge resize handles, top rotation knob with angle tracking, and snap-to-center guidelines (X and Y center axis alignment).
    - Floating context toolbar: Rotate 90° Clockwise, Flip Horizontally, Flip Vertically, Opacity slider (0-100%), Crop, Replace, and Delete.
    - Immediate "Draw on top": drawing layers sit on top of imported photo layers.
  - **Drawing Tools & Creative Suite (`strokeRenderer.js`, `ToolOptionsPopover.jsx`, `SketchToolbar.jsx`):**
    - Tools: Pen (pressure ink), Marker (chiseled cap), Highlighter (semi-transparent multiply blend), Pencil (textured grain), Eraser (stroke & pixel erasers).
    - Shapes: Line, Arrow, Rectangle, Ellipse with outline/fill toggle, Shift key constraints (straight line, 45°, square, circle), and intelligent "Hold-to-Snap" recognition.
    - Typography: Text tool with font selector (Inter, Georgia Serif, Mono, Handwriting, Impact Bold), font size slider, and bold toggle.
    - Emoji & Sticker Picker (`StickerPickerModal.jsx`): Curated sticker palette for quick idea annotation.
    - Privacy Mosaic / Blur Brush: non-destructive pixelated mosaic blocks for obscuring sensitive details on photos.
    - Select / Move tool: select objects, drag, resize, rotate, and delete.
    - Eyedropper: native `window.EyeDropper` API with fallback canvas pixel color sampler.
  - **Layers Panel (`LayersPanel.jsx`):**
    - Collapsible panel supporting up to 8 non-destructive layers with add, visibility toggle, reordering (up/down), deletion, and layer-level opacity slider.
  - **Workspace & Safety Polish:**
    - 50+ history states for Undo/Redo (`Ctrl+Z`, `Ctrl+Y`).
    - 1-second debounced autosave with "Saved ✓" indicator, and `beforeunload` / `visibilitychange` flush.
    - Gallery cards with live thumbnails, date display, one-line renamable title, duplicate sketch (`duplicateSketchNote`), and soft delete to Trash.
    - Fullscreen studio mode (`F` / `Esc`), keyboard cheat sheet (`?`, `ShortcutsModal.jsx`), and light/dark theme adaptation.
  - **Verification:**
    - Verified production build compiles cleanly with code 0 (`vite build` in 17.17s).
    - Verified via Browser Subagent: navigation, preset picker modal, canvas drawing, undo/redo, layers panel, returning to gallery, sketch card rendering, and light/dark mode toggling.
- **Wish List Editor Focus Jump Fix completed:**
  - **NoteModal Focus Stabilization (`NoteModal.jsx`):**
    - Refactored `onClose` to `useRef(onClose)` so changes in callback references do not re-run the modal focus trap or body scroll lock effects.
    - Decoupled auto-focus from general modal state. Introduced `autoFocusTitle` prop (defaults to `false`), using `hasFocusedRef` to ensure auto-focus triggers strictly once on initial mount for newly created items.
    - Preserved focus when interacting with, typing in, or clicking any other input or field.
  - **Editor Pane State & Props (`EditorPane.jsx`):**
    - Wrapped `handleClose` in `useCallback` with stable dependencies (`[isProject, isSubproject, setSelectedProjectId, setSelectedSubprojectId, setSelectedNoteId]`).
    - Added `isNewItem` calculation (`activeItem.created_at === activeItem.updated_at && !activeItem.title`) passing `autoFocusTitle={isNewItem}` to `NoteModal`.
    - Added `id="editor-title-input"` and `data-title-input="true"` to Title input.
    - Passed stable `key={selectedNoteId}` and `itemId={selectedNoteId}` to `WishlistEditor`.
  - **Wishlist Form State Sync, Debounce & UX (`WishlistEditor.jsx`):**
    - Local state syncs strictly when `itemId` changes (`[itemId, content]`), preventing autosave echo from resetting in-progress form inputs.
    - Implemented ~600ms debounced autosave for text inputs (Price, Link, Notes, Cover Image URL) with immediate flush on `blur`, while category/status/priority button clicks save immediately.
    - Updated Estimated Price input to `type="text"` with `inputMode="decimal"` and non-focusable `₹` prefix (`pointer-events-none`). Decimal typing, backspacing, and field clearing are smooth without premature number conversion. Formats cleanly on `blur`.
    - Configured unique `id` and `<label htmlFor="...">` attributes across all editor fields (`wishlist-image`, `wishlist-price`, `wishlist-target-date`, `wishlist-link`, `wishlist-notes`).
  - **Verification:**
    - Verified `npm run build` succeeds cleanly with code 0 (`vite build` in 20.89s).
    - Verified in browser: created new wish ("New Laptop"), entered price ("25000"), added link ("https://apple.com") and notes ("M3 Max 36GB RAM"), selected category ("Learn") and priority ("High") with zero focus jumping back to title. All data autosaved properly and persists in view.
- **Wish List Card Size Fix completed:**
  - **Compact Card Component (`WishlistCard.jsx`):**
    - Created dedicated, modular `src/components/wishlist/WishlistCard.jsx`.
    - Removed the massive `aspect-video` placeholder area. If a wish has no image, no placeholder image/gradient is rendered at all, displaying clean, breathable content.
    - If a wish has an image, renders it as a compact 64x64 rounded thumbnail on the left side (`w-16 h-16 min-w-[64px] min-h-[64px] rounded-xl object-cover shrink-0`).
    - Enforced a strict maximum card height of 120px (`max-h-[120px] h-full`), keeping cards roughly the same height as Quick Notes cards (~84-90px).
    - Single-line title with ellipsis (`truncate font-semibold text-sm`).
    - Inline price (`text-xs font-bold text-violet-600 dark:text-violet-400 shrink-0`), category pill, and priority dot.
    - Right-aligned 32px height pill "Check" / "Got it!" button (`h-8 min-h-[32px] px-2.5 rounded-full flex items-center gap-1.5 text-xs font-medium`).
    - Standardized card action buttons (Color palette, Pin, Archive, Delete) with min 32px hit area, `e.stopPropagation()`, visible on touch and on hover for desktop.
  - **Grid Layout Standardization (`WishListView.jsx`):**
    - Updated active and completed wish grids to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch`.
    - Guaranteed uniform equal heights across all cards via `items-stretch` and `h-full`.
  - **Compact List View Rows:**
    - Standardized list view rows to compact 48-64px height (`h-14 min-h-[48px] max-h-[64px] px-3.5 py-2`).
    - Thumbnail (or small category icon), title, category, priority, price, and actions positioned inline with zero vertical overflow.
  - **Verification:**
    - Verified production build compiles cleanly with code 0 (`vite build` in 8.11s).
    - Verified in browser: multiple compact cards render cleanly across the screen without giant placeholders or empty whitespace.
- **Journal Scroll & Split-View Layout Fix (Steps 1 through 6) completed:**
  - **Step 1 (Diagnose & Root Cause Audit):**
    - Identified nested scroll containers competing for vertical space in JournalView, Daily Prompt, Mood History, and TipTap canvas.
    - Identified broken `min-h-0` flex chain in `App.jsx`, `Sidebar.jsx`, and `GridListPane.jsx` causing inner content to overflow boundaries.
    - Identified viewport media queries (`lg:`, `sm:`) miscalculating available width when the split-view pane opens, squeezing multi-column grids into ~380px panes.
  - **Step 2 (One Scroll Container Per Pane & min-h-0 Flex Chain):**
    - Registered `@tailwindcss/container-queries` in `tailwind.config.js`.
    - Defined `.pane-scroller` in `src/styles/tokens.css` with `scrollbar-gutter: stable`, `overscroll-behavior: contain`, `scrollbar-width: thin`, and themed WebKit scrollbars.
    - Updated `App.jsx` root container to `flex flex-row h-dvh w-screen max-w-[100vw] overflow-hidden min-w-0`.
    - Updated `Sidebar.jsx` aside to `flex flex-col h-full min-h-0 w-[250px] min-w-[250px]`.
    - Updated `GridListPane.jsx` root to `flex-1 min-w-0 h-full min-h-0 flex flex-col overflow-hidden` with the inner body container as the single scroll container: `pane-scroller @container flex-1 min-h-0 min-w-0 p-4 sm:p-6 relative overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] [overscroll-behavior:contain]`.
    - Updated `JournalEditor.jsx` so header, date/mood banner, title, and footer are fixed (`shrink-0`), with nested scrollbars removed and TipTap acting as the sole content scroller (`pane-scroller flex-1 min-h-0 overflow-y-auto overflow-x-hidden`).
  - **Step 3 & 4 (Container Queries, Natural Flow & Zero-Overlap Header for Journal):**
    - Updated `JournalView.jsx` header to `flex flex-wrap items-center justify-between gap-x-4 gap-y-2 min-w-0 w-full` with title/workspace badge as `shrink-0 whitespace-nowrap`, wrapping streak and "Write Today" cleanly without overlap.
    - Changed Journal grid to `@container` responsive: `@min-[720px]:grid-cols-[minmax(0,1fr)_340px] grid-cols-1 gap-6 min-w-0 w-full items-start`.
    - When pane $< 720\text{px}$, direct grid children stack cleanly in one full-width vertical stream: Daily Prompt (`order-1`), Mood History (`order-2`), Timeline (`order-3`), and On This Day (`order-4`).
    - When pane $\ge 720\text{px}$, Timeline occupies left column (`col-start-1 row-start-1 row-span-3`) while widgets occupy right column rows 1-3.
    - Daily Prompt card text wraps naturally (`break-words normal-case`) with prompt actions placed on a dedicated row.
    - Mood History rendered as $7 \times 5$ square cells (`aspect-square` in `grid-cols-7`) with downward tooltip placement (`top-full mt-1.5`) to prevent clipping into the widget title.
  - **Step 5 (Timeline Selection & Write Today Deduplication):**
    - `handleCreateEntry` in `JournalView.jsx` checks if an entry for today (`entry_date === todayStr`) already exists before adding, opening the existing entry if found to avoid duplicate blank entries.
    - `handleSelectEntry` uses `scrollIntoView({ block: 'nearest', behavior: 'smooth' })` to prevent abrupt scroll jumping.
  - **Step 6 (Wish List & Quick Notes Split-View Layout Fix):**
    - **Quick Notes (`GridListPane.jsx`):** Header title & badge updated with `shrink-0 whitespace-nowrap`; cards grid updated from rigid viewport classes to `grid-cols-[repeat(auto-fill,minmax(160px,1fr))]` ensuring cards never shrink below 160px in split view.
    - **Wish List (`WishListView.jsx`):** Header title & badge updated with `shrink-0 whitespace-nowrap`; summary strip updated to `@min-[600px]:grid-cols-3 grid-cols-1`; active and completed cards grids updated to container queries `@min-[500px]:grid-cols-2 @min-[850px]:grid-cols-3 @min-[1150px]:grid-cols-4 grid-cols-1`, displaying 1 clean column in split-view without squeezing.
    - **NoteModal & TipTap (`NoteModal.jsx`, `TipTapEditor.jsx`):** Applied `.pane-scroller` standard with `min-h-0` flex chains and scroll containment.
  - **Verification:**
    - Verified complete production build (`npm run build`) succeeded with code 0 in 31.65s with zero errors.
- **UI Fix Phase 4 (Card Actions Fix) completed:**
  - **Root Cause Resolution (Zero Swallowing):**
    - Added `e.stopPropagation()` on every card action button, popover, and dropdown across `NoteCard.jsx`, `JournalView.jsx`, `WishListView.jsx`, `ArchiveView.jsx`, and `TrashView.jsx`, completely eliminating card-level click swallowing.
  - **Universal Card Actions (Persists on Refresh):**
    - **Change Colour:** Added 6-color interactive palette popover to Quick Notes, Journal, Wish List, and Checklists cards, updating Dexie `notes.color` and re-rendering instantly.
    - **Pin / Unpin:** Wired reactive pin toggling across all workspace cards, updating Dexie `notes.is_pinned`.
    - **Archive:** Integrated `archiveItem` with immediate removal from active list and instant visibility in `ArchiveView`.
    - **Delete (Soft Delete to Trash):** Integrated `openSoftDelete` moving items to Trash with 7-day countdown.
    - **Restore:** Enabled 1-click "Unarchive" in `ArchiveView` and "Restore" in `TrashView`.
  - **Touch Accessibility & Hit Area Standard (>=32px):**
    - Configured action toolbars with `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` so actions are always accessible on touch devices while preserving clean hover aesthetics on desktop.
    - Standardized all card action buttons to minimum 32px hit area (`w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg`).
    - Added descriptive `title` tooltips and `aria-label` attributes to every button.
  - **Global Toast Notification System with Undo:**
    - Built lightweight Zustand `toastStore.js` and accessible `ToastContainer.jsx` mounted in `App.jsx`.
    - Added instant feedback toasts on every action (e.g., "Archived '<title>'", "Moved '<title>' to Trash", "Color updated", "Pinned note") equipped with responsive interactive `Undo` buttons.
  - **Permanent Delete Confirmation:**
    - Verified permanent deletion strictly enforces typing "DELETE" in `DeleteConfirmModal.jsx` before removal.
- **UI Fix Phase 2 (Journal Panel UI Fix) completed:**
  - **Responsive Header Wrapping (Zero Overlap):**
    - Refactored `JournalView.jsx` header to use flex with `flex-wrap gap-3` and responsive media wrapping (`max-[900px]:w-full max-[900px]:justify-start`).
    - Left side contains title and Workspace badge; right side contains streak counter and "Write Today" button.
    - Below 900px, action buttons wrap cleanly onto a new row, completely eliminating element collisions across all viewports.
  - **Responsive 2-Column Grid Layout:**
    - Replaced the squished 12-column layout with `grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] xl:grid-cols-[minmax(0,1fr)_380px]`.
    - Below 1024px, collapses to 1 column so Timeline sits above Daily Prompt & Mood History.
    - Right column enforces a strict minimum width of 320px (`lg:min-w-[320px]`), ensuring ample room for prompt and heatmap widgets while giving Timeline cards maximum available width.
  - **Daily Prompt Text Wrapping:**
    - Ensured prompt card text has natural wrapping (`break-words normal-case`) within the >=320px column, removing single-word-per-line squeezing.
  - **Padded Date Chip:**
    - Standardized card internal padding (`p-5 sm:p-5.5`).
    - Positioned date chip cleanly inside the top row of the card body, eliminating any border overlap or absolute position clipping.
  - **Empty Entry Prevention & Auto-Cleanup Engine:**
    - Created `src/lib/services/journalService.js` with `isContentEmpty`, `isJournalEntryEmpty`, and `cleanupEmptyJournalEntries`.
    - Wired `handleClose` in `JournalEditor.jsx` to automatically purge entries from Dexie if the modal is closed with no title and no text content.
    - Fixed `handleCreateEntry` in `JournalView.jsx` to initialize with an empty title so placeholder displays and no dummy "Journal Entry" cards accumulate.
    - Executed one-time database cleanup: permanently purged the 3 existing empty placeholder entries from Dexie IndexedDB. Timeline now accurately renders 0 entries with clean zero-state graphic.
- **UI Fix Phase 1 (Note Editor as Centered Modal) completed:**
  - **Eliminated Split-View Squeeze Bug:**
    - Completely removed the right-side split pane (`md:relative w-[480px]/[540px]`) from the main flex container.
    - Notes list / grid behind the editor now keeps 100% of the available width at all times, with zero reflow, title wrapping, or card shrinkage ("Unt...").
    - When no item is selected, `EditorPane` safely renders `null`.
  - **Shared `<NoteModal />` Component:**
    - Built a reusable, accessible modal shell in `src/components/shared/NoteModal.jsx`.
    - **Focus Trap:** Keyboard focus is trapped within the dialog using Tab / Shift+Tab cycle, autofocuses the title/input, and restores focus to the previously active element upon closing.
    - **Body-Scroll Lock:** Prevents background page scrolling while modal is open, with automatic cleanup on close.
    - **Dim + Blur Backdrop:** Features `rgba(0,0,0,0.55)` dim overlay and `backdrop-blur-sm`.
    - **Auto-Save & Dismissal:** Closes with auto-save triggered via clicking the backdrop, pressing `Escape`, or clicking the top-left `X` button.
  - **Modal Layout & Responsive Specs:**
    - Desktop / Tablet (>=640px): Centered horizontally and vertically, width `min(720px, 92vw)`, max height `85vh`, rounded corners (`rounded-2xl`), soft shadow (`shadow-2xl`). Expandable to `min(1150px, 96vw)`.
    - Mobile (<640px): Automatically becomes full-screen (`w-full h-full max-h-screen rounded-none`).
    - Fixed header (`shrink-0`) and fixed footer/toolbar (`shrink-0`), with smooth internal vertical scrolling (`overflow-y-auto`) for the content canvas.
  - **Clean Single-Row Header (No Overlap):**
    - Left side: Close (`X`) button + "Saved" status indicator (+ workspace actions).
    - Right side: Colour dots / popover, Pin, Archive, Trash, and Expand (`Maximize2`/`Minimize2`).
    - Colour dots popover: Created responsive popover fallback in `ColorPicker.jsx` using `Palette` icon on tight screens/mobile (<640px) to guarantee a single row without horizontal overflow.
  - **Workspace Integration:**
    - Wired `<NoteModal />` into `EditorPane.jsx` for Quick Notes, Checklists, Wish List, and Projects.
    - Wired `<NoteModal />` into `JournalEditor.jsx` for the Journal workspace.
    - Integrated Routines and Sketch editing within modal presentation.
    - Preserved 100% of navigation, Dexie schema, and Zustand store state.
- **UI Fix Phase 5 (Final QA Pass) completed:**
  - **Full Audit (360px, 768px, 1280px, 1920px in Light & Dark Modes):**
    - Zero horizontal scrollbars: verified with `overflow-x: hidden`, `min-w-0`, and responsive flex-wrap bounds across all panels.
    - No clipped text or overlapping elements: all cards, titles, headers, badges, and tooltips have bounded heights, ellipsis text clamping, and dynamic padding.
    - No nested scrollbars: scroll containers constrained to main pane and drawer lists.
  - **Database Index Bug Resolution (Runtime Stability):**
    - Identified and fixed unindexed `is_archived` / `is_deleted` query runtime errors in `Sidebar.jsx`, `ArchiveView.jsx`, `TrashView.jsx`, and `trashService.js`.
    - Converted queries to safe, resilient `.filter(item => Boolean(...))` with try/catch fallbacks, completely preventing Dexie uncaught exception errors.
  - **Command Palette (Ctrl+K) Universal Search:**
    - Upgraded `CommandPalette.jsx` with full indexing across all workspaces (including Wish List, Checklists, Routines, Projects, Journal, Quick Notes, Sketch, Archive, Trash, and Settings).
    - Added quick action "Create New Wish" (`#action-new-wish`), "Create Quick Note", "Create New Sketch", and theme toggle.
    - Added deep search through structured item notes, categories, priorities, and checklist contents.
  - **Confirmation Dialogs, Trash & Archive Flow:**
    - Verified all deletes trigger `openSoftDelete` modal -> move to Trash with 7-day countdown -> logged in `activityLog` -> visible in Trash "History" timeline tab.
    - Verified permanent deletion requires typing "DELETE" in confirmation dialog before removal.
    - Verified all archives trigger `archiveItem` -> visible grouped by workspace in `ArchiveView` -> with 1-click "Unarchive" and "Move to Trash".
  - **Sketch Canvas & Fullscreen Verification:**
    - Verified canvas drawing, undo/redo (`Ctrl+Z`, `Ctrl+Y`), pan (Space), zoom (% center fit).
    - Verified `F` key fullscreen toggle (`fixed inset-0 z-50 w-screen h-screen`), `Esc` key handling (exits fullscreen first, then closes), and "← Back to sketches" button.
    - Verified automatic purge of empty, untouched sketches on close so blank entries are never persisted.
    - Verified dark canvas `#1A1D23` with default off-white pen `#ECEEF2`.
  - **Accessibility & Focus Standards:**
    - Visible high-contrast focus rings (`*:focus-visible`) across all interactive inputs and buttons using `--workspace-accent`.
    - Added `aria-label` and `title` tags on all icon buttons across Sidebar, TopBar, EditorPane, Modals, and Command Palette.
    - Contrast ratios verified >= 4.5:1 for body text (16.5:1 primary, 8.5:1 secondary) and >= 3:1 for all icons across every panel.
  - **Data Persistence & Anti-FOUC:**
    - Dexie IndexedDB retains all workspace entries across browser reloads.
    - LocalStorage theme preference persists and applies before first paint via `<head>` script in `index.html`.
    - Production build compiles cleanly with code 0 (`vite build` in 10.85s).
- **UI Fix Phase 4 (Dark Mode Redesign) completed:**
  - **Design Tokens (CSS Variables, no hard-coded colors):**
    - Backgrounds: app `#0F1115`, sidebar `#14171C`, surface/card `#1A1D23`, raised/hover `#22262E`.
    - Borders: `rgba(255,255,255,0.08)`. Dividers: `rgba(255,255,255,0.06)`.
    - Text: primary `#ECEEF2`, secondary `#A7ADBA`, muted `#7C8392`. Never pure `#FFF` on pure `#000`.
  - **Accents in Dark Mode (Lighter Tints):**
    - Amber `#FBBF24`, Indigo `#818CF8`, Rose `#FB7185`, Emerald `#34D399`, Violet `#A78BFA`, Sky `#38BDF8`, Orange `#FB923C`.
    - Active sidebar item: accent at 15% opacity background (`rgba(..., 0.15)`) + accent-colored icon.
  - **Component Pass Across All Panels:**
    - Sidebar: Updated to `#14171C`, aligned borders, and active item 15% opacity tint with accent icon.
    - Header & TopBar: Smooth 200ms transitions, clean breadcrumbs, and card-surface dropdowns.
    - Search & Command Palette: `#1A1D23` modal surface, 200ms transition, high contrast active item highlighting.
    - Quick Notes Cards: Deep desaturated card backgrounds (`--card-yellow: #2A2619`, `--card-red: #2B1D1D`, `--card-blue: #18252E`, `--card-green: #192A1D`, `--card-purple: #241C2B`).
    - Projects & Checklists: Dark surface cards with clean border tokens, progress bars, and metadata.
    - Journal: Heatmap cells colored by mood, hover tooltips styled with `#1A1D23` card surface, and streak counter.
    - Wish List: Violet-tinted surface, quick-add bar, summary strip, and modal dialogs.
    - Routines: Accent-tinted dark surfaces (`bg-sky-500/5 dark:bg-sky-950/25 dark:border-sky-800/30`).
    - Sketch Editor: Dark canvas `#1A1D23`, white-ish pen (`#ECEEF2`) as default in dark mode, off-white palette swatch, and dark thumbnail exports.
    - Modals & Dropdowns: Centralized `DeleteConfirmModal.jsx` and menus rendered on surface card `#1A1D23`.
    - TipTap Editor: Headings, blockquotes, lists, and code blocks styled with `--text-primary` and dark borders.
    - Scrollbars: Custom themed scrollbars with `--text-muted` thumb and hover highlighting.
  - **Theme Behavior & Persistence:**
    - Instant theme switching with smooth 200ms CSS transitions on all panels, containers, and interactive elements.
    - Multi-mode support for Light, Dark, and System modes with live `matchMedia` listener in `App.jsx`.
    - Interactive 3-way cycling theme toggle button in `Sidebar.jsx` with `Sun`, `Moon`, and `Monitor` icons.
    - Stored locally in `localStorage`, applied before first paint via an inline script in `<head>` of `index.html` preventing theme flash.
  - **Verification:**
    - Body text contrast >= 4.5:1 (Primary `#ECEEF2` on `#0F1115` has 16.5:1, on `#1A1D23` has 14.8:1; Secondary `#A7ADBA` has 8.5:1; Muted `#7C8392` has 4.75:1).
    - Icon contrast >= 3:1 across all panels.
    - Production build verification (`npm run build`) passed with code 0 in 8.07s.
  - **Header & Visual Identity:** Styled page header with title "Wish List", violet underline `#8B5CF6`, descriptive subtitle, and "New Wish" primary button (`bg-[#8B5CF6] text-white hover:bg-[#7C3AED]`).
  - **Comprehensive Fields & Additive Migration:** Bupmed Dexie schema to `db.version(6)` indexing `category`, `status`, `priority` on `notes`. Supports title (required), category (Buy, Learn, Watch, Place, Other), priority (Low, Medium, High), estimated price, link, notes, cover image, target date, and status (Wishing, Planned, Got it).
  - **Views (Grid & List):** Built seamless view mode toggle between Grid view (cards with cover image / gradient on top) and List view (compact rows with thumbnails, titles, metadata, and quick actions).
  - **Cards & Styling:** Implemented equal-height cards with zero overflow, 2-line title clamp, category chips with soft tints, priority dots (Red, Amber, Emerald), price displays, and cover images with preset violet gradients.
  - **Quick Add:** Added top bar single input ("Add a wish and press Enter") creating instant wishes directly in Dexie.
  - **Filters & Sorting:** Implemented multi-dimensional filtering by Category (Buy, Learn, Watch, Place, Other), Priority (High, Medium, Low), and Status (Wishing, Planned, Got it), with sorting by Newest, Priority, and Price.
  - **Summary Strip:** Built live statistics strip showing Total Wishes count, Total Estimated Cost of active wishes, and Achieved Wishes This Month.
  - **"Got it" Interaction:** Added checkmark pop animation; toggling "Got it" updates status, sets `got_it_at` timestamp, and moves item to the "Achieved & Got It" section with strike-through styling.
  - **Right Pane Editor:** Upgraded `WishlistEditor.jsx` rendered inside `EditorPane` with debounced autosave, "Saved ✓" indicator, and controls for all 8 wish fields.
  - **Empty State & Deletion:** Designed violet empty-state with sparkles illustration and friendly prompt. Wired Phase 2 confirmation dialogs (`openSoftDelete`, `openPermanentDelete`, `archiveItem`).
  - **Dark Mode & Responsive:** Validated 4.5:1 WCAG AA contrast in dark mode and responsive layout across 360px, 768px, 1280px, and 1920px viewports.

- **UI Fix Phase 2 (Delete / Archive / Trash System) completed:**
  - **Data & Additive Migration:** Bumped Dexie schema to `db.version(5)` adding `activityLog: 'id, itemId, workspace, action, timestamp'` table and additive fields `archivedAt`, `deletedAt`, `deletedFrom` on `notes`, `projects`, and `subprojects`. Created `trashService.js` handling activity logging, soft delete, restore, permanent cascade delete, archive, unarchive, and auto-purge.
  - **Confirmation Dialogs:** Implemented centralized `DeleteConfirmModal.jsx` and `confirmStore.js`. Soft delete prompts "Move '<title>' to Trash? You can restore it for 7 days." Permanent delete prompts "Permanently delete <N> items? This cannot be undone." and strictly requires typing "DELETE" into a confirmation input before enabling the button. Wired across all panels (`NoteCard`, `EditorPane`, `ProjectsView`, `SortableSubprojectItem`, `ChecklistsView`, `JournalView`, `SketchView`, `RoutinesView`, `WishListView`).
  - **Trash Page:** Created `TrashView.jsx` with workspace badges (icon + accent color), deleted date, and "X days left" dynamic countdown. Equipped with per-item "Restore" and "Delete forever", bulk selection checkboxes, "Restore selected", "Delete selected", and "Empty Trash". Wired `autoPurgeOldTrash` on app load in `App.jsx` to purge items older than 7 days.
  - **Deletion History:** Added "History" tab at top of Trash page showing a vertical timeline of `activityLog` entries with action badges, item titles, workspace tags, and timestamps.
  - **Archive Page:** Created `ArchiveView.jsx` grouping archived items by their original workspace with header counts, item previews, "Unarchive", and "Move to Trash" actions.
  - **Sidebar Badges:** Added reactive live query badges on Archive and Trash navigation items in `Sidebar.jsx` showing item counts.

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
  - **UI Polish Phase 1 (Global Color System & Layout Foundation) completed:**
    - Defined CSS variables for per-workspace accent colors in Light & Dark modes: Quick Notes (#F59E0B Amber), Projects (#6366F1 Indigo), Journal (#F43F5E Rose), Checklists (#10B981 Emerald), Wish List (#8B5CF6 Violet), Routines (#0EA5E9 Sky), Sketch (#F97316 Orange).
    - Applied accents to active sidebar items (12-15% tint background + icon color), workspace badges/titles, primary buttons (`bg-[var(--workspace-accent)] text-white`), and empty state icon badges (`bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)]`).
    - Fixed global flex/grid layout bounds: added `min-width: 0` (`min-w-0`) and `overflow-x: hidden` / `overflow: hidden` on root containers and flex children to eliminate all horizontal scrollbars.
    - Ensured internal sidebar scrolling (`overflow-y: auto`) with zero outer layout shifts.
  - **UI Polish Phase 2 (Interactive Polish & Cross-Platform Reliability) completed:**
    - Upgraded `NoteCard` selection rings to dynamic workspace accents (`ring-2 ring-[var(--workspace-accent)] shadow-card-hover`).
    - Synced `NoteCard` checklist progress bar with `var(--workspace-accent)`.
    - Enhanced `TagPill` active state with workspace-accent background and border tint.
    - Upgraded `TopBar` active sort selection with workspace-accent highlight.
    - Universalized environment-safe UUID generation with `generateUUID()` fallback across all components, editors, and services (`ProjectsView`, `GridListPane`, `EditorPane`, `TodayDashboard`, `CommandPalette`, `ChecklistsView`, `ChecklistEditor`, `RoutinesView`, `RoutinesEditor`, `WishListView`, `Sidebar`, `JournalView`, `sketchService`).
    - Updated `taskbreakdown.md` checking off Phase 1, 2, 3, 4 deliverables.
    - Verified clean production build with Vite (0 errors).
  - **UI Polish Phase 3 (Journal Panel Redesign) completed:**
    - **Layout:** Rebuilt layout into a responsive 2-column grid (`grid-cols-1 lg:grid-cols-12`) that stacks cleanly on small viewports with zero horizontal scrolling.
    - **Header:** Placed "Journal" title on one line with streak counter and "Write Today" action button strictly aligned right on the same row.
    - **Empty State:** Designed an aesthetic zero-state with a floating BookOpen badge, encouraging message, and large "Write your first entry" button.
    - **Entry Cards:** Built custom journal entry cards featuring formatted Date chips (Today/Yesterday/Date), mood emoji badges (Calm 😌, Restless 🏃, Grateful 🙏, Tired 😴), title, 2-line preview, tag pills, and action menus.
    - **Mood History Heatmap:** Implemented a real GitHub-style 35-day commit-like heatmap with days colored by mood (Calm blue, Restless amber, Grateful green, Tired purple, and today ring outline) equipped with interactive hover tooltips displaying date, mood, emoji, and entry title.
    - **Daily Prompt Card:** Added an interactive Daily Prompt card featuring 30 rotating reflections, an animated Shuffle button, and a "Use this prompt" action button.
  - **UI Fix Phase 1 (Bug Fixes + Sketch Fullscreen) completed:**
    - **Sketch Layout:** Constrained list pane with `min-w-[320px]`, converted header to `flex flex-wrap items-start justify-between gap-3`, capped description at `max-w-prose`, updated sketch cards to `grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4`, set title to single-line ellipsis and date to single-line `truncate whitespace-nowrap`, and removed nested scrollbars.
    - **Sketch Fullscreen + Navigation:** Added Fullscreen toggle button (`Maximize2` / `Minimize2`) in toolbar, bound `F` keyboard shortcut (safely disabled inside text inputs), expanded editor in fullscreen to `fixed inset-0 z-50 w-screen h-screen` via `EditorPane`, configured `Esc` key to exit fullscreen first before closing editor, added "← Back to sketches" button with left arrow icon, autosaved canvas strokes and metadata prior to close, and purged empty/blank sketches on close so blank entries are never saved.
    - **Routines:** Fixed "Routines & Habits" title positioning under sticky top bar with proper container padding, formatted streak text with `whitespace-nowrap shrink-0`, and converted all routine card backgrounds to soft tints of sky accent (`bg-sky-500/5 hover:bg-sky-500/10 border-sky-500/20 dark:bg-sky-950/25 dark:border-sky-800/30`).
    - **Journal:** Styled heatmap cells according to mood (Calm blue, Restless amber, Grateful green, Tired purple), added rose ring around Today (`ring-2 ring-rose-500 ring-offset-1`), reoriented tooltips downward (`top-full mt-1.5`) so they never occlude section titles, and removed nested scrollbars from the right-hand column.
    - **Projects:** Set project card grid to `items-stretch` and cards to `flex flex-col justify-between h-full` for equal row height, clamped titles to 2 lines (`line-clamp-2`) with fallback "Untitled project", hid "No description provided." placeholder entirely when description is empty, and anchored the completion progress bar to the bottom (`mt-auto pt-3 border-t`).
    - **Checklists:** Implemented auto-removal for empty, untitled checklist items on blur, and added unmount cleanup in `ChecklistEditor` to automatically discard empty items when navigating away.
    - **Quick Notes:** Added `break-words` and `overflow-hidden` across note card roots, titles, and preview bodies in `NoteCard.jsx` to prevent overflow and text blowout.

## ⏭️ Next Up
- **Stage 6: Deploy & Ship** — Final build generation, hosting configuration, environment variable lock down, and production handoff.

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
- [x] **Stage 3.5 (Sketch Workspace) completed:**
  - Upgraded Dexie schema to `db.version(4)` indexing `attachments` table with `id`, `note_id`, `type`, `title`, and `created_at` (storing `image_data`, `description`, `strokes`).
  - Built Grid pane (`SketchView.jsx`) displaying sketch cards with dynamic Base64 thumbnails, title, "Created on [date]", "+ New Sketch" flow, and an empty state.
  - Built Editor pane (`SketchEditor.jsx`) with HTML5 infinite canvas supporting pan, zoom via `Ctrl + scroll wheel`, Spacebar pan, and touch gestures (pinch-zoom).
  - Implemented locked pastel palette (Charcoal, Terracotta, Sage, Dusty Blue, Mustard, Lavender) with fine/medium/broad stroke widths, eraser mode, and clear canvas confirmation modal.
  - Added "Title" field above canvas, "Description" field below canvas, and instant Base64 persistence to Dexie `attachments` and `notes`.
  - Built Cross-Workspace "Save to Note" modal (`AttachToNoteModal.jsx`) allowing instant sketch linking to any Quick Note, Journal entry, or Project note.
- [x] **Pre-Sketch Polish & Upgrade — Phase 1: Global UX & Micro-Interactions (COMPLETED):**
  - **Command Palette (`Ctrl/Cmd + K`):** Built centered modal (`CommandPalette.jsx`) with quick workspace jumping, instant Quick Note creation, instant new sketch action, dark/light mode toggle, and live note searching across all workspaces. Added keyboard navigation (`↑`, `↓`, `Enter`, `Esc`) and `⌘K` trigger badge in Sidebar search bar.
  - **Micro-Interactions:**
    - Cards across all workspaces (`NoteCard`, `ProjectsView`, `SketchView`, `ChecklistsView`, `WishListView`, `RoutinesView`, and `SortableSubprojectItem`) upgraded with soft shadow and `1.02x` scale-up on hover (`hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-black/40 transition-all duration-200 ease-out`).
    - Editor pane upgraded to a smooth 150ms ease-out slide-in animation (`transition-all duration-150 ease-out`).
    - Buttons globally styled with a soft, quick fade on hover (`transition: color 150ms ease-out, background-color 150ms ease-out, opacity 150ms ease-out, box-shadow 150ms ease-out`).
  - **Dark Mode Polish:** Added `--card-purple: #2E2538;` and neutral `--active-nav-bg: #282828;` to `.dark` palette; updated `ColorPicker.jsx` and `NoteCard.jsx` with full Soft Organic muted pastel tokens; ensured high contrast text readability across all workspace cards.
- [x] **Pre-Sketch Polish & Upgrade — Phase 2: Dynamic Data & Smart Defaults (COMPLETED):**
  - **Projects Progress Bar:** Replaced hardcoded progress with dynamic calculation from Dexie based on completed notes vs. total notes across all subprojects.
  - **Journal Streak:** Implemented real consecutive-day calculation counting consecutive days written from local Dexie entries.
  - **Today Dashboard:** Replaced mock static placeholders with live Dexie queries for tasks due today (with complete toggle), routines to complete (with one-click check), and recently updated notes.
  - **Wish List "Total Cost" & Indicator:** Added thin visual progress bar for "Bought vs. Wanted" with item counts and total cost calculation.
  - **Routines Calendar Tooltips:** Added sleek hover tooltips to calendar days showing habit notes or "Completed ✓" feedback.
  - **Checklists Upgrades:** Added collapsible section headers with chevron indicators and hidden items count badges, alongside intuitive tactile drag handles (`GripVertical`) on all checklist items.
- [x] **Pre-Sketch Polish & Upgrade — Phase 3: Sketch Workspace with Upgraded Polish (COMPLETED):**
  - Built Grid pane (`SketchView.jsx`) displaying sketch cards with dynamic Base64 thumbnails, title, "Created on [date]", "+ New Sketch" flow, and an empty state.
  - Built Editor pane (`SketchEditor.jsx`) with HTML5 infinite canvas supporting pan, zoom via `Ctrl + scroll wheel`, Spacebar pan, and touch gestures (pinch-zoom).
  - Implemented locked pastel palette (Charcoal, Terracotta, Sage, Dusty Blue, Mustard, Lavender) with fine/medium/broad stroke widths, eraser mode, and clear canvas confirmation modal.
  - Added "Title" field above canvas, "Description" field below canvas, and instant Base64 persistence to Dexie `attachments` and `notes`.
  - Built Cross-Workspace "Save to Note" modal (`AttachToNoteModal.jsx`) allowing instant sketch linking to any Quick Note, Journal entry, or Project note.
- [x] **Journal Panel Bug Fix Phase (COMPLETED):**
  - **Fixed Journal Header Overlap:** Restructured header into `flex justify-between items-center w-full mb-6` with "Journal" title on the left and grouped streak badge + "Write Today" button on the right with `gap-3`. Added `whitespace-nowrap` and `shrink-0` to eliminate wrapping and element collisions across viewports.
  - **Corrected Mood History Heatmap Colors:** Replaced heatmap colors with the exact requested palette: Calm = Soft Blue (`#3B82F6`), Restless = Soft Amber (`#F59E0B`), Grateful = Soft Green (`#10B981`), Tired = Soft Purple (`#8B5CF6`), Empty days = Dark neutral (`#22262E`), Today = Rose ring (`#F43F5E`). Ensured 6x5 grid cells are strictly square (`aspect-square`) with proper internal padding so they never touch card edges.
  - **Dark Mode Contrast Polish:** Enforced the dark surface token (`#1A1D23`) on Journal cards, containers, and empty states. Maintained Rose accent (`#FB7185` / `#F43F5E`) at 15% opacity with rose icon for the active sidebar state. Enforced sharp text contrast with `#ECEEF2` (primary) and `#A7ADBA` (secondary).
  - [x] **UI Polish Phase 4 (Final Polish & Micro-Interactions) completed:**
    - **Micro-Interactions & Transitions:** Enforced 150-200ms ease-out transitions for hover, focus, and active states globally across all buttons, inputs, selects, sidebar items, and cards (`hover:scale-[1.02] hover:shadow-lg active:scale-98`).
    - **Typography Hierarchy:** Standardized page headers to 28-32px font-bold tracking-tight (`text-[28px] sm:text-[32px] font-bold tracking-tight text-text-primary capitalize leading-tight`), section labels to 12px uppercase (`text-xs font-semibold text-text-muted uppercase tracking-wider`), and body text to 14-15px.
    - **Skeleton Loaders:** Created reusable `SkeletonLoader.jsx` with `GridSkeleton`, `TimelineSkeleton`, `WidgetSkeleton`, and `CardSkeleton` components. Integrated them across all panels (`GridListPane`, `ProjectsView`, `JournalView`, `ChecklistsView`, `WishListView`, `RoutinesView`, `SketchView`, `TodayDashboard`) displaying seamless skeleton animations while Dexie live queries resolve.
    - **Command Palette (`Ctrl+K`):** Polished Command Palette modal to be cleanly centered with backdrop blur, role dialog, aria-modal, keyboard shortcuts, and full a11y support.
    - **Dark Mode Verification:** Confirmed rich contrast across all panels using dark tokens (`#121212` background, `#1E1E1E` / `#1A1D23` surfaces, `#FFFFFF` / `#ECEEF2` text, `#B0B0B0` muted text), ensuring comfortable compliance above the 4.5:1 WCAG AA threshold.
    - **Accessibility (a11y):** Added universal visible focus rings (`*:focus-visible { outline: 2px solid var(--workspace-accent) !important; outline-offset: 2px !important; }`), explicit `aria-label`s on icon-only buttons (`TopBar`, `Sidebar`, `NoteCard`, views), and WCAG AA contrast.
    - **App Running Live:** Production build verified passing with 0 errors (`npm run build`) and Vite dev server launched and running live on `http://localhost:3000/`.

## ⏭️ Next Up
- **Stage 6: Deploy & Ship** — Final build generation, hosting configuration, environment variable lock down, and production handoff.
- **Stage 4: Cloud Sync & AI** — Supabase Cloud Sync and AI power-up workflows.
- **Stage 6: Deploy & Ship** — Final build generation, hosting configuration, environment variable lock down, and production handoff.

## ⚠️ Known Issues / Tech Debt
- None. Production build verified clean with Vite.

## 🧭 Decisions Log
| Date | Date | Decision | Reason |
| 2026-10-10 | 2026-10-10 | UI Fix Phase 4 — Card Actions Fix | Added e.stopPropagation() across NoteCard, JournalView, WishListView, ArchiveView, TrashView; enabled color change, pin/unpin, archive, soft delete, and restore across all cards with Dexie persistence; added >=32px touch hit area & hover visibility; created global toastStore & ToastContainer with Undo support; enforced typed DELETE confirmation for permanent deletes. |
| 2026-10-10 | 2026-10-10 | UI Fix Phase 2 — Journal Panel UI Fix | Refactored Journal header to flex-wrap with 900px breakpoint wrapping; replaced squeezed 12-col grid with 2-column desktop layout keeping right column min-w 320px and 1-column below 1024px; formatted prompt text with break-words normal-case; placed date chip inside card with internal padding (never over border); built empty entry auto-deletion on modal close and prepared cleanup service. |
| 2026-10-10 | 2026-10-10 | UI Fix Phase 1 — Note Editor as Centered Modal | Eliminated right-side split pane completely; created shared NoteModal with focus trap, body-scroll lock, dim+blur backdrop (rgba(0,0,0,0.55)), auto-save on close (Esc, backdrop click, X), single-row header with responsive color picker popover, centered min(720px, 92vw) width, max 85vh height, and mobile (<640px) full-screen; notes grid maintains full width with zero reflow. |
| 2026-10-09 | 2026-10-09 | UI Fix Phase 3 — Wish List Page | Built Wish List experience: Violet #8B5CF6 theme with underline; 8 comprehensive fields with Dexie v6 additive migration; Grid & List view toggle; equal-height cards with gradient placeholders; quick-add bar; multi-dimensional filters & sorting; live summary strip (wishes, cost, achieved this month); animated "Got it" completion flow; right-pane WishlistEditor with autosave; Phase 2 confirmation dialogs; WCAG AA dark mode & responsive down to 360px. |
| 2026-10-09 | 2026-10-09 | UI Fix Phase 2 — Delete / Archive / Trash System | Additive Dexie v5 migration with activityLog table and archivedAt/deletedAt/deletedFrom fields; centralized DeleteConfirmModal with soft delete ("7 days") and permanent delete (typed "DELETE" confirmation); rebuilt dedicated TrashView with bulk actions, countdown & History timeline; rebuilt ArchiveView grouped by workspace; added count badges to Sidebar. |
| 2026-10-09 | 2026-10-09 | UI Fix Phase 1 — Bug Fixes + Sketch Fullscreen | Resolved 7 UI issues: Sketch min-w/header wrap/prose/auto-fill grid & fullscreen toggle with F/Esc shortcuts and back button; Routines sticky title padding & sky tint cards; Journal mood heatmap colors & tooltip collision fix; Projects equal-height cards & 2-line title clamp; Checklists auto-removal of empty untitled items; Quick Notes break-words & overflow-hidden. |
| 2026-10-09 | 2026-10-09 | UI Polish Phase 4 — Final Polish & Micro-Interactions | Enforced universal 150-200ms transitions, 28-32px page headers, 12px uppercase section labels, responsive skeleton loaders across all panels, centered accessible Command Palette modal, WCAG AA compliant contrast in Dark Mode, and visible focus rings. |
| 2026-10-09 | 2026-10-09 | Fixed Journal Header Overlap & Heatmap Palette | Restructured header to `flex justify-between items-center w-full mb-6` with `gap-3` button grouping; updated heatmap to accurate mood tokens (#3B82F6, #F59E0B, #10B981, #8B5CF6, #22262E, #F43F5E) with #1A1D23 surface contrast. |
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
