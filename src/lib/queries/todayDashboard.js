import { db } from '../db';

/**
 * Returns all tasks (checklist_items) due today.
 */
export async function getTasksDueToday() {
  const todayStr = new Date().toISOString().split('T')[0];
  const items = await db.checklist_items.where('due_date').equals(todayStr).toArray();
  return items.filter(i => (i.item_type === 'task' || !i.item_type) && !i.is_completed);
}

/**
 * Returns all routines for today (from routine_entries).
 */
export async function getRoutinesForToday() {
  const todayStr = new Date().toISOString().split('T')[0];
  const entries = await db.routine_entries.where('entry_date').equals(todayStr).toArray();
  return entries;
}

/**
 * Returns the most recently updated notes across any workspace.
 */
export async function getRecentNotes(limit = 3) {
  const allNotes = await db.notes.toArray();
  return allNotes
    .filter(n => !n.is_archived && !n.is_deleted && !n.content?.isStarterKit)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, limit);
}
