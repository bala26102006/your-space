import { db } from '../db';
import { generateUUID } from '../uuid';

/**
 * Log an action to the activityLog table
 * @param {Object} params
 * @param {string} params.itemId
 * @param {string} params.itemTitle
 * @param {string} params.workspace
 * @param {'moved_to_trash' | 'restored' | 'permanently_deleted' | 'archived' | 'unarchived' | 'auto_purged'} params.action
 */
export async function logActivity({ itemId, itemTitle, workspace, action }) {
  try {
    const entry = {
      id: generateUUID(),
      itemId: itemId || '',
      itemTitle: itemTitle || 'Untitled',
      workspace: workspace || 'general',
      action,
      timestamp: new Date().toISOString(),
    };
    await db.activityLog.add(entry);
    return entry;
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

/**
 * Move an item to trash (soft delete)
 */
export async function softDeleteItem({ id, type = 'note', title = 'Untitled', workspace = 'quicknotes' }) {
  const now = new Date().toISOString();
  const patch = {
    is_deleted: true,
    deleted_at: now,
    deletedAt: now,
    deletedFrom: workspace,
    updated_at: now,
  };

  if (type === 'project') {
    await db.projects.update(id, patch);
  } else if (type === 'subproject') {
    await db.subprojects.update(id, patch);
  } else {
    await db.notes.update(id, patch);
  }

  await logActivity({
    itemId: id,
    itemTitle: title,
    workspace,
    action: 'moved_to_trash',
  });
}

/**
 * Restore an item from trash
 */
export async function restoreItem({ id, type = 'note', title = 'Untitled', workspace = 'quicknotes' }) {
  const patch = {
    is_deleted: false,
    deleted_at: null,
    deletedAt: null,
    deletedFrom: null,
    updated_at: new Date().toISOString(),
  };

  if (type === 'project') {
    await db.projects.update(id, patch);
  } else if (type === 'subproject') {
    await db.subprojects.update(id, patch);
  } else {
    await db.notes.update(id, patch);
  }

  await logActivity({
    itemId: id,
    itemTitle: title,
    workspace,
    action: 'restored',
  });
}

/**
 * Permanently delete an item
 */
export async function permanentDeleteItem({ id, type = 'note', title = 'Untitled', workspace = 'quicknotes' }) {
  if (type === 'project') {
    // Cascade delete subprojects and notes under this project
    const subprojects = await db.subprojects.where('project_id').equals(id).toArray();
    for (const sp of subprojects) {
      await db.notes.where('subproject_id').equals(sp.id).delete();
      await db.subprojects.delete(sp.id);
    }
    await db.projects.delete(id);
  } else if (type === 'subproject') {
    await db.notes.where('subproject_id').equals(id).delete();
    await db.subprojects.delete(id);
  } else {
    // Delete note and any related attachments or checklist items
    await db.attachments.where('note_id').equals(id).delete();
    await db.checklist_items.where('note_id').equals(id).delete();
    await db.routine_entries.where('note_id').equals(id).delete();
    await db.notes.delete(id);
  }

  await logActivity({
    itemId: id,
    itemTitle: title,
    workspace,
    action: 'permanently_deleted',
  });
}

/**
 * Archive an item
 */
export async function archiveItem({ id, type = 'note', title = 'Untitled', workspace = 'quicknotes' }) {
  const now = new Date().toISOString();
  const patch = {
    is_archived: true,
    archivedAt: now,
    updated_at: now,
  };

  if (type === 'project') {
    await db.projects.update(id, patch);
  } else if (type === 'subproject') {
    await db.subprojects.update(id, patch);
  } else {
    await db.notes.update(id, patch);
  }

  await logActivity({
    itemId: id,
    itemTitle: title,
    workspace,
    action: 'archived',
  });
}

/**
 * Unarchive an item
 */
export async function unarchiveItem({ id, type = 'note', title = 'Untitled', workspace = 'quicknotes' }) {
  const patch = {
    is_archived: false,
    archivedAt: null,
    updated_at: new Date().toISOString(),
  };

  if (type === 'project') {
    await db.projects.update(id, patch);
  } else if (type === 'subproject') {
    await db.subprojects.update(id, patch);
  } else {
    await db.notes.update(id, patch);
  }

  await logActivity({
    itemId: id,
    itemTitle: title,
    workspace,
    action: 'unarchiveItem',
    action: 'unarchived',
  });
}

/**
 * Automatically purge soft-deleted items older than 7 days
 */
export async function autoPurgeOldTrash() {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - SEVEN_DAYS_MS;

  const isOld = (item) => {
    const deletedTimeStr = item.deletedAt || item.deleted_at;
    if (!deletedTimeStr) return false;
    const itemTime = new Date(deletedTimeStr).getTime();
    return !isNaN(itemTime) && itemTime < cutoffTime;
  };

  try {
    // Check notes
    const allDeletedNotes = await db.notes.filter(n => Boolean(n.is_deleted)).toArray();
    for (const note of allDeletedNotes) {
      if (isOld(note)) {
        await permanentDeleteItem({
          id: note.id,
          type: 'note',
          title: note.title || 'Untitled note',
          workspace: note.workspace_id || 'quicknotes',
        });
        await logActivity({
          itemId: note.id,
          itemTitle: note.title || 'Untitled note',
          workspace: note.workspace_id || 'quicknotes',
          action: 'auto_purged',
        });
      }
    }

    // Check projects
    const allDeletedProjects = await db.projects.filter(p => Boolean(p.is_deleted)).toArray();
    for (const proj of allDeletedProjects) {
      if (isOld(proj)) {
        await permanentDeleteItem({
          id: proj.id,
          type: 'project',
          title: proj.title || 'Untitled project',
          workspace: 'projects',
        });
        await logActivity({
          itemId: proj.id,
          itemTitle: proj.title || 'Untitled project',
          workspace: 'projects',
          action: 'auto_purged',
        });
      }
    }

    // Check subprojects
    const allDeletedSubprojects = await db.subprojects.filter(sp => Boolean(sp.is_deleted)).toArray();
    for (const sp of allDeletedSubprojects) {
      if (isOld(sp)) {
        await permanentDeleteItem({
          id: sp.id,
          type: 'subproject',
          title: sp.title || 'Untitled subproject',
          workspace: 'projects',
        });
        await logActivity({
          itemId: sp.id,
          itemTitle: sp.title || 'Untitled subproject',
          workspace: 'projects',
          action: 'auto_purged',
        });
      }
    }
  } catch (err) {
    console.error('Error during auto-purge of old trash:', err);
  }
}
