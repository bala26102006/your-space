import { db } from '../db';
import { uuidv4 } from '../uuid';

export const checklistService = {
  async addChecklistItem(itemData) {
    try {
      const id = uuidv4();
      const newItem = {
        id,
        is_completed: 0,
        ...itemData
      };
      await db.checklist_items.add(newItem);
      return newItem;
    } catch (error) {
      console.error('Error adding checklist item:', error);
      throw error;
    }
  },

  async toggleChecklistItem(id) {
    try {
      const item = await db.checklist_items.get(id);
      if (!item) throw new Error('Checklist item not found');
      
      const newStatus = item.is_completed ? 0 : 1;
      await db.checklist_items.update(id, { is_completed: newStatus });
      return { ...item, is_completed: newStatus };
    } catch (error) {
      console.error('Error toggling checklist item:', error);
      throw error;
    }
  },

  async getChecklistProgress(noteId) {
    try {
      const items = await db.checklist_items.where('note_id').equals(noteId).toArray();
      if (items.length === 0) return { total: 0, completed: 0, percentage: 0 };
      
      const total = items.length;
      const completed = items.filter(item => item.is_completed).length;
      const percentage = Math.round((completed / total) * 100);
      
      return { total, completed, percentage };
    } catch (error) {
      console.error('Error getting checklist progress:', error);
      throw error;
    }
  }
};
