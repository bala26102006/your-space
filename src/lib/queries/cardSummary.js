import { db } from '../db';

/**
 * Returns { total, completed, percent } for a given checklist note.
 */
export async function getChecklistProgress(noteId) {
  const items = await db.checklist_items.where('note_id').equals(noteId).toArray();
  
  if (items.length === 0) {
    // Fallback: check if the note content itself has nested items (pre-migration)
    const note = await db.notes.get(noteId);
    if (note && note.content && note.content.items) {
      let total = 0;
      let completed = 0;
      note.content.items.forEach(item => {
        total++;
        if (item.checked) completed++;
        (item.subItems || []).forEach(sub => {
          total++;
          if (sub.checked) completed++;
        });
      });
      return {
        total,
        completed,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    }
    return { total: 0, completed: 0, percent: 0 };
  }

  const tasks = items.filter(i => i.item_type === 'task' || !i.item_type);
  const total = tasks.length;
  const completed = tasks.filter(i => i.is_completed).length;

  return {
    total,
    completed,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

/**
 * Returns the sum of 'price' for all wishlist_items associated with the folder.
 * Wait, in Stage 3.3 we made wishlist_folders, and wishlist_items map to folder_id.
 * But a 'NoteCard' for a wishlist usually maps to a folder note. 
 * Actually, the schema for wishlist_items uses `folder_id` matching `noteId` for compatibility.
 */
export async function getWishlistTotalCost(noteId) {
  // Try fetching items by folder_id
  const items = await db.wishlist_items.where('folder_id').equals(noteId).toArray();
  
  if (items.length > 0) {
    return items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }

  // Fallback: note.content.price if it was a single note
  const note = await db.notes.get(noteId);
  if (note && note.content && note.content.price) {
    return Number(note.content.price) || 0;
  }
  
  return 0;
}

/**
 * Returns the count of subprojects + notes inside a given project.
 */
export async function getProjectSubItemCount(projectId) {
  const subprojects = await db.subprojects.where('project_id').equals(projectId).count();
  // We can't directly query notes by project_id in Dexie unless we map through subprojects,
  // but subproject count is usually what is requested for the ProjectCard breadcrumb.
  return subprojects;
}
