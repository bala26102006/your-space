import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';

export function useTags() {
  const tags = useLiveQuery(() => db.tags.toArray(), []) || [];

  const addTag = async (label) => {
    const cleanLabel = label.trim().replace(/^#/, '');
    if (!cleanLabel) return null;

    const existing = await db.tags.where('label').equals(cleanLabel).first();
    if (existing) return existing;

    const id = crypto.randomUUID();
    const newTag = {
      id,
      label: cleanLabel,
      color: '#5F6368',
      created_at: new Date().toISOString(),
    };
    await db.tags.add(newTag);
    return newTag;
  };

  const getTagsForNote = async (noteId) => {
    const noteTags = await db.note_tags.where('note_id').equals(noteId).toArray();
    const tagIds = noteTags.map((nt) => nt.tag_id);
    return await db.tags.where('id').anyOf(tagIds).toArray();
  };

  const toggleNoteTag = async (noteId, tagId) => {
    const existing = await db.note_tags.get([noteId, tagId]);
    if (existing) {
      await db.note_tags.delete([noteId, tagId]);
    } else {
      await db.note_tags.add({ note_id: noteId, tag_id: tagId });
    }
  };

  return {
    tags,
    addTag,
    getTagsForNote,
    toggleNoteTag,
  };
}
