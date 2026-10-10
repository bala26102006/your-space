import { db } from '../db';

/**
 * Checks if a TipTap document or content structure contains any actual text.
 */
export function isContentEmpty(content) {
  if (!content) return true;
  if (typeof content === 'string') return content.trim().length === 0;
  if (Array.isArray(content)) return content.length === 0;
  if (typeof content === 'object') {
    if (!content.content || !Array.isArray(content.content) || content.content.length === 0) return true;
    const extractText = (node) => {
      if (!node) return '';
      if (node.text) return node.text;
      if (Array.isArray(node.content)) return node.content.map(extractText).join(' ');
      return '';
    };
    return extractText(content).trim().length === 0;
  }
  return true;
}

/**
 * Determines whether a journal entry has no meaningful title and no content.
 */
export function isJournalEntryEmpty(note) {
  if (!note) return true;
  const title = (note.title || '').trim();
  const hasTitle = title.length > 0 && title !== 'Journal Entry' && title !== 'Daily Reflection';
  const hasContent = !isContentEmpty(note.content);
  return !hasTitle && !hasContent;
}

/**
 * One-time cleanup to delete all existing empty journal entries from Dexie.
 */
export async function cleanupEmptyJournalEntries() {
  const notes = await db.notes.where('workspace_id').equals('journal').toArray();
  const emptyNotes = notes.filter(isJournalEntryEmpty);
  if (emptyNotes.length > 0) {
    const ids = emptyNotes.map((n) => n.id);
    await db.note_tags.where('note_id').anyOf(ids).delete();
    await db.notes.bulkDelete(ids);
  }
  return emptyNotes.length;
}
