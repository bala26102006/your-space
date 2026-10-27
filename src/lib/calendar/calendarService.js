/**
 * calendarService.js
 * 
 * Aggregates, normalizes, and filters data across all app sources for the "Life Lens" Calendar.
 * Purely additive, read-only adapters over Dexie tables.
 * Employs visible-range indexed queries with neighbor prefetching.
 */

import { db } from '../db';
import { getTodayStr, parseLocalDate, formatLocalDate } from './calendarUtils';
import { isScheduledOn, isEntryComplete, resolveTonalPalette } from '../routines/routineUtils';
import { getMoodConfig } from '../journal/journalUtils';
import { generateUUID } from '../uuid';
import { useToastStore } from '../../store/toastStore';

// Layer definitions matching each panel's static tokens and icons
export const CALENDAR_LAYERS = {
  checklists: {
    id: 'checklists',
    label: 'Tasks',
    icon: 'CheckSquare',
    colorToken: 'var(--panel-checklists-accent)',
    bgToken: 'var(--panel-checklists-accent-soft)',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
    workspace: 'checklists',
  },
  routines: {
    id: 'routines',
    label: 'Routines',
    icon: 'Repeat',
    colorToken: 'var(--panel-routines-accent)',
    bgToken: 'var(--panel-routines-accent-soft)',
    textColor: 'text-sky-700 dark:text-sky-400',
    dotClass: 'bg-sky-500',
    workspace: 'routines',
  },
  journal: {
    id: 'journal',
    label: 'Journal',
    icon: 'BookOpen',
    colorToken: 'var(--panel-journal-accent)',
    bgToken: 'var(--panel-journal-accent-soft)',
    textColor: 'text-amber-800 dark:text-amber-300',
    dotClass: 'bg-amber-600',
    workspace: 'journal',
  },
  wishlist: {
    id: 'wishlist',
    label: 'Wish List',
    icon: 'Sparkles',
    colorToken: 'var(--panel-wishlist-accent)',
    bgToken: 'var(--panel-wishlist-accent-soft)',
    textColor: 'text-violet-700 dark:text-violet-400',
    dotClass: 'bg-violet-500',
    workspace: 'wishlist',
  },
  sketch: {
    id: 'sketch',
    label: 'Sketches',
    icon: 'Palette',
    colorToken: 'var(--panel-sketch-accent)',
    bgToken: 'var(--panel-sketch-accent-soft)',
    textColor: 'text-orange-700 dark:text-orange-400',
    dotClass: 'bg-orange-500',
    workspace: 'sketch',
  },
  quicknotes: {
    id: 'quicknotes',
    label: 'Notes',
    icon: 'StickyNote',
    colorToken: 'var(--panel-notes-accent)',
    bgToken: 'var(--panel-notes-accent-soft)',
    textColor: 'text-amber-700 dark:text-amber-400',
    dotClass: 'bg-amber-500',
    workspace: 'quicknotes',
  },
  events: {
    id: 'events',
    label: 'Events',
    icon: 'Calendar',
    colorToken: 'var(--panel-calendar-accent)',
    bgToken: 'var(--panel-calendar-accent-soft)',
    textColor: 'text-teal-700 dark:text-teal-300',
    dotClass: 'bg-teal-600',
    workspace: 'calendar',
  },
};

const LAYER_PREF_KEY = 'calendar_active_layers';

/**
 * Returns user layer toggle state (all true by default).
 */
export function getLayerFilterPreferences() {
  try {
    const saved = localStorage.getItem(LAYER_PREF_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        checklists: parsed.checklists !== false,
        wishlist: parsed.wishlist !== false,
        events: parsed.events !== false,
        journal: parsed.journal !== false,
        routines: Boolean(parsed.routines),
        sketch: Boolean(parsed.sketch),
        quicknotes: Boolean(parsed.quicknotes),
      };
    }
  } catch (e) {}
  return {
    checklists: true,
    wishlist: true,
    events: true,
    journal: true,
    routines: false,
    sketch: false,
    quicknotes: false,
  };
}

/**
 * Persists user layer toggle state.
 */
export function setLayerFilterPreferences(prefs) {
  try {
    localStorage.setItem(LAYER_PREF_KEY, JSON.stringify(prefs));
  } catch (e) {}
}

