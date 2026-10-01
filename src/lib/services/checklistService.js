import { db } from '../db';

export async function addChecklistItem(noteId, itemData) {
  try {
    const newId = crypto.randomUUID();
    const item = {
      id: newId,
      note_id: noteId,
      is_completed: false,
      sort_order: Date.now(),
      ...itemData
    };
    await db.checklist_items.add(item);
    return newId;
  } catch (error) {
    console.error(`Error adding checklist item to note ${noteId}:`, error);
    throw error;
  }
}

export async function toggleChecklistItem(itemId, isCompleted) {
  try {
    await db.checklist_items.update(itemId, { is_completed: isCompleted });
  } catch (error) {
    console.error(`Error toggling checklist item ${itemId}:`, error);
    throw error;
  }
}

export async function getChecklistProgress(noteId) {
  try {
    const items = await db.checklist_items.where('note_id').equals(noteId).toArray();
    const tasks = items.filter(i => i.item_type === 'task' || !i.item_type);
    const total = tasks.length;
    const completed = tasks.filter(i => i.is_completed).length;
    return { total, completed };
  } catch (error) {
    console.error(`Error getting checklist progress for note ${noteId}:`, error);
    return { total: 0, completed: 0 };
  }
}
