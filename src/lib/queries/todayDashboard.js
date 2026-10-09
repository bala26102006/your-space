import { db } from '../db';

/**
 * Returns all tasks (checklist_items) due today or overdue.
 */
export async function getTasksDueToday() {
  const todayStr = new Date().toISOString().split('T')[0];
  const allItems = await db.checklist_items.toArray();
  const pendingTasks = allItems.filter(
    i => (i.item_type === 'task' || !i.item_type) && !i.is_completed && i.due_date && i.due_date <= todayStr
  );

  const notes = await db.notes.toArray();
  const noteMap = new Map(notes.map(n => [n.id, n.title || 'Checklist']));

  return pendingTasks.map(item => ({
    ...item,
    checklistTitle: noteMap.get(item.note_id) || 'Checklist'
  }));
}

/**
 * Returns real routine progress for today: total active routines and which are completed vs pending.
 */
export async function getRoutinesStatusForToday() {
  const todayStr = new Date().toISOString().split('T')[0];
  const activeRoutines = (await db.notes.where('workspace_id').equals('routines').toArray())
    .filter(n => !n.is_archived && !n.is_deleted);

  const todayEntries = await db.routine_entries.where('entry_date').equals(todayStr).toArray();
  const completedMap = new Map();
  todayEntries.forEach(e => {
    if (e.is_completed) completedMap.set(e.note_id, e);
  });

  const completed = [];
  const pending = [];

  activeRoutines.forEach(routine => {
    if (completedMap.has(routine.id)) {
      completed.push({ ...routine, entry: completedMap.get(routine.id) });
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
}

/**
 * Returns the most recently updated notes across any workspace.
 */
export async function getRecentNotes(limit = 4) {
  const allNotes = await db.notes.toArray();
  return allNotes
    .filter(n => !n.is_archived && !n.is_deleted && !n.content?.isStarterKit)
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, limit);
}
