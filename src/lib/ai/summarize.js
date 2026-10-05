import { db } from '../db';
import { callGeminiAPI, hashString } from './api';

export async function summarizeText(text, scopeId) {
  if (!text.trim()) return '';

  const inputHash = await hashString(text);
  
  // Check cache
  const cached = await db.ai_memory
    .where({ action: 'summarize', scope_id: scopeId })
    .first();

  if (cached && cached.input_hash === inputHash) {
    return cached.output;
  }

  const prompt = `Summarize the following text in exactly one short paragraph. Do not add any introductory text, just provide the summary.\n\nText:\n${text}`;
  
  const summary = await callGeminiAPI(prompt);
  
  if (cached) {
    await db.ai_memory.update(cached.id, {
      input_hash: inputHash,
      output: summary,
      updated_at: new Date().toISOString()
    });
  } else {
    await db.ai_memory.add({
      input_hash: inputHash,
      action: 'summarize',
      scope_id: scopeId,
      output: summary,
      created_at: new Date().toISOString()
    });
  }

  return summary;
}
