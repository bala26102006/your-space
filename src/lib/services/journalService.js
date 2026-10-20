import { db } from '../db';
import { isJournalEntryEmptyWithPrompt, extractTextPreview } from '../journal/journalUtils';

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
 * Determines whether a journal entry has no meaningful title and no user-written content.
 * An entry that only contains an inserted prompt quote (and no personal writing)
 * is recognized as empty and safely cleaned up on close.
 */
export function isJournalEntryEmpty(note) {
  if (!note) return true;
  const title = (note.title || '').trim();
  const promptText = (note.journal_meta?.prompt || '').trim();

  // Check if title is default or matches the prompt
  const hasCustomTitle = title.length > 0 && 
    title !== 'Journal Entry' && 
    title !== 'Daily Reflection' &&
    title !== 'Untitled reflection' &&
    title !== promptText;

  // Extract all text inside content
  const textContent = extractTextPreview(note.content).trim();
  
  // Clean text from wrapping quotes/blockquotes for comparison
  const cleanContentText = textContent.replace(/^["'“‘]+|["'”’]+$/g, '').trim();
  const cleanTitle = title.replace(/^["'“‘]+|["'”’]+$/g, '').trim();
  const cleanPrompt = promptText.replace(/^["'“‘]+|["'”’]+$/g, '').trim();

  // If textContent matches the prompt or title exactly, user has not typed anything
  const isPromptOnly = textContent.length > 0 && (
    (cleanPrompt && cleanContentText === cleanPrompt) ||
    (cleanTitle && cleanContentText === cleanTitle)
  );

  const hasContent = textContent.length > 0 && !isPromptOnly;

  // If also checked against known prompt catalog
  if (!hasCustomTitle && !hasContent) {
    return true;
  }

  return isJournalEntryEmptyWithPrompt(note);
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
