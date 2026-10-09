import { db } from '../db';
import { generateUUID } from '../uuid';

const generateId = (prefix = '') => {
  const uid = generateUUID();
  return prefix ? `${prefix}_${uid}` : uid;
};

/**
 * Creates a new sketch note in Dexie along with an initial attachment record.
 */
export async function createSketchNote(title = 'Untitled Sketch', description = '') {
  const noteId = generateId('sketch');
  const now = new Date().toISOString();

  await db.notes.add({
    id: noteId,
    user_id: 'local_user',
    workspace_id: 'sketch',
    subproject_id: null,
    note_type: 'sketch',
    title: title || 'Untitled Sketch',
    content: { description: description || '', strokes: [] },
    is_pinned: false,
    is_archived: false,
    is_deleted: false,
    sort_order: Date.now(),
    created_at: now,
    updated_at: now,
  });

  const attachmentId = generateId('att');
  await db.attachments.add({
    id: attachmentId,
    note_id: noteId,
    type: 'sketch',
    title: title || 'Untitled Sketch',
    description: description || '',
    image_data: '',
    strokes: [],
    created_at: now,
    updated_at: now,
  });

  return noteId;
}

/**
 * Saves or updates sketch canvas image and metadata in attachments and notes tables.
 */
export async function saveSketch({ noteId, title, description, imageData, strokes = [] }) {
  const cleanTitle = (title || '').trim() || 'Untitled Sketch';
  const cleanDesc = (description || '').trim();
  const now = new Date().toISOString();

  // Find existing attachment for this sketch note
  const existingAtt = await db.attachments
    .where('note_id')
    .equals(noteId)
    .filter(a => a.type === 'sketch')
    .first();

  if (existingAtt) {
    await db.attachments.update(existingAtt.id, {
      title: cleanTitle,
      description: cleanDesc,
      image_data: imageData,
      strokes: strokes,
      updated_at: now,
    });
  } else {
    await db.attachments.add({
      id: generateId('att'),
      note_id: noteId,
      type: 'sketch',
      title: cleanTitle,
      description: cleanDesc,
      image_data: imageData,
      strokes: strokes,
      created_at: now,
      updated_at: now,
    });
  }

  // Also keep the note record in sync
  const note = await db.notes.get(noteId);
  if (note) {
    await db.notes.update(noteId, {
      title: cleanTitle,
      content: { ...(note.content || {}), description: cleanDesc, strokes },
      updated_at: now,
    });
  }
}

/**
 * Saves a sketch as an attachment to an existing note (Quick Note, Journal, or Project).
 */
export async function attachSketchToNote({ targetNoteId, title, description, imageData, strokes = [] }) {
  const cleanTitle = (title || '').trim() || 'Attached Sketch';
  const cleanDesc = (description || '').trim();
  const now = new Date().toISOString();

  const attachmentId = generateId('att');
  await db.attachments.add({
    id: attachmentId,
    note_id: targetNoteId,
    type: 'sketch',
    title: cleanTitle,
    description: cleanDesc,
    image_data: imageData,
    strokes: strokes,
    created_at: now,
    updated_at: now,
  });

  return attachmentId;
}

/**
 * Soft deletes a sketch note.
 */
export async function deleteSketchNote(noteId) {
  const now = new Date().toISOString();
  await db.notes.update(noteId, {
    is_deleted: true,
    deleted_at: now,
    updated_at: now,
  });
}

/**
 * Finds an existing blank, untitled sketch note with no strokes or attachments.
 */
export async function findExistingBlankSketch() {
  const sketches = await db.notes
    .where('workspace_id')
    .equals('sketch')
    .filter(n => !n.is_archived && !n.is_deleted)
    .reverse()
    .sortBy('created_at');

  for (const sketch of sketches) {
    const hasStrokes = Array.isArray(sketch.content?.strokes) && sketch.content.strokes.length > 0;
    const isDefaultTitle = !sketch.title || sketch.title.trim() === 'Untitled Sketch';
    const hasNoDesc = !sketch.content?.description?.trim();

    if (!hasStrokes && isDefaultTitle && hasNoDesc) {
      const att = await db.attachments
        .where('note_id')
        .equals(sketch.id)
        .filter(a => a.type === 'sketch')
        .first();

      const hasAttStrokes = att && Array.isArray(att.strokes) && att.strokes.length > 0;
      const hasAttImage = att && att.image_data && att.image_data.length > 100;
      if (!hasAttStrokes && !hasAttImage) {
        return sketch.id;
      }
    }
  }

  return null;
}

/**
 * Automatically purges an empty, blank sketch note if it has no strokes and default title.
 */
export async function deleteEmptySketchIfBlank(noteId) {
  if (!noteId) return false;
  const note = await db.notes.get(noteId);
  if (!note || note.workspace_id !== 'sketch') return false;

  const hasStrokes = Array.isArray(note.content?.strokes) && note.content.strokes.length > 0;
  const isDefaultTitle = !note.title || note.title.trim() === 'Untitled Sketch';
  const hasNoDesc = !note.content?.description?.trim();

  const att = await db.attachments
    .where('note_id')
    .equals(noteId)
    .filter(a => a.type === 'sketch')
    .first();
  const hasAttStrokes = att && Array.isArray(att.strokes) && att.strokes.length > 0;
  const hasAttImage = att && att.image_data && att.image_data.length > 100;

  if (!hasStrokes && !hasAttStrokes && !hasAttImage && isDefaultTitle && hasNoDesc) {
    await db.notes.delete(noteId);
    if (att) {
      await db.attachments.delete(att.id);
    }
    return true;
  }
  return false;
}

