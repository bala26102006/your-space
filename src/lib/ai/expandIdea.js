import { db } from '../db';
import { callGeminiAPI, hashString } from './api';

export async function expandIdea(text, scopeId) {
  if (!text.trim()) return '';

  const inputHash = await hashString(text);
  
  // Check cache
  const cached = await db.ai_memory
    .where({ action: 'expand', scope_id: scopeId })
    .first();

  if (cached && cached.input_hash === inputHash) {
    return cached.output;
  }

  const prompt = `Turn the following rough bullet point or idea into a structured outline or detailed paragraph. Do not include any introductory fluff, just provide the expansion.\n\nIdea:\n${text}`;
  
  const expanded = await callGeminiAPI(prompt, undefined, 800);
  
  if (cached) {
    await db.ai_memory.update(cached.id, {
      input_hash: inputHash,
      output: expanded,
      updated_at: new Date().toISOString()
    });
  } else {
    await db.ai_memory.add({
      input_hash: inputHash,
      action: 'expand',
      scope_id: scopeId,
      output: expanded,
      created_at: new Date().toISOString()
    });
  }

  return expanded;
}
