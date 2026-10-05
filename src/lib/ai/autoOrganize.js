import { db } from '../db';
import { callGeminiAPI, hashString } from './api';

export async function autoOrganize(notes) {
  if (!notes || notes.length === 0) return [];

  // Create a minimal string representation of notes to hash
  const notesString = JSON.stringify(notes.map(n => ({ id: n.id, t: n.title, c: typeof n.content === 'string' ? n.content.substring(0, 50) : JSON.stringify(n.content).substring(0, 50) })));
  const inputHash = await hashString(notesString);
  
  // Check cache for global auto-organize
  const cached = await db.ai_memory
    .where({ action: 'autoOrganize', scope_id: 'quicknotes' })
    .first();

  if (cached && cached.input_hash === inputHash) {
    try {
      return JSON.parse(cached.output);
    } catch (e) {
      console.error('Failed to parse cached autoOrganize result', e);
    }
  }

  const prompt = `I have a list of quick notes. I want you to suggest grouping related notes into projects or categories. 
Return ONLY a valid JSON array of objects, where each object has "category" (string) and "noteIds" (array of strings, containing the note IDs belonging to that category). Do not return markdown, just raw JSON.

Notes:
${JSON.stringify(notes.map(n => ({ id: n.id, title: n.title, content: typeof n.content === 'string' ? n.content.substring(0, 100) : JSON.stringify(n.content).substring(0, 100) })))}
`;
  
  const resultText = await callGeminiAPI(prompt, undefined, 1000);
  
  let resultJson = [];
  try {
    const jsonStr = resultText.match(/\[[\s\S]*\]/)?.[0] || '[]';
    resultJson = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse AI organization', e);
    return [];
  }

  const outputString = JSON.stringify(resultJson);

  if (cached) {
    await db.ai_memory.update(cached.id, {
      input_hash: inputHash,
      output: outputString,
      updated_at: new Date().toISOString()
    });
  } else {
    await db.ai_memory.add({
      input_hash: inputHash,
      action: 'autoOrganize',
      scope_id: 'quicknotes',
      output: outputString,
      created_at: new Date().toISOString()
    });
  }

  return resultJson;
}
