import Dexie from 'dexie';
import { db } from '../db';

/**
 * yourspace_sketch_cache:
 * A separate lightweight IndexedDB database specifically for the Sketch Studio gallery.
 * Notes and attachments in the main DB (YourSpaceDB) remain the single source of truth.
 *
 * Each record is slim:
 * - id: note ID
 * - title: string
 * - description: string (first 300 chars)
 * - thumbnail: Blob (compressed WebP/JPEG blob) or string (dataURL fallback)
 * - aspect_ratio: number (e.g., 1.33)
 * - bg_color: string (e.g., '#1A1D23')
 * - entry_type: 'doodle' | 'sketch' | 'photo'
 * - mode: 'doodle' | 'sketch'
 * - sketchbook: string ('Doodles', 'General', or custom)
 * - is_favorite: boolean
 * - is_pinned: boolean
 * - is_archived: boolean
 * - is_deleted: boolean
 * - created_at: string (ISO)
 * - updated_at: string (ISO)
 * - real_edited_at: string (ISO, strictly updated when drawing/title/desc changes)
 */
export const sketchCacheDb = new Dexie('yourspace_sketch_cache');

sketchCacheDb.version(1).stores({
  sketches: 'id, title, is_pinned, is_favorite, is_archived, is_deleted, sketchbook, entry_type, mode, created_at, updated_at, real_edited_at'
});

/**
 * Detects the entry_type and mode from an existing sketch note and its attachment without mutating them.
 */
export function detectSketchMetadata(note, attachment) {
  const content = note?.content || {};
  const doc = content.sketchDoc || attachment?.sketch_doc;
  const layers = doc?.layers || [];

  // Check for photo/image layer or items
  const hasPhoto = layers.some(layer => 
    layer.type === 'image' || 
    (layer.items || []).some(item => item.type === 'image')
  ) || Boolean(attachment?.image_data && attachment.image_data.length > 50000 && (!doc || layers.length === 0));

  // Determine entry_type
  let entryType = content.entry_type;
  if (!entryType) {
    if (hasPhoto) {
      entryType = 'photo';
    } else if (layers.length > 1 || (content.strokes && content.strokes.length > 50)) {
      entryType = 'sketch';
    } else {
      entryType = 'doodle';
    }
  }

  // Determine studio mode
  let mode = content.mode;
  if (!mode) {
    mode = (entryType === 'sketch' || entryType === 'photo') ? 'sketch' : 'doodle';
  }

  // Determine sketchbook collection
  let sketchbook = content.sketchbook;
  if (!sketchbook) {
    // Old sketches default to 'General'; only explicitly created new Quick Doodles use 'Doodles'
    sketchbook = 'General';
  }

  // Calculate aspect ratio
  let aspectRatio = content.aspect_ratio;
  if (!aspectRatio && doc?.width && doc?.height) {
    aspectRatio = Number((doc.width / doc.height).toFixed(3));
  }
  if (!aspectRatio || isNaN(aspectRatio)) {
    aspectRatio = 1.333; // Default 4/3
  }

  // Background color
  const bgColor = doc?.background?.color || (doc?.background?.id === 'white' ? '#FFFFFF' : '#1A1D23');

  // Truncated description
  const description = (content.description || attachment?.description || '').slice(0, 300);

  // Real edited timestamp (defaults to updated_at)
  const realEditedAt = content.real_edited_at || note.updated_at || note.created_at || new Date().toISOString();

  return {
    entryType,
    mode,
    sketchbook,
    aspectRatio,
    bgColor,
    description,
    realEditedAt
  };
}

/**
 * Converts a dataURL string to a binary Blob for optimal memory and storage.
 */
export function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.warn('Failed to convert dataURL to Blob:', err);
    return null;
  }
}

/**
 * Updates a single sketch record in the cache.
 */
export async function syncSketchToCache(noteId) {
  if (!noteId) return;
  try {
    const note = await db.notes.get(noteId);
    if (!note || note.workspace_id !== 'sketch') {
      // If deleted from notes or not a sketch, remove from cache
      await sketchCacheDb.sketches.delete(noteId);
      return;
    }

    const attachment = await db.attachments
      .where('note_id')
      .equals(noteId)
      .filter(a => a.type === 'sketch')
      .first();

    const meta = detectSketchMetadata(note, attachment);
    const existingCache = await sketchCacheDb.sketches.get(noteId);

    // Prefer existing cache thumbnail blob, or convert attachment image_data / note thumbnail
    let thumbnail = existingCache?.thumbnail;
    if (!thumbnail) {
      const rawThumb = note.content?.thumbnail || attachment?.image_data;
      if (rawThumb) {
        thumbnail = dataUrlToBlob(rawThumb) || rawThumb;
      }
    }

    await sketchCacheDb.sketches.put({
      id: note.id,
      title: note.title || 'Untitled Sketch',
      description: meta.description,
      thumbnail: thumbnail || null,
      aspect_ratio: meta.aspectRatio,
      bg_color: meta.bgColor,
      entry_type: meta.entryType,
      mode: meta.mode,
      sketchbook: meta.sketchbook,
      is_favorite: Boolean(note.content?.is_favorite),
      is_pinned: Boolean(note.is_pinned),
      is_archived: Boolean(note.is_archived),
      is_deleted: Boolean(note.is_deleted),
      created_at: note.created_at,
      updated_at: note.updated_at,
      real_edited_at: meta.realEditedAt
    });
  } catch (err) {
    console.error('Failed to sync sketch to cache:', noteId, err);
  }
}