/**
 * Fetches and normalizes all items across visible date range.
 * startDate and endDate are local 'YYYY-MM-DD' strings.
 */
export async function getCalendarItemsForRange(startDate, endDate) {
  const todayStr = getTodayStr();

  // 1. Fetch parent notes map once to filter out archived/deleted and resolve parent contexts
  const allNotes = await db.notes.toArray().catch(() => []);
  const activeNoteMap = new Map();
  allNotes.forEach(n => {
    if (!n.is_archived && !n.is_deleted) {
      activeNoteMap.set(n.id, n);
    }
  });

  const items = [];

  // -------------------------------------------------------------
  // SOURCE 1: CHECKLIST TASKS (due_date in range)
  // -------------------------------------------------------------
  try {
    const rawItems = await db.checklist_items
      .where('due_date')
      .between(startDate, endDate, true, true)
      .toArray()
      .catch(() => []);

    rawItems.forEach(item => {
      // Exclude items from deleted/archived lists
      const parentNote = activeNoteMap.get(item.note_id);
      if (!parentNote) return;

      // Exclude non-tasks (e.g. headers or text notes)
      if (item.item_type && item.item_type !== 'task') return;

      const isDone = item.is_completed === 1 || item.is_completed === true;
      const isOverdue = !isDone && item.due_date < todayStr;
      const status = isDone ? 'done' : (isOverdue ? 'overdue' : 'open');

      items.push({
        key: `task_${item.id}`,
        id: item.id,
        source: 'checklists',
        type: 'task',
        date: item.due_date,
        title: item.text || 'Untitled Task',
        subtitle: parentNote.title || 'Checklist',
        status,
        colorToken: CALENDAR_LAYERS.checklists.colorToken,
        bgToken: CALENDAR_LAYERS.checklists.bgToken,
        dotClass: CALENDAR_LAYERS.checklists.dotClass,
        payload: {
          noteId: item.note_id,
          itemId: item.id,
          workspace: 'checklists',
        },
      });
    });

    // Also include list-level due dates if defined on note.content.dueDate
    allNotes.forEach(n => {
      if (n.workspace_id === 'checklists' && !n.is_archived && !n.is_deleted && n.content?.dueDate) {
        const d = n.content.dueDate;
        if (d >= startDate && d <= endDate) {
          items.push({
            key: `checklist_list_${n.id}`,
            id: n.id,
            source: 'checklists',
            type: 'list_due',
            date: d,
            title: `List: ${n.title || 'Checklist'}`,
            subtitle: 'Target List Deadline',
            status: d < todayStr ? 'overdue' : 'open',
            colorToken: CALENDAR_LAYERS.checklists.colorToken,
            bgToken: CALENDAR_LAYERS.checklists.bgToken,
            dotClass: CALENDAR_LAYERS.checklists.dotClass,
            payload: {
              noteId: n.id,
              workspace: 'checklists',
            },
          });
        }
      }
    });
  } catch (err) {
    console.error('Error fetching checklist items for calendar:', err);
  }

  // -------------------------------------------------------------
  // SOURCE 2: ROUTINES (Past completion traces + Future planned)
  // -------------------------------------------------------------
  try {
    const routineNotes = allNotes.filter(
      n => n.workspace_id === 'routines' && !n.is_archived && !n.is_deleted && !n.content?.isPaused
    );

    const routineEntries = await db.routine_entries
      .where('entry_date')
      .between(startDate, endDate, true, true)
      .toArray()
      .catch(() => []);

    // Create entry lookup map: note_id + entry_date -> entry
    const entryLookup = new Map();
    routineEntries.forEach(e => {
      entryLookup.set(`${e.note_id}_${e.entry_date}`, e);
    });

    // Walk every day in visible range
    const startObj = parseLocalDate(startDate);
    const endObj = parseLocalDate(endDate);
    const cur = new Date(startObj);

    while (cur <= endObj) {
      const curStr = formatLocalDate(cur);
      const isPast = curStr < todayStr;
      const isToday = curStr === todayStr;

      routineNotes.forEach(routine => {
        const scheduled = isScheduledOn(routine, curStr);
        if (!scheduled) return;

        const entry = entryLookup.get(`${routine.id}_${curStr}`);
        const isComplete = isEntryComplete(entry, routine);
        const isFreeze = Boolean(entry?.is_freeze);

        let status = 'open';
        if (isComplete) {
          status = 'done';
        } else if (isFreeze) {
          status = 'info';
        } else if (isPast) {
          status = 'missed';
        } else {
          status = 'open'; // planned future or open today
        }

        const tonal = resolveTonalPalette(routine);

        items.push({
          key: `routine_${routine.id}_${curStr}`,
          id: routine.id,
          source: 'routines',
          type: 'routine',
          date: curStr,
          title: routine.title || 'Daily Routine',
          subtitle: routine.content?.scheduleType || 'Routine',
          status,
          colorToken: tonal.accent || CALENDAR_LAYERS.routines.colorToken,
          bgToken: tonal.container || CALENDAR_LAYERS.routines.bgToken,
          dotClass: isComplete ? 'bg-emerald-500' : (status === 'missed' ? 'bg-red-400' : 'bg-sky-500'),
          payload: {
            noteId: routine.id,
            entryDate: curStr,
            workspace: 'routines',
          },
        });
      });

      cur.setDate(cur.getDate() + 1);
    }
  } catch (err) {
    console.error('Error fetching routines for calendar:', err);
  }

  // -------------------------------------------------------------
  // SOURCE 3: JOURNAL (Mood dots & traces)
  // -------------------------------------------------------------
  try {
    const journalEntries = allNotes.filter(
      n => n.workspace_id === 'journal' && !n.is_archived && !n.is_deleted
    );

    journalEntries.forEach(entry => {
      const date = entry.entry_date || (entry.created_at ? entry.created_at.slice(0, 10) : '');
      if (date >= startDate && date <= endDate) {
        const moodCfg = getMoodConfig(entry.mood || entry.content?.mood);
        items.push({
          key: `journal_${entry.id}`,
          id: entry.id,
          source: 'journal',
          type: 'journal',
          date,
          title: entry.title || `Journal (${moodCfg.label})`,
          subtitle: moodCfg.label ? `${moodCfg.emoji} ${moodCfg.label}` : 'Daily Entry',
          status: 'done',
          colorToken: moodCfg.dotColor || CALENDAR_LAYERS.journal.colorToken,
          bgToken: CALENDAR_LAYERS.journal.bgToken,
          dotClass: 'bg-amber-600',
          moodEmoji: moodCfg.emoji,
          payload: {
            noteId: entry.id,
            workspace: 'journal',
          },
        });
      }
    });
  } catch (err) {
    console.error('Error fetching journal for calendar:', err);
  }

  // -------------------------------------------------------------
  // SOURCE 4: WISH LIST (Target dates)
  // -------------------------------------------------------------
  try {
    const wishes = allNotes.filter(
      w => w.workspace_id === 'wishlist' && !w.is_archived && !w.is_deleted && w.status !== 'got_it'
    );

    wishes.forEach(wish => {
      const targetDate = wish.target_date || wish.content?.targetDate || wish.content?.target_date || '';
      if (targetDate >= startDate && targetDate <= endDate) {
        const isOverdue = targetDate < todayStr;
        items.push({
          key: `wish_${wish.id}`,
          id: wish.id,
          source: 'wishlist',
          type: 'wish',
          date: targetDate,
          title: wish.title || 'Untitled Wish',
          subtitle: wish.category ? `Wish (${wish.category})` : 'Target Wish',
          status: isOverdue ? 'overdue' : 'open',
          colorToken: CALENDAR_LAYERS.wishlist.colorToken,
          bgToken: CALENDAR_LAYERS.wishlist.bgToken,
          dotClass: CALENDAR_LAYERS.wishlist.dotClass,
          payload: {
            noteId: wish.id,
            workspace: 'wishlist',
          },
        });
      }
    });
  } catch (err) {
    console.error('Error fetching wishlist for calendar:', err);
  }

  // -------------------------------------------------------------
  // SOURCE 5: SKETCHES (Creation dots)
  // -------------------------------------------------------------
  try {
    const sketches = allNotes.filter(
      s => s.workspace_id === 'sketch' && !s.is_archived && !s.is_deleted
    );

    sketches.forEach(sketch => {
      const date = sketch.created_at ? sketch.created_at.slice(0, 10) : '';
      if (date >= startDate && date <= endDate) {
        items.push({
          key: `sketch_${sketch.id}`,
          id: sketch.id,
          source: 'sketch',
          type: 'sketch',
          date,
          title: sketch.title || 'Sketch Artwork',
          subtitle: sketch.content?.mode === 'doodle' ? 'Doodle' : 'Sketch',
          status: 'info',
          colorToken: CALENDAR_LAYERS.sketch.colorToken,
          bgToken: CALENDAR_LAYERS.sketch.bgToken,
          dotClass: CALENDAR_LAYERS.sketch.dotClass,
          payload: {
            noteId: sketch.id,
            workspace: 'sketch',
          },
        });
      }
    });
  } catch (err) {
    console.error('Error fetching sketches for calendar:', err);
  }

  // -------------------------------------------------------------
  // SOURCE 6: QUICK NOTES (Creation dots)
  // -------------------------------------------------------------
  try {
    const notes = allNotes.filter(
      n => n.workspace_id === 'quicknotes' && !n.is_archived && !n.is_deleted
    );

    notes.forEach(note => {
      const date = note.created_at ? note.created_at.slice(0, 10) : '';
      if (date >= startDate && date <= endDate) {
        items.push({
          key: `note_${note.id}`,
          id: note.id,
          source: 'quicknotes',
          type: 'note',
          date,
          title: note.title || 'Quick Note',
          subtitle: 'Note created',
          status: 'info',
          colorToken: CALENDAR_LAYERS.quicknotes.colorToken,
          bgToken: CALENDAR_LAYERS.quicknotes.bgToken,
          dotClass: CALENDAR_LAYERS.quicknotes.dotClass,
          payload: {
            noteId: note.id,
            workspace: 'quicknotes',
          },
        });
      }
    });
  } catch (err) {
    console.error('Error fetching quick notes for calendar:', err);
  }

  // -------------------------------------------------------------
  // SOURCE 7: EVENTS (Lightweight events in db.notes)
  // -------------------------------------------------------------
  try {
    const events = allNotes.filter(
      e => e.workspace_id === 'calendar' && e.note_type === 'event' && !e.is_archived && !e.is_deleted
    );

    events.forEach(evt => {
      const date = evt.content?.date || (evt.created_at ? evt.created_at.slice(0, 10) : '');
      if (date >= startDate && date <= endDate) {
        items.push({
          key: `event_${evt.id}`,
          id: evt.id,
          source: 'events',
          type: 'event',
          date,
          title: evt.title || 'Untitled Event',
          subtitle: evt.content?.startTime ? `${evt.content.startTime}` : 'All Day Event',
          status: 'open',
          colorToken: evt.content?.color || CALENDAR_LAYERS.events.colorToken,
          bgToken: CALENDAR_LAYERS.events.bgToken,
          dotClass: CALENDAR_LAYERS.events.dotClass,
          payload: {
            noteId: evt.id,
            workspace: 'calendar',
            raw: evt,
          },
        });
      }
    });
  } catch (err) {
    console.error('Error fetching events for calendar:', err);
  }

  // Sort items deterministically: overdue first, open tasks, routines, journal, info dots
  return items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const priorityOrder = { overdue: 0, open: 1, done: 2, info: 3, missed: 4 };
    return (priorityOrder[a.status] || 9) - (priorityOrder[b.status] || 9);
  });
}

