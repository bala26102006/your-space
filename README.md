# Your Space — Anti-Clutter Creative Workspace

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://bala26102006.github.io/your-space/)
[![Source Code](https://img.shields.io/badge/Source%20Code-GitHub-blue?style=for-the-badge&logo=github)](https://github.com/bala26102006/your-space)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Dexie.js](https://img.shields.io/badge/IndexedDB-Dexie%20v7-FFA000?style=for-the-badge)](https://dexie.org/)

> **Your Space** is a local-first, anti-clutter personal command center and creative suite. It unifies quick notes, long-form creative projects, habits, daily sanctuary journaling, wall calendars, visual sketchpads, and smart checklists into a calm, focused environment.

---

## 🔗 Quick Links

* 🌐 **Live Web Application**: [https://bala26102006.github.io/your-space/](https://bala26102006.github.io/your-space/)
* 📦 **GitHub Source Repository**: [https://github.com/bala26102006/your-space](https://github.com/bala26102006/your-space)
* 💻 **Local Development Server**: `http://localhost:3000/`

---

## ✨ Features & Workspaces

### 1. 🌅 Today Hub (Command Center)
* **Daily Briefing**: Morning/Afternoon/Evening dynamic greeting with live date and calendar sync.
* **Quick Habits Ticker**: Check off daily routines with a single tap directly from the dashboard.
* **Tasks Due Today**: Focus strip aggregating checklist items and events due on the current day.
* **Warm Reflection Deck**: Daily journaling prompts for mindfulness and gratitude.
* **Clickable Streak Counters**: Live streak badges for Routines and Journal that jump directly to their respective views.

### 2. 📅 Wall Calendar ("Life Lens")
* **Calm Month Grid**: 7-column responsive wall calendar view with color-coded event dots.
* **Relative Countdown Strip**: Visual countdown chips ("in 3 days", "tomorrow") for high-priority milestones.
* **Overdue Triage**: One-click batch rescheduling spreading overdue tasks over a 14-day window.
* **Day Detail Sheet**: Slide-in panel displaying hourly breakdowns, attached notes, and quick action buttons.

### 3. 📝 Quick Notes
* **Frictionless Capture**: Instant memo creation with 5 warm paper tint themes.
* **Tag Taxonomy**: Create and assign custom colored tags for instant categorization.
* **Desk Pinning & Reordering**: Pin high-priority thoughts to the top of your deck.
* **Instant Offline Search**: Instantaneous search across note titles and body content.

### 4. 📚 3-Tier Creative Projects
* **Novel & Screenplay Hierarchy**: Structured `Project → Subproject / Chapter → Scene / Note` workflow.
* **TipTap Rich Text Editor**: Distraction-free writing with headings, blockquotes, bullet lists, bold, italics, and code blocks.
* **Drag-and-Drop Reordering**: Rearrange chapters and scenes with `@dnd-kit`.
* **Focus Mode**: One-click distraction-free writing collapsing all navigation bars.

### 5. 🕯️ Warm Sanctuary Journal
* **Editorial Typography**: Styled with Google Font Lora serif and warm sepia tones.
* **35-Day Mood Heatmap**: Visual emotional tracker recording daily mood tags.
* **Candle Streak Engine**: Non-punitive streak tracking celebrating consistent reflection.
* **Prompt Decks**: Curated thought-starters for self-reflection and creative contemplation.

### 6. ✅ Smart Checklists
* **Natural Language Due Dates**: Quick typing recognizes dates and times automatically.
* **Fast-Capture Keyboard Engine**: Intuitive `Enter` (new item), `Backspace` (delete empty item), and `Tab` (indent hierarchy).
* **Circular Progress Rings**: Live task completion percentage rings with sound and celebration confetti.
* **Starter Blueprints**: Pre-built templates for Travel, Work Sprints, Groceries, and Routines.

### 7. 🎁 Wish List Tracker
* **Equal-Height Product Cards**: Visual wishlist displaying item previews, estimated prices, and categories.
* **One-Click Source Link**: Direct `<ExternalLink />` launcher opening original vendor or product pages in a new tab.
* **Budget Tracking**: Live summary tallying total estimated budget across all wishlist folders.
* **"Got It" Celebration**: Mark items as purchased with date stamps and celebratory feedback.

### 8. ⚡ Material 3 Routines
* **Google M3 Card Design**: Clean tonal cards with 8 distinct accent palettes.
* **7-Day Visual Completion Strip**: Daily check-in pills with immediate tactile feedback.
* **Freeze Protection**: Built-in streak protection ensuring life interruptions don't break your momentum.
* **Time-of-Day Grouping**: Segment habits into Morning, Afternoon, Evening, or Anytime blocks.

### 9. 🎨 Sketch Studio
* **55x Fast Derived Cache DB**: Custom IndexedDB cache delivering sub-30ms canvas rendering.
* **8 Doodle Brushes**: Pen, highlighter, pencil, spray, calligraphy, and chalk effects.
* **Symmetry & Precision Guides**: Radial, horizontal, and vertical mirror drawing.
* **Photo Inking**: Import photos from phone gallery or camera and draw directly over them.
* **Timelapse Replay Video**: Export drawing session history as a fluid timelapse animation.

### 10. 🗄️ Unified Archive & Auto-Purge Trash
* **Central Archive**: Store completed notes and projects cleanly out of sight.
* **7-Day Soft-Delete Protection**: Deleted notes enter Trash with a 7-day safety grace period.
* **Audit History Log**: Detailed log tracking deletion, recovery, and purge activities.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [React 18.3](https://react.dev/) + [Vite 6.4](https://vitejs.dev/) |
| **Styling & Icons** | [Tailwind CSS 3.4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/) |
| **Client Database** | [Dexie.js v4](https://dexie.org/) (Browser IndexedDB Version 7 Schema) |
| **Rich Text Editor** | [TipTap Rich Text](https://tiptap.dev/) |
| **Drag & Drop** | [@dnd-kit](https://dndkit.com/) |
| **Export Engines** | [jsPDF](https://github.com/parallax/jsPDF) & [docx](https://docx.js.org/) |
| **Cloud Synchronization** | [Supabase](https://supabase.com/) (Optional cross-device sync) |
| **AI Power-ups** | [Google Gemini API](https://ai.google.dev/) (Optional summarization & organization) |

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18.0 or newer)
* `npm` (version 9.0 or newer)

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/bala26102006/your-space.git

# 2. Enter project directory
cd "your space"

# 3. Install dependencies
npm install

# 4. Start local development server
npm run dev
```

Visit `http://localhost:3000/` in your browser.

---

## ⚙️ Environment Configuration (Optional)

The application is **100% offline-first** and functions completely without any cloud credentials. If you wish to enable cloud synchronization with Supabase or AI features with Gemini:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your credentials:
   ```env
   # Supabase Cloud Sync
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key

   # Google Gemini AI
   VITE_GEMINI_API_KEY=your-gemini-api-key
   VITE_AI_MODEL=gemini-1.5-flash
   ```

---

## 📦 Build & Deploy

### Building for Production
```bash
npm run build
```
The compiled output is saved to the `dist/` directory, ready to be hosted on any static hosting provider (GitHub Pages, Vercel, Netlify, Cloudflare Pages).

### Running ESLint
```bash
npm run lint
```

---

## 📄 License

This project is licensed under the MIT License — see the repository for details.
