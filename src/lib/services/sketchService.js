import { db } from '../db';
import { generateUUID } from '../uuid';
import { softDeleteItem } from './trashService';

const generateId = (prefix = '') => {
  const uid = generateUUID();
  return prefix ? `${prefix}_${uid}` : uid;
};

/**
 * Generates a human-friendly smart default title e.g. "Doodle · Oct 20, 4:12 PM"
 */
export function generateSmartSketchTitle(type = 'doodle', date = new Date()) {
  const prefix = type === 'doodle' ? 'Doodle' : 'Sketch';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${prefix} · ${month} ${day}, ${hours}:${minutes} ${ampm}`;
}

/**
 * Formats relative local time for card display: "Edited 2h ago"
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return 'Recently';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return 'Recently';
  }
}

/**
 * Formats full local date and time for tooltips
 */
export function formatFullDateTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch (e) {
    return '';
  }
}

/**
 * Creates a new sketch note in Dexie along with an initial attachment record.
 */
export async function createSketchNote(arg1 = {}, arg2 = '', arg3 = null) {
  let title = '';
  let description = '';
  let initialDoc = null;
  let mode = 'doodle';
  let entryType = 'doodle';
  let sketchbook = 'Doodles';

  if (typeof arg1 === 'string') {
    title = arg1;
    description = arg2 || '';
    initialDoc = arg3 || null;
    entryType = 'sketch';
    mode = 'sketch';
    sketchbook = 'General';
  } else if (typeof arg1 === 'object' && arg1 !== null) {
    title = arg1.title || '';
    description = arg1.description || '';
    initialDoc = arg1.initialDoc || null;
    mode = arg1.mode || 'doodle';
    entryType = arg1.entryType || 'doodle';
    sketchbook = arg1.sketchbook || (entryType === 'doodle' ? 'Doodles' : 'General');
  }

  const noteId = generateId('sketch');
  const now = new Date().toISOString();
  const defaultTitle = title || generateSmartSketchTitle(entryType);

  let aspectRatio = 1.333;
  if (initialDoc?.width && initialDoc?.height) {
    aspectRatio = Number((initialDoc.width / initialDoc.height).toFixed(3));
  }

  await db.notes.add({
    id: noteId,
    user_id: 'local_user',
    workspace_id: 'sketch',
    subproject_id: null,
    note_type: 'sketch',
    title: defaultTitle,
    content: {
      description: description || '',
      strokes: [],
      sketchDoc: initialDoc || null,
      mode: mode || 'doodle',
      entry_type: entryType || 'doodle',
      sketchbook: sketchbook || (entryType === 'doodle' ? 'Doodles' : 'General'),
      aspect_ratio: aspectRatio,
      is_favorite: false,
      is_untouched: true,
      real_edited_at: now
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
    title: defaultTitle,
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
 * Merges safely via Dexie modify() so metadata fields are never overwritten.
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

  let aspectRatio = 1.333;
  if (sketchDoc?.width && sketchDoc?.height) {
    aspectRatio = Number((sketchDoc.width / sketchDoc.height).toFixed(3));
  }

  // 1. Update attachment
  const existingAtt = await db.attachments
    .where('note_id')
    .equals(noteId)
    .filter(a => a.type === 'sketch')
    .first();

  if (existingAtt) {
    await db.attachments.update(existingAtt.id, {
      title: cleanTitle,
      description: cleanDesc,
      image_data: imageData || existingAtt.image_data,
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
      image_data: imageData || '',
      strokes: strokes,
      sketch_doc: sketchDoc,
      created_at: now,
      updated_at: now,
    });
  }

  // 2. Atomically merge note content via Dexie modify()
  await db.notes.where('id').equals(noteId).modify((note) => {
    note.title = cleanTitle;
    note.updated_at = now;
    const currentContent = note.content || {};

    // Check if drawing has actual content
    const hasItems = (sketchDoc?.layers || []).some(l => (l.items || []).length > 0);
    const hasStrokes = Array.isArray(strokes) && strokes.length > 0;

    note.content = {
      ...currentContent,
      description: cleanDesc,
      strokes: hasStrokes ? strokes : (currentContent.strokes || []),
      sketchDoc: sketchDoc || currentContent.sketchDoc || null,
      thumbnail: imageData || currentContent.thumbnail || null,
      aspect_ratio: aspectRatio || currentContent.aspect_ratio || 1.333,
      real_edited_at: now,
      is_untouched: currentContent.is_untouched ? (!hasItems && !hasStrokes) : false
    };
  });
}

/**
 * Toggles favorite star status without touching updated_at.
 */
export async function toggleSketchFavorite(noteId) {
  await db.notes.where('id').equals(noteId).modify((note) => {
    if (!note.content) note.content = {};
    note.content.is_favorite = !note.content.is_favorite;
    // CRITICAL: Do NOT mutate note.updated_at
  });
}

/**
 * Toggles pin status without touching updated_at.
 */
export async function toggleSketchPin(noteId) {
  await db.notes.where('id').equals(noteId).modify((note) => {
    note.is_pinned = !note.is_pinned;
    // CRITICAL: Do NOT mutate note.updated_at
  });
}

/**
 * Moves sketch to a specific sketchbook without touching updated_at.
 */
export async function moveSketchToSketchbook(noteId, sketchbook) {
  await db.notes.where('id').equals(noteId).modify((note) => {
    if (!note.content) note.content = {};
    note.content.sketchbook = sketchbook || 'General';
    // CRITICAL: Do NOT mutate note.updated_at
  });
}

/**
 * Renames a sketch note. Sets updated_at and real_edited_at.
 */
export async function renameSketch(noteId, newTitle) {
  const cleanTitle = (newTitle || '').trim() || 'Untitled Sketch';
  const now = new Date().toISOString();
  await db.notes.where('id').equals(noteId).modify((note) => {
    note.title = cleanTitle;
    note.updated_at = now;
    if (!note.content) note.content = {};
    note.content.real_edited_at = now;
  });

  const att = await db.attachments
    .where('note_id')
    .equals(noteId)
    .filter(a => a.type === 'sketch')
    .first();
  if (att) {
    await db.attachments.update(att.id, { title: cleanTitle, updated_at: now });
  }
}

/**
 * Batch renames a sketchbook across all matching sketches without touching updated_at.
 */
export async function batchRenameSketchbook(oldName, newName) {
  if (!oldName || !newName || oldName === newName) return;
  await db.notes
    .where('workspace_id')
    .equals('sketch')
    .filter(n => (n.content?.sketchbook || 'General') === oldName)
    .modify((note) => {
      if (!note.content) note.content = {};
      note.content.sketchbook = newName;
      // CRITICAL: Do NOT mutate note.updated_at
    });
}

/**
 * Duplicates a sketch note and its attachment with deep-cloned sketchDoc and fresh IDs.
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

  // Deep clone sketchDoc with fresh IDs
  let clonedSketchDoc = null;
  if (original.content?.sketchDoc) {
    clonedSketchDoc = JSON.parse(JSON.stringify(original.content.sketchDoc));
    if (Array.isArray(clonedSketchDoc.layers)) {
      clonedSketchDoc.layers = clonedSketchDoc.layers.map((layer, lIdx) => ({
        ...layer,
        id: `layer_${generateId('dup')}_${lIdx}`,
        items: (layer.items || []).map((item, iIdx) => ({
          ...item,
          id: `item_${generateId('dup')}_${iIdx}`
        }))
      }));
    }
  }

  await db.notes.add({
    ...original,
    id: newNoteId,
    title: newTitle,
    content: {
      ...(original.content || {}),
      sketchDoc: clonedSketchDoc || original.content?.sketchDoc || null,
      is_untouched: false,
      real_edited_at: now
    },
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
      sketch_doc: clonedSketchDoc || originalAtt.sketch_doc || null,
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
 * Soft deletes a sketch note to Trash.
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
 * Checks if a sketch note is truly blank/untouched (no drawings, no photos, no description, and default title).
 */
export function isSketchEmpty(note) {
  if (!note) return false;
  const content = note.content || {};
  const doc = content.sketchDoc;

  const hasStrokes = Array.isArray(content.strokes) && content.strokes.length > 0;
  const hasLayers = Array.isArray(doc?.layers);
  const hasItems = hasLayers && doc.layers.some(l => (l.items || []).length > 0);
  const hasDesc = Boolean(content.description && content.description.trim());

  if (hasStrokes || hasItems || hasDesc) {
    return false;
  }

  const title = (note.title || '').trim();
  const isDefaultTitle = 
    !title ||
    title === 'Untitled Sketch' ||
    title.startsWith('Doodle ·') ||
    title.startsWith('Sketch ·') ||
    content.is_untouched === true;

  return isDefaultTitle;
}

/**
 * Automatically purges a freshly created empty sketch note if untouched on exit.
 */
export async function deleteEmptySketchIfBlank(noteId) {
  if (!noteId) return false;
  const note = await db.notes.get(noteId);
  if (!note || note.workspace_id !== 'sketch') return false;

  if (isSketchEmpty(note)) {
    await db.notes.delete(noteId);
    const atts = await db.attachments.where('note_id').equals(noteId).toArray();
    if (atts.length > 0) {
      await db.attachments.bulkDelete(atts.map(a => a.id));
    }
    return true;
  }
  return false;
}

/**
 * Scans for legacy empty sketches in the database for the manual cleanup modal.
 */
export async function findOldEmptySketches() {
  const allSketches = await db.notes
    .where('workspace_id')
    .equals('sketch')
    .filter(n => !n.is_deleted)
    .toArray();

  return allSketches.filter(isSketchEmpty);
}

/**
 * Moves confirmed empty sketches to Trash via the existing softDeleteItem service.
 */
export async function cleanupOldEmptySketches(noteIds) {
  if (!Array.isArray(noteIds) || noteIds.length === 0) return 0;
  let count = 0;
  for (const id of noteIds) {
    const note = await db.notes.get(id);
    if (note) {
      await softDeleteItem({
        id: note.id,
        type: 'note',
        title: note.title || 'Untitled Sketch',
        workspace: 'sketch'
      });
      count++;
    }
  }
  return count;
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
    if (isSketchEmpty(sketch)) {
      return sketch.id;
    }
  }
  return null;
}

/**
 * Migrates a legacy sketch into a structured multi-layer document in memory
 */
export function migrateLegacySketchDoc(note, attachment, defaultWidth = 1200, defaultHeight = 900) {
  if (note?.content?.sketchDoc?.version >= 2) {
    return note.content.sketchDoc;
  }
  if (attachment?.sketch_doc?.version >= 2) {
    return attachment.sketch_doc;
  }

  const legacyImageData = attachment?.image_data || note?.content?.image_data || '';
  const legacyStrokes = attachment?.strokes || note?.content?.strokes || [];

  const layers = [];

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
