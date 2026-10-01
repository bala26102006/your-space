import { db } from '../db';

/**
 * Mock AI Wrappers for Stage 3.4
 * These simulate an API call to an LLM like GPT-4 or Claude.
 * Results are cached in IndexedDB so we don't "re-run" the same prompt for the same context.
 */

// Helper to check cache
export const getCachedAIResult = async (scope_id, action) => {
  const cached = await db.ai_memory.where({ scope_id, action }).first();
  return cached ? cached.result : null;
};

// Helper to save cache
export const cacheAIResult = async (scope_id, action, result) => {
  await db.ai_memory.add({
    scope_id,
    action,
    result,
  });
};

/**
 * Summarize a long text.
 */
export const summarizeText = async (text, noteId) => {
  if (!text.trim()) return '';

  const action = 'summarize';
  const cached = await getCachedAIResult(noteId, action);
  if (cached) return cached;

  // Simulate network delay
  await new Promise(r => setTimeout(r, 1500));

  const result = `[AI Summary]: This note discusses several points. The main takeaway is that structuring ideas helps clarity. (Simulated AI response based on ${text.split(' ').length} words).`;
  
  await cacheAIResult(noteId, action, result);
  return result;
};

/**
 * Expand a bullet or idea into a fuller paragraph or outline.
 */
export const expandIdea = async (text, noteId) => {
  if (!text.trim()) return '';

  const action = 'expand';
  const cached = await getCachedAIResult(noteId, action);
  if (cached) return cached;

  // Simulate network delay
  await new Promise(r => setTimeout(r, 1500));

  const result = `[AI Expanded]: Here is an expansion on your idea:\n\n1. Introduction to the core concept of "${text.substring(0, 30)}..."\n2. Key implications and why it matters.\n3. Potential next steps and actionable items.\n\n(Simulated AI response).`;
  
  await cacheAIResult(noteId, action, result);
  return result;
};

/**
 * Auto-Organize Quick Notes
 * Suggests categories for unorganized notes.
 */
export const autoOrganizeNotes = async (notes) => {
  if (notes.length === 0) return [];
  
  // Simulate network delay
  await new Promise(r => setTimeout(r, 2000));

  // In a real scenario, we'd send the titles/contents to an LLM and ask it to cluster them.
  // Here we just mock it.
  const categories = ['Work', 'Personal', 'Ideas', 'Todos'];
  
  const suggestions = notes.map(note => {
    // Pick a random category for mock purposes, but predictably based on note length
    const catIndex = (note.title.length + (note.content?.content?.length || 0)) % categories.length;
    return {
      noteId: note.id,
      suggestedCategory: categories[catIndex]
    };
  });

  return suggestions;
};
