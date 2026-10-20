import { db } from '../db';
import { sketchCacheDb, syncSketchToCache } from './sketchCache';
import { generateUUID } from '../uuid';

/**
 * Creates 100+ synthetic sketches in db.notes and db.attachments.
 * Includes:
 * - 90 sketches with stroke items (representing drawing doodles)
 * - 15 sketches with photo layer items containing embedded ~200KB-300KB Base64 image payloads
 */
export async function seedSyntheticSketches(count = 105) {
  console.log(`[Benchmark] Seeding ${count} synthetic sketches...`);

  // Generate a realistic dummy 200KB base64 JPEG-like string
  const dummyPhotoChunk = 'iVBORw0KGgoAAAANSUhEUgAAAZAAAADwCAYAAABjY57AAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mPT3AAAAYdEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41Ljb/t3QAA...'.repeat(500);

  const notesToAdd = [];
  const attachmentsToAdd = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const id = `synthetic_sketch_${generateUUID()}`;
    const date = new Date(now.getTime() - i * 3600000 * 4).toISOString();
    const isPhoto = i % 7 === 0; // ~15 photo sketches out of 105
    const isDoodle = !isPhoto && i % 2 === 0;

    // Build stroke items
    const strokes = [];
    const strokeCount = isPhoto ? 5 : Math.floor(Math.random() * 25) + 10;
    for (let s = 0; s < strokeCount; s++) {
      const points = [];
      const ptCount = Math.floor(Math.random() * 40) + 20;
      for (let p = 0; p < ptCount; p++) {
        points.push([p * 10, Math.sin(p) * 20 + s * 15, 0.5]);
      }
      strokes.push({
        id: `stroke_${s}`,
        points,
        color: '#FB923C',
        size: 4,
        opacity: 1,
        brush: 'pen',
        tool: 'pen'
      });
    }

    const layers = [
      {
        id: 'layer_1',
        name: 'Artwork',
        type: 'drawing',
        visible: true,
        opacity: 1,
        items: strokes
      }
    ];

    if (isPhoto) {
      layers.unshift({
        id: 'layer_photo',
        name: 'Imported Photo',
        type: 'image',
        visible: true,
        opacity: 1,
        items: [
          {
            id: 'photo_item_1',
            type: 'image',
            src: `data:image/jpeg;base64,${dummyPhotoChunk}`,
            x: 0,
            y: 0,
            width: 1200,
            height: 900,
            rotation: 0,
            opacity: 1
          }
        ]
      });
    }

    const sketchDoc = {
      version: 2,
      preset: isPhoto ? 'portrait' : 'free',
      width: 1200,
      height: 900,
      background: {
        id: isPhoto ? 'white' : 'dark',
        color: isPhoto ? '#FFFFFF' : '#1A1D23',
        pattern: 'grid',
        showGuides: true
      },
      layers
    };

    const title = isPhoto
      ? `Photo Study #${i + 1}`
      : isDoodle
      ? `Daily Doodle #${i + 1}`
      : `Concept Sketch #${i + 1}`;

    const description = `Synthetic test sketch description for index ${i + 1}. Used to measure memory and query latency under 100+ documents.`;

    notesToAdd.push({
      id,
      user_id: 'local_user',
      workspace_id: 'sketch',
      subproject_id: null,
      note_type: 'sketch',
      title,
      content: {
        description,
        strokes: [],
        sketchDoc,
        mode: isDoodle ? 'doodle' : 'sketch',
        entry_type: isPhoto ? 'photo' : isDoodle ? 'doodle' : 'sketch',
        sketchbook: isDoodle ? 'Doodles' : 'General',
        is_synthetic: true
      },
      is_pinned: i === 0,
      is_archived: false,
      is_deleted: false,
      sort_order: Date.now() - i * 1000,
      created_at: date,
      updated_at: date
    });

    attachmentsToAdd.push({
      id: `att_${id}`,
      note_id: id,
      type: 'sketch',
      title,
      description,
      image_data: `data:image/jpeg;base64,${dummyPhotoChunk.slice(0, 1500)}`,
      strokes: [],
      sketch_doc: sketchDoc,
      created_at: date,
      updated_at: date
    });
  }

  await db.notes.bulkAdd(notesToAdd);
  await db.attachments.bulkAdd(attachmentsToAdd);

  console.log(`[Benchmark] Successfully seeded ${count} synthetic sketches.`);
  return notesToAdd.map(n => n.id);
}

/**
 * Measures performance of Current Gallery Query vs Plain Notes Query vs Cache Query
 */