/**
 * In-memory prefetch cache for fast month switching.
 */
class CalendarCache {
  constructor() {
    this.cache = new Map();
  }

  getKey(start, end) {
    return `${start}_${end}`;
  }

  get(start, end) {
    return this.cache.get(this.getKey(start, end));
  }

  set(start, end, data) {
    if (this.cache.size > 12) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(this.getKey(start, end), data);
  }

  clear() {
    this.cache.clear();
  }
}

export const calendarCache = new CalendarCache();

/**
 * Reschedules a calendar item (checklist task, wish, or event) to a new local date string.
 * Strictly updates only date fields and updated_at, and shows an Undo toast.
 * Routine entries and journal entries are NOT reschedulable.
 */
export async function rescheduleCalendarItem(item, newDateStr, showToastNotification = true) {
  if (!item || !newDateStr) return false;
  if (item.source === 'routines' || item.source === 'journal' || item.source === 'sketch' || item.source === 'quicknotes') {
    return false; // Not draggable or reschedulable per requirements
  }

  const oldDate = item.date;
  if (oldDate === newDateStr) return true;

  const now = new Date().toISOString();

  try {
    if (item.source === 'checklists') {
      if (item.type === 'task') {
        await db.checklist_items.update(item.id, {
          due_date: newDateStr,
        });
      } else if (item.type === 'list_due') {
        const note = await db.notes.get(item.id);
        if (note) {
          const content = { ...(note.content || {}), dueDate: newDateStr };
          await db.notes.update(item.id, { content, updated_at: now });
        }
      }
    } else if (item.source === 'wishlist') {
      const note = await db.notes.get(item.id);
      if (note) {
        const content = typeof note.content === 'object' && note.content !== null ? { ...note.content, targetDate: newDateStr } : { targetDate: newDateStr };
        await db.notes.update(item.id, {
          target_date: newDateStr,
          content,
          updated_at: now,
        });
      }
    } else if (item.source === 'events') {
      const note = await db.notes.get(item.id);
      if (note) {
        const content = { ...(note.content || {}), date: newDateStr };
        await db.notes.update(item.id, {
          content,
          updated_at: now,
        });
      }
    }

    // Trigger reactive clear of calendar cache
    calendarCache.clear();

    // Undo Toast if requested
    if (showToastNotification) {
      useToastStore.getState().showToast({
        message: `Rescheduled "${item.title}" to ${newDateStr}`,
        action: {
          label: 'Undo',
          onClick: async () => {
            await rescheduleCalendarItem(item, oldDate);
          }
        },
        duration: 6000,
      });
    }

    return true;
  } catch (err) {
    console.error('Failed to reschedule calendar item:', err);
    return false;
  }
}

