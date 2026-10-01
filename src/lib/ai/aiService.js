import { db } from '../db';

const HUGGINGFACE_API_KEY = import.meta.env.VITE_HF_API_KEY; // Replace with actual AI API
const AI_API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1';

async function callAI(prompt) {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error('AI API key is missing.');
  }

  const response = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 500 } })
  });

  if (!response.ok) {
    throw new Error(`AI API Error: ${response.status}`);
  }
  const result = await response.json();
  return result[0]?.generated_text?.replace(prompt, '').trim() || 'No response';
}

export async function summarizeText(text, scopeId, scopeType = 'note') {
  const hash = btoa(text.slice(0, 50) + text.length);
  const existing = await db.ai_memory.where({ scope_id: scopeId, action: 'summarize' }).first();
  if (existing && existing.input_hash === hash) {
    return existing.output.summary;
  }

  const summary = await callAI(`Summarize the following text concisely:\n\n${text}`);
  
  await db.ai_memory.add({
    id: crypto.randomUUID(),
    scope_type: scopeType,
    scope_id: scopeId,
    action: 'summarize',
    input_hash: hash,
    output: { summary },
    created_at: new Date().toISOString()
  });

  return summary;
}

export async function expandIdea(text, scopeId, scopeType = 'note') {
  const expanded = await callAI(`Expand on the following idea, providing more detail and examples:\n\n${text}`);
  return expanded;
}

export async function autoOrganize(contentArray, scopeId) {
  const prompt = `Organize the following items into logical categories. Return a JSON string mapping categories to arrays of item strings: ${JSON.stringify(contentArray)}`;
  const result = await callAI(prompt);
  try {
    // Attempt to parse JSON from AI response
    const jsonStr = result.match(/\{[\s\S]*\}/)?.[0] || '{}';
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse AI organization', e);
    return { "General": contentArray };
  }
}