export async function runSketchBenchmark() {
  const results = {};

  // Verify sketch count
  const totalSketches = await db.notes.where('workspace_id').equals('sketch').count();
  results.totalSketchesInDb = totalSketches;

  // 1. Current Gallery Query (db.notes + db.attachments)
  const t0 = performance.now();
  const rawNotes = await db.notes
    .where('workspace_id')
    .equals('sketch')
    .filter(n => !n.is_archived && !n.is_deleted)
    .reverse()
    .sortBy('created_at');

  const attachments = await db.attachments
    .where('type')
    .equals('sketch')
    .toArray();
  const t1 = performance.now();

  const currentGalleryTimeMs = Number((t1 - t0).toFixed(2));
  const currentGalleryJson = JSON.stringify(rawNotes) + JSON.stringify(attachments);
  const currentGalleryBytes = currentGalleryJson.length;
  const currentGalleryMB = Number((currentGalleryBytes / (1024 * 1024)).toFixed(2));

  results.currentGallery = {
    timeMs: currentGalleryTimeMs,
    loadedRecords: rawNotes.length + attachments.length,
    approxPayloadMB: currentGalleryMB
  };

  // 2. Plain Notes Query (db.notes only, without attachments)
  const t2 = performance.now();
  const plainNotes = await db.notes
    .where('workspace_id')
    .equals('sketch')
    .filter(n => !n.is_archived && !n.is_deleted)
    .reverse()
    .sortBy('created_at');
  const t3 = performance.now();

  const plainNotesTimeMs = Number((t3 - t2).toFixed(2));
  const plainNotesJson = JSON.stringify(plainNotes);
  const plainNotesBytes = plainNotesJson.length;
  const plainNotesMB = Number((plainNotesBytes / (1024 * 1024)).toFixed(2));

  results.plainNotes = {
    timeMs: plainNotesTimeMs,
    loadedRecords: plainNotes.length,
    approxPayloadMB: plainNotesMB
  };

  // 3. Cache Query (from lightweight yourspace_sketch_cache)
  // Ensure cache is populated
  const cacheCount = await sketchCacheDb.sketches.count();
  if (cacheCount < rawNotes.length) {
    for (const note of rawNotes) {
      await syncSketchToCache(note.id);
    }
  }

  const t4 = performance.now();
  const cachedSketches = await sketchCacheDb.sketches
    .filter(s => !s.is_deleted && !s.is_archived)
    .reverse()
    .sortBy('created_at');
  const t5 = performance.now();

  const cacheTimeMs = Number((t5 - t4).toFixed(2));
  const cacheJson = JSON.stringify(cachedSketches);
  const cacheBytes = cacheJson.length;
  const cacheMB = Number((cacheBytes / (1024 * 1024)).toFixed(2));

  results.sketchCache = {
    timeMs: cacheTimeMs,
    loadedRecords: cachedSketches.length,
    approxPayloadMB: cacheMB
  };

  console.table({
    'Current Gallery (Notes + Attachments)': {
      'Query Time (ms)': `${results.currentGallery.timeMs} ms`,
      'Memory / Payload Size': `${results.currentGallery.approxPayloadMB} MB`,
      'Records Loaded': results.currentGallery.loadedRecords
    },
    'Plain Notes Query': {
      'Query Time (ms)': `${results.plainNotes.timeMs} ms`,
      'Memory / Payload Size': `${results.plainNotes.approxPayloadMB} MB`,
      'Records Loaded': results.plainNotes.loadedRecords
    },
    'Lightweight Cache Query': {
      'Query Time (ms)': `${results.sketchCache.timeMs} ms`,
      'Memory / Payload Size': `${results.sketchCache.approxPayloadMB} MB`,
      'Records Loaded': results.sketchCache.loadedRecords
    }
  });

  return results;
}

/**
 * Cleans synthetic sketches generated during benchmark
 */
export async function cleanSyntheticSketches() {
  const syntheticNotes = await db.notes
    .where('workspace_id')
    .equals('sketch')
    .filter(n => n.content?.is_synthetic === true)
    .toArray();

  const ids = syntheticNotes.map(n => n.id);
  if (ids.length > 0) {
    await db.notes.bulkDelete(ids);
    const atts = await db.attachments.where('note_id').anyOf(ids).toArray();
    await db.attachments.bulkDelete(atts.map(a => a.id));
    await sketchCacheDb.sketches.bulkDelete(ids);
    console.log(`[Benchmark] Cleaned ${ids.length} synthetic sketches.`);
  }
}
