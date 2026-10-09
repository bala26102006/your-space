import { db } from '../db';
import { uuidv4 } from '../uuid';

export const noteService = {
  async createNote(noteData) {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      const newNote = {
        id,
        is_archived: 0,
        is_deleted: 0,
        updated_at: now,
        ...noteData
      };
      await db.notes.add(newNote);
      return newNote;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  },

  async updateNote(id, updates) {
    try {
      updates.updated_at = new Date().toISOString();
      await db.notes.update(id, updates);
      return await db.notes.get(id);
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  },

  async softDeleteNote(id) {
    try {
      const updates = {
        is_deleted: 1,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.notes.update(id, updates);
      return await db.notes.get(id);
    } catch (error) {
      console.error('Error soft deleting note:', error);
      throw error;
    }
  },

  async archiveNote(id) {
    try {
      const updates = {
        is_archived: 1,
        updated_at: new Date().toISOString()
      };
      await db.notes.update(id, updates);
      return await db.notes.get(id);
    } catch (error) {
      console.error('Error archiving note:', error);
      throw error;
    }
  }
};