/**
 * Reconciles cache on app load / gallery mount:
 * Compares primary keys without loading full records into memory.
 */
let isReconciling = false;
export async function reconcileSketchCache() {
  if (isReconciling) return;
  isReconciling = true;

  try {
    // 1. Fetch note keys (only keys, 0 document payload)
    const activeNoteKeys = await db.notes
      .where('workspace_id')
      .equals('sketch')
      .primaryKeys();

    const activeKeySet = new Set(activeNoteKeys);

    // 2. Fetch cache keys
    const cachedKeys = await sketchCacheDb.sketches.toCollection().primaryKeys();
    const cachedKeySet = new Set(cachedKeys);

    // 3. Remove orphans (in cache but not in db.notes)
    const orphans = cachedKeys.filter(k => !activeKeySet.has(k));
    if (orphans.length > 0) {
      await sketchCacheDb.sketches.bulkDelete(orphans);
    }

    // 4. Identify missing (in db.notes but not in cache)
    const missing = activeNoteKeys.filter(k => !cachedKeySet.has(k));
    if (missing.length > 0) {
      // Backfill in idle time, newest first, one by one
      enqueueIdleBackfill(missing);
    }
  } catch (err) {
    console.error('Failed to reconcile sketch cache:', err);
  } finally {
    isReconciling = false;
  }
}

/**
 * Enqueue idle backfill for missing sketches
 */
const backfillQueue = [];
let isBackfillRunning = false;

function enqueueIdleBackfill(noteIds) {
  backfillQueue.push(...noteIds);
  if (!isBackfillRunning) {
    processBackfillQueue();
  }
}

function processBackfillQueue() {
  if (backfillQueue.length === 0) {
    isBackfillRunning = false;
    return;
  }
  isBackfillRunning = true;

  const scheduleNext = typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback
    : (cb) => setTimeout(cb, 50);

  scheduleNext(async (deadline) => {
    while (backfillQueue.length > 0 && (!deadline || deadline.timeRemaining() > 10 || !deadline.timeRemaining)) {
      const nextId = backfillQueue.shift();
      await syncSketchToCache(nextId);
    }
    if (backfillQueue.length > 0) {
      processBackfillQueue();
    } else {
      isBackfillRunning = false;
    }
  });
}

/**
 * Rebuilds the gallery cache completely from scratch (via More menu).
 */
export async function rebuildSketchCache() {
  await sketchCacheDb.sketches.clear();
  const allKeys = await db.notes
    .where('workspace_id')
    .equals('sketch')
    .reverse()
    .sortBy('created_at');
  
  const ids = allKeys.map(k => k.id);
  enqueueIdleBackfill(ids);
  return ids.length;
}

/**
 * Hooks setup:
 * Listens to Dexie transaction completions on db.notes and db.attachments.
 * Writes to the cache in a separate transaction after the main transaction commits.
 */
let hooksInstalled = false;
export function initSketchCacheHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;

  const pendingDirtyIds = new Set();
  let syncTimeout = null;

  const flushDirtyIds = () => {
    if (pendingDirtyIds.size === 0) return;
    const ids = Array.from(pendingDirtyIds);
    pendingDirtyIds.clear();

    // Process asynchronously outside of main transaction
    setTimeout(async () => {
      for (const id of ids) {
        await syncSketchToCache(id);
      }
    }, 0);
  };

  const scheduleFlush = () => {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(flushDirtyIds, 50);
  };

  // Hook into notes
  db.notes.hook('creating', function (primKey, obj, trans) {
    if (obj.workspace_id === 'sketch') {
      trans.on('complete', () => {
        pendingDirtyIds.add(obj.id || primKey);
        scheduleFlush();
      });
    }
  });

  db.notes.hook('updating', function (modifications, primKey, obj, trans) {
    if (obj.workspace_id === 'sketch' || modifications.workspace_id === 'sketch') {
      trans.on('complete', () => {
        pendingDirtyIds.add(primKey);
        scheduleFlush();
      });
    }
  });

  db.notes.hook('deleting', function (primKey, obj, trans) {
    if (obj?.workspace_id === 'sketch') {
      trans.on('complete', () => {
        pendingDirtyIds.add(primKey);
        scheduleFlush();
      });
    }
  });

  // Hook into attachments
  db.attachments.hook('creating', function (primKey, obj, trans) {
    if (obj.type === 'sketch' && obj.note_id) {
      trans.on('complete', () => {
        pendingDirtyIds.add(obj.note_id);
        scheduleFlush();
      });
    }
  });

  db.attachments.hook('updating', function (modifications, primKey, obj, trans) {
    if (obj.type === 'sketch' && obj.note_id) {
      trans.on('complete', () => {
        pendingDirtyIds.add(obj.note_id);
        scheduleFlush();
      });
    }
  });

  db.attachments.hook('deleting', function (primKey, obj, trans) {
    if (obj.type === 'sketch' && obj.note_id) {
      trans.on('complete', () => {
        pendingDirtyIds.add(obj.note_id);
        scheduleFlush();
      });
    }
  });
}