/**
 * Creates a lightweight calendar event in db.notes.
 */
export async function createCalendarEvent({ title, date, endDate = null, isAllDay = true, startTime = '', color = '#0F766E', note = '', showCountdown = true }) {
  const newId = generateUUID();
  const now = new Date().toISOString();

  await db.notes.add({
    id: newId,
    user_id: 'local_user',
    workspace_id: 'calendar',
    note_type: 'event',
    title: title.trim() || 'Untitled Event',
    content: {
      date,
      endDate: endDate || null,
      isAllDay: Boolean(isAllDay),
      startTime: startTime || '',
      color: color || '#0F766E',
      note: note || '',
      showCountdown: Boolean(showCountdown),
    },
    color: 'default',
    is_pinned: false,
    is_archived: false,
    is_deleted: false,
    deleted_at: null,
    sort_order: Date.now(),
    created_at: now,
    updated_at: now,
  });

  calendarCache.clear();
  return newId;
}

/**
 * Updates an existing calendar event.
 */
export async function updateCalendarEvent(id, { title, date, endDate = null, isAllDay = true, startTime = '', color = '#0F766E', note = '', showCountdown = true }) {
  const now = new Date().toISOString();
  const existing = await db.notes.get(id);
  if (!existing) return;

  await db.notes.update(id, {
    title: title.trim() || 'Untitled Event',
    content: {
      ...(existing.content || {}),
      date,
      endDate: endDate || null,
      isAllDay: Boolean(isAllDay),
      startTime: startTime || '',
      color: color || existing.content?.color || '#0F766E',
      note: note !== undefined ? note : existing.content?.note || '',
      showCountdown: showCountdown !== undefined ? Boolean(showCountdown) : true,
    },
    updated_at: now,
  });

  calendarCache.clear();
}

/**
 * Fetches up to limit upcoming countdown events.
 */
export async function getUpcomingCountdowns(limit = 3) {
  const todayStr = getTodayStr();
  const notes = await db.notes
    .where('workspace_id')
    .equals('calendar')
    .filter(n => !n.is_archived && !n.is_deleted && n.note_type === 'event')
    .toArray()
    .catch(() => []);

  const upcoming = [];
  notes.forEach(n => {
    const d = n.content?.date;
    if (d && d >= todayStr && n.content?.showCountdown !== false) {
      upcoming.push({
        id: n.id,
        title: n.title,
        date: d,
        isToday: d === todayStr,
        color: n.content?.color || '#0F766E',
        raw: n,
      });
    }
  });

  return upcoming
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}



