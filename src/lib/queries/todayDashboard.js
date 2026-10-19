import { db } from '../db';
import { generateUUID } from '../uuid';
import { getTodayStr, formatLocalDate, isScheduledOn, isEntryComplete, calculateScheduledStreak } from '../routines/routineUtils';

/**
 * Returns all checklist tasks due today or overdue.
 */
export async function getTasksDueToday() {
  try {
    const todayStr = getTodayStr();
    const allItems = await db.checklist_items.toArray().catch(() => []);
    const pendingTasks = allItems.filter(
      i => (i.item_type === 'task' || !i.item_type) && !i.is_completed && i.due_date && i.due_date <= todayStr
    );

    const notes = await db.notes.toArray().catch(() => []);
    const noteMap = new Map(notes.map(n => [n.id, n.title || 'Checklist']));

    return pendingTasks.map(item => ({
      ...item,
      checklistTitle: noteMap.get(item.note_id) || 'Checklist'
    }));
  } catch (err) {
    console.error('Error fetching tasks due today:', err);
    return [];
  }
}

/**
 * Returns routine progress for today: total active routines and which are completed vs pending.
 * Strictly respects scheduling (daily, weekdays, specific days, monthly) and paused routines.
 */
export async function getRoutinesStatusForToday() {
  try {
    const todayStr = getTodayStr();
    const allNotes = await db.notes.toArray().catch(() => []);
    // Filter active routines that are SCHEDULED for today and not paused
    const activeRoutines = allNotes.filter(
      n => n.workspace_id === 'routines' && !n.is_archived && !n.is_deleted && isScheduledOn(n, todayStr)
    );

    const allEntries = await db.routine_entries.toArray().catch(() => []);
    const todayEntries = allEntries.filter(e => e.entry_date === todayStr);
    const entryMap = new Map();
    todayEntries.forEach(e => {
      entryMap.set(e.note_id, e);
    });

    const completed = [];
    const pending = [];

    activeRoutines.forEach(routine => {
      const entry = entryMap.get(routine.id);
      if (isEntryComplete(entry, routine)) {
        completed.push({ ...routine, entry });
      } else {
        pending.push(routine);
      }
    });

    return {
      total: activeRoutines.length,
      completedCount: completed.length,
      pending,
      completed,
    };
  } catch (err) {
    console.error('Error fetching routine status:', err);
    return { total: 0, completedCount: 0, pending: [], completed: [] };
  }
}

/**
 * Returns the 3 most recently updated notes across any workspace.
 */
export async function getRecentNotes(limit = 3) {
  try {
    const allNotes = await db.notes.toArray().catch(() => []);
    return allNotes
      .filter(n => !n.is_archived && !n.is_deleted && !n.content?.isStarterKit)
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
      .slice(0, limit);
  } catch (err) {
    console.error('Error fetching recent notes:', err);
    return [];
  }
}

/**
 * Returns active wishlist items with target dates falling in current month.
 */
export async function getMonthlyWishes() {
  try {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const allNotes = await db.notes.toArray().catch(() => []);
    const allWishes = allNotes.filter(
      w => w.workspace_id === 'wishlist' && !w.is_archived && !w.is_deleted && w.status !== 'got_it' && Boolean(w.target_date)
    );

    return allWishes
      .filter(w => w.target_date && w.target_date.startsWith(yearMonth))
      .sort((a, b) => (a.target_date || '').localeCompare(b.target_date || ''));
  } catch (err) {
    console.error('Error fetching monthly wishes:', err);
    return [];
  }
}

/**
 * Returns streak summary across habits/routines and journal.
 */
export async function getStreakSummary() {
  try {
    const todayStr = getTodayStr();

    // 1. Routine streaks calculated from active routines
    const allNotes = await db.notes.toArray().catch(() => []);
    const activeRoutines = allNotes.filter(
      n => n.workspace_id === 'routines' && !n.is_archived && !n.is_deleted
    );
    const allEntries = await db.routine_entries.toArray().catch(() => []);
    let maxRoutineStreak = 0;
    activeRoutines.forEach(routine => {
      const s = calculateScheduledStreak(routine.id, allEntries, routine);
      if (s > maxRoutineStreak) {
        maxRoutineStreak = s;
      }
    });

    // 2. Journal streak: consecutive days with an entry leading to today or yesterday
    const journalEntries = allNotes.filter(
      n => n.workspace_id === 'journal' && !n.is_archived && !n.is_deleted && Boolean(n.entry_date)
    );

    const journalDates = new Set(journalEntries.map(e => e.entry_date));
    let journalStreak = 0;
    let checkDate = new Date();

    // If didn't write today yet, check if wrote yesterday
    const todayEntryExists = journalDates.has(todayStr);
    if (!todayEntryExists) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dStr = formatLocalDate(checkDate);
      if (journalDates.has(dStr)) {
        journalStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      routineStreak: maxRoutineStreak,
      journalStreak,
      totalStreak: Math.max(maxRoutineStreak, journalStreak),
      wroteToday: todayEntryExists
    };
  } catch (err) {
    console.error('Error fetching streak summary:', err);
    return {
      routineStreak: 0,
      journalStreak: 0,
      totalStreak: 0,
      wroteToday: false
    };
  }
}

const DAILY_PROMPTS = [
  "What made you smile today?",
  "What is something you learned this week?",
  "Describe a challenge you faced and how you overcame it.",
  "What are three things you are grateful for right now?",
  "If today was a chapter in your book, what would it be called?",
  "What is one intention you have for tomorrow?",
  "Who inspired you recently, and why?",
  "Write about a small moment of peace you experienced today.",
  "What drained your energy today? What restored it?",
  "What is a decision you made that you feel good about?",
  "What boundary did you protect or need to set?",
  "What is something beautiful you noticed today?"
];

/**
 * Returns today's journal prompt and current entry status.
 */
export async function getTodayJournalInfo() {
  try {
    const todayStr = getTodayStr();

    const dayOfYear = Math.floor(
      (new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
    );
    const prompt = DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];

    const allNotes = await db.notes.toArray().catch(() => []);
    const todayEntry = allNotes.find(
      n => n.workspace_id === 'journal' && !n.is_archived && !n.is_deleted && n.entry_date === todayStr
    );

    return {
      prompt,
      hasEntry: Boolean(todayEntry),
      entry: todayEntry || null
    };
  } catch (err) {
    console.error('Error fetching today journal info:', err);
    return {
      prompt: DAILY_PROMPTS[0],
      hasEntry: false,
      entry: null
    };
  }
}
