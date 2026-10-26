import { db } from '../db';
import { generateUUID } from '../uuid';
import { getTodayStr, formatLocalDate, isScheduledOn, isEntryComplete, calculateScheduledStreak } from '../routines/routineUtils';
import { calculateJournalStreak, getDailyPrompt } from '../journal/journalUtils';

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
      .filter(n => !n.is_archived && !n.is_deleted && !n.content?.isStarterKit && n.workspace_id !== 'calendar')
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

    // 2. Journal streak: unified gentle streak logic from journalUtils
    const journalEntries = allNotes.filter(
      n => n.workspace_id === 'journal' && !n.is_archived && !n.is_deleted
    );
    const { currentStreak: journalStreak, wroteToday } = calculateJournalStreak(journalEntries);

    return {
      routineStreak: maxRoutineStreak,
      journalStreak,
      totalStreak: Math.max(maxRoutineStreak, journalStreak),
      wroteToday
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

/**
 * Returns today's journal prompt and current entry status.
 * Uses shared getDailyPrompt so JournalView and TodayDashboard always agree.
 */
export async function getTodayJournalInfo() {
  try {
    const todayStr = getTodayStr();
    const dailyPromptObj = getDailyPrompt('all', new Date());

    const allNotes = await db.notes.toArray().catch(() => []);
    const todayEntry = allNotes.find(
      n => n.workspace_id === 'journal' && !n.is_archived && !n.is_deleted && n.entry_date === todayStr
    );

    return {
      prompt: dailyPromptObj.text,
      category: dailyPromptObj.category,
      hasEntry: Boolean(todayEntry),
      entry: todayEntry || null
    };
  } catch (err) {
    console.error('Error fetching today journal info:', err);
    return {
      prompt: "If today was a chapter in your book, what would it be called?",
      category: "Daily Reflection",
      hasEntry: false,
      entry: null
    };
  }
}
