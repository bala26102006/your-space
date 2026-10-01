import { db } from '../db';

export async function createNote(workspaceId, type = 'text', initialData = {}) {
  try {
    const newId = crypto.randomUUID();
    const note = {
      id: newId,
      workspace_id: workspaceId,
      note_type: type,
      is_pinned: false,
      is_archived: false,
      is_deleted: false,
      updated_at: new Date().toISOString(),
      ...initialData
    };
    await db.notes.add(note);
    return newId;
  } catch (error) {
    console.error('Error creating note:', error);
    throw error;
  }
}

export async function updateNote(noteId, updates) {
  try {
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    await db.notes.update(noteId, updatedData);
  } catch (error) {
    console.error(`Error updating note ${noteId}:`, error);
    throw error;
  }
}

export async function softDeleteNote(noteId) {
  try {
    await db.notes.update(noteId, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error soft deleting note ${noteId}:`, error);
    throw error;
  }
}

export async function archiveNote(noteId) {
  try {
    await db.notes.update(noteId, {
      is_archived: true,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error archiving note ${noteId}:`, error);
    throw error;
  }
}
