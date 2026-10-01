import Dexie from 'dexie';

export const db = new Dexie('YourSpaceDB');

db.version(1).stores({
  workspaces: 'id, label, icon, sort_order',
  projects: 'id, user_id, is_archived, is_deleted, sort_order, updated_at',
  subprojects: 'id, project_id, is_archived, is_deleted, sort_order, updated_at',
  notes: 'id, workspace_id, subproject_id, note_type, is_pinned, is_archived, is_deleted, entry_date, sort_order, updated_at',
  tags: 'id, user_id, label',
  note_tags: '[note_id+tag_id], note_id, tag_id',
  attachments: 'id, note_id, type',
  checklist_items: 'id, note_id, sort_order',
  wishlist_items: 'id, note_id, sort_order',
  routine_entries: 'id, note_id, entry_date',
  ai_memory: 'id, scope_id, action',
  sync_queue: '++id, table_name, record_id, action, created_at'
});

db.version(2).stores({
  notes: 'id, workspace_id, subproject_id, note_type, is_pinned, is_archived, is_deleted, entry_date, sort_order, updated_at, category',
  checklist_items: 'id, note_id, parent_item_id, sort_order, due_date, is_completed',
});

db.version(3).stores({
  checklist_items: 'id, note_id, parent_item_id, sort_order, due_date, is_completed, item_type',
});

db.version(4).stores({
  wishlist_folders: 'id, name, sort_order',
  wishlist_items: 'id, folder_id, name, url, price, priority, note, image_url, is_completed, *tags, sort_order'
});

db.version(5).stores({
  workspaces: 'id, label, icon, sort_order',
  projects: 'id, title, color, is_archived, is_deleted, deleted_at, sort_order, updated_at',
  subprojects: 'id, project_id, title, sort_order, is_deleted, deleted_at',
  notes: 'id, workspace_id, subproject_id, note_type, title, is_pinned, is_archived, is_deleted, deleted_at, updated_at',
  tags: 'id, label, color',
  note_tags: '[note_id+tag_id], note_id, tag_id',
  checklist_items: 'id, note_id, item_type, parent_item_id, sort_order, due_date, is_completed',
  wishlist_items: 'id, note_id, name, price, priority, is_completed, folder_id',
  routine_entries: 'id, note_id, entry_date, is_completed, streak_count',
  ai_memory: 'id, scope_id, action',
  wishlist_folders: 'id, name, sort_order', // Kept for backward compatibility
  sync_queue: '++id, table_name, record_id, action, created_at'
});

db.on('populate', () => {
  db.workspaces.bulkAdd([
    { id: 'quicknotes', label: 'Quick Notes', icon: 'StickyNote', sort_order: 1 },
    { id: 'projects', label: 'Projects', icon: 'FolderKanban', sort_order: 2 },
    { id: 'journal', label: 'Journal', icon: 'BookOpen', sort_order: 3 },
    { id: 'checklists', label: 'Checklists', icon: 'CheckSquare', sort_order: 4 },
    { id: 'wishlist', label: 'Wish List', icon: 'Sparkles', sort_order: 5 },
    { id: 'routines', label: 'Routines', icon: 'Repeat', sort_order: 6 },
    { id: 'sketch', label: 'Sketch', icon: 'Palette', sort_order: 7 },
  ]);
});

// Helper to ensure database is seeded even on hot-reload/existing DBs without table populate
export async function initWorkspaces() {
  const count = await db.workspaces.count();
  if (count === 0) {
    await db.workspaces.bulkAdd([
      { id: 'quicknotes', label: 'Quick Notes', icon: 'StickyNote', sort_order: 1 },
      { id: 'projects', label: 'Projects', icon: 'FolderKanban', sort_order: 2 },
      { id: 'journal', label: 'Journal', icon: 'BookOpen', sort_order: 3 },
      { id: 'checklists', label: 'Checklists', icon: 'CheckSquare', sort_order: 4 },
      { id: 'wishlist', label: 'Wish List', icon: 'Sparkles', sort_order: 5 },
      { id: 'routines', label: 'Routines', icon: 'Repeat', sort_order: 6 },
      { id: 'sketch', label: 'Sketch', icon: 'Palette', sort_order: 7 },
    ]);
  }
}

const SYNCED_TABLES = [
  'projects', 'subprojects', 'notes', 'tags', 'note_tags',
  'attachments', 'checklist_items', 'wishlist_folders', 'wishlist_items', 'routine_entries'
];

SYNCED_TABLES.forEach(tableName => {
  db[tableName].hook('creating', function (primKey, obj, transaction) {
    transaction.on('complete', () => {
      db.sync_queue.add({
        table_name: tableName,
        record_id: primKey,
        action: 'INSERT',
        created_at: new Date().toISOString()
      }).catch(console.error);
    });
  });

  db[tableName].hook('updating', function (mods, primKey, obj, transaction) {
    transaction.on('complete', () => {
      db.sync_queue.add({
        table_name: tableName,
        record_id: primKey,
        action: 'UPDATE',
        created_at: new Date().toISOString()
      }).catch(console.error);
    });
  });

  db[tableName].hook('deleting', function (primKey, obj, transaction) {
    transaction.on('complete', () => {
      db.sync_queue.add({
        table_name: tableName,
        record_id: primKey,
        action: 'DELETE',
        created_at: new Date().toISOString()
      }).catch(console.error);
    });
  });
});

