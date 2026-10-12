import { db } from '../db';
import { generateUUID } from '../uuid';

const generateId = (prefix = '') => {
  const uid = generateUUID();
  return prefix ? `${prefix}_${uid}` : uid;
};

/**
 * Creates a new sketch note in Dexie along with an initial attachment record.
 */
export async function createSketchNote(title = 'Untitled Sketch', description = '', initialDoc = null) {
  const noteId = generateId('sketch');
  const now = new Date().toISOString();

  await db.notes.add({
    id: noteId,
    user_id: 'local_user',
    workspace_id: 'sketch',
    subproject_id: null,
    note_type: 'sketch',
    title: title || 'Untitled Sketch',
    content: {
      description: description || '',
      strokes: [],
      sketchDoc: initialDoc || null
    },
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
    sketch_doc: initialDoc || null,
    created_at: now,
    updated_at: now,
  });

  return noteId;
}

/**
 * Saves or updates sketch canvas image and non-destructive document.
 */
export async function saveSketch({
  noteId,
  title,
  description,
  imageData,
  strokes = [],
  sketchDoc = null
}) {
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
      sketch_doc: sketchDoc || existingAtt.sketch_doc,
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
      sketch_doc: sketchDoc,
      created_at: now,
      updated_at: now,
    });
  }

  // Also keep the note record in sync
  const note = await db.notes.get(noteId);
  if (note) {
    await db.notes.update(noteId, {
      title: cleanTitle,
      content: {
        ...(note.content || {}),
        description: cleanDesc,
        strokes,
        sketchDoc: sketchDoc || note.content?.sketchDoc || null
      },
      updated_at: now,
    });
  }
}

/**
 * Migrates a legacy sketch into a structured multi-layer document in memory
 */
export function migrateLegacySketchDoc(note, attachment, defaultWidth = 1200, defaultHeight = 900) {
  // If already a V2 document, return as is
  if (note?.content?.sketchDoc?.version >= 2) {
    return note.content.sketchDoc;
  }
  if (attachment?.sketch_doc?.version >= 2) {
    return attachment.sketch_doc;
  }

  const legacyImageData = attachment?.image_data || note?.content?.image_data || '';
  const legacyStrokes = attachment?.strokes || note?.content?.strokes || [];

  const layers = [];

  // If there's an existing flattened bitmap image, treat it as a base image layer
  if (legacyImageData && legacyImageData.length > 50) {
    layers.push({
      id: 'layer_legacy_img',
      name: 'Original Image',
      type: 'image',
      visible: true,
      opacity: 1,
      items: [
        {
          id: 'item_legacy_bg',
          type: 'image',
          src: legacyImageData,
          x: 0,
          y: 0,
          width: defaultWidth,
          height: defaultHeight,
          rotation: 0,
          opacity: 1,
          flipX: false,
          flipY: false
        }
      ]
    });
  }

  // Legacy strokes become a drawing layer
  layers.push({
    id: 'layer_drawing_main',
    name: 'Drawing',
    type: 'drawing',
    visible: true,
    opacity: 1,
    items: legacyStrokes.map((s, idx) => ({
      ...s,
      id: s.id || `stroke_legacy_${idx}`
    }))
  });

  return {
    version: 2,
    preset: 'free',
    width: defaultWidth,
    height: defaultHeight,
    background: {
      id: 'dark',
      color: '#1A1D23',
      pattern: 'grid',
      showGuides: true
    },
    layers
  };
}

/**
 * Duplicates a sketch note and its attachment
 */
export async function duplicateSketchNote(originalNoteId) {
  const original = await db.notes.get(originalNoteId);
  if (!original) return null;

  const originalAtt = await db.attachments
    .where('note_id')
    .equals(originalNoteId)
    .filter(a => a.type === 'sketch')
    .first();

  const newNoteId = generateId('sketch');
  const now = new Date().toISOString();
  const newTitle = `Copy of ${original.title || 'Untitled Sketch'}`;

  await db.notes.add({
    ...original,
    id: newNoteId,
    title: newTitle,
    sort_order: Date.now(),
    created_at: now,
    updated_at: now
  });

  if (originalAtt) {
    await db.attachments.add({
      ...originalAtt,
      id: generateId('att'),
      note_id: newNoteId,
      title: newTitle,
      created_at: now,
      updated_at: now
    });
  }

  return newNoteId;
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
    const hasSketchDocItems = (sketch.content?.sketchDoc?.layers || []).some(
      l => (l.items || []).length > 0
    );
    const isDefaultTitle = !sketch.title || sketch.title.trim() === 'Untitled Sketch';
    const hasNoDesc = !sketch.content?.description?.trim();

    if (!hasStrokes && !hasSketchDocItems && isDefaultTitle && hasNoDesc) {
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
  const hasSketchDocItems = (note.content?.sketchDoc?.layers || []).some(
    l => (l.items || []).length > 0
  );
  const isDefaultTitle = !note.title || note.title.trim() === 'Untitled Sketch';
  const hasNoDesc = !note.content?.description?.trim();

  const att = await db.attachments
    .where('note_id')
    .equals(noteId)
    .filter(a => a.type === 'sketch')
    .first();
  const hasAttStrokes = att && Array.isArray(att.strokes) && att.strokes.length > 0;
  const hasAttImage = att && att.image_data && att.image_data.length > 100;

  if (!hasStrokes && !hasSketchDocItems && !hasAttStrokes && !hasAttImage && isDefaultTitle && hasNoDesc) {
    await db.notes.delete(noteId);
    if (att) {
      await db.attachments.delete(att.id);
    }
    return true;
  }
  return false;
}
