import { db } from '../db';
import { supabase } from '../supabaseClient';

// Debounce timer for push operations
let pushTimer = null;
const PUSH_DEBOUNCE_MS = 1000;

/**
 * Pushes local changes to Supabase
 * Handles 1-second debounce and offline queue retry
 */
export async function pushToCloud() {
  if (pushTimer) {
    clearTimeout(pushTimer);
  }

  return new Promise((resolve) => {
    pushTimer = setTimeout(async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) {
          console.warn('Sync failed: No active session');
          return resolve({ success: false, error: 'No session' });
        }

        const queue = await db.sync_queue.toArray();
        if (queue.length === 0) {
          return resolve({ success: true, message: 'Nothing to sync' });
        }

        // Process queue (simplified: in a real app, group by table/action)
        for (const item of queue) {
          if (item.action === 'INSERT' || item.action === 'UPDATE') {
            const record = await db[item.table_name].get(item.record_id);
            if (record) {
              const { error } = await supabase
                .from(item.table_name)
                .upsert(record);
              if (!error) {
                await db.sync_queue.delete(item.id);
              } else {
                console.error('Sync upsert error:', error);
              }
            }
          } else if (item.action === 'DELETE') {
            const { error } = await supabase
              .from(item.table_name)
              .delete()
              .eq('id', item.record_id);
            if (!error) {
              await db.sync_queue.delete(item.id);
            }
          }
        }
        
        resolve({ success: true });
      } catch (error) {
        console.error('Push to cloud error:', error);
        resolve({ success: false, error });
      }
    }, PUSH_DEBOUNCE_MS);
  });
}

/**
 * Pulls changes from Supabase (pull-on-load strategy)
 */
export async function pullFromCloud() {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      return { success: false, error: 'No session' };
    }

    const tablesToSync = ['projects', 'subprojects', 'notes', 'tags', 'note_tags', 'attachments', 'checklist_items', 'wishlist_items', 'routine_entries'];
    
    for (const table of tablesToSync) {
      // Simplistic pull: grab everything updated since local max updated_at
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`Error pulling ${table}:`, error);
        continue;
      }
      if (data && data.length > 0) {
        await db[table].bulkPut(data);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Pull from cloud error:', error);
    return { success: false, error };
  }
}
