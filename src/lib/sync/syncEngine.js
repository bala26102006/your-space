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
        const isConfigured =
          import.meta.env.VITE_SUPABASE_URL &&
          !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
          import.meta.env.VITE_SUPABASE_ANON_KEY &&
          !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('placeholder');

        if (!isConfigured) {
          return resolve({ success: true, message: 'Local-first offline mode' });
        }

        const queue = await db.syncQueue.toArray();
        if (queue.length === 0) {
          return resolve({ success: true, message: 'Nothing to sync' });
        }

        // Process queue
        for (const item of queue) {
          if (!db[item.table_name]) {
            await db.syncQueue.delete(item.id);
            continue;
          }

          if (item.action === 'INSERT' || item.action === 'UPDATE') {
            const record = await db[item.table_name].get(item.record_id);
            if (record) {
              const { error } = await supabase
                .from(item.table_name)
                .upsert(record);
              if (!error) {
                await db.syncQueue.delete(item.id);
              } else {
                console.warn('Sync upsert warning:', error.message || error);
              }
            } else {
              // Record no longer exists locally, safe to remove from queue
              await db.syncQueue.delete(item.id);
            }
          } else if (item.action === 'DELETE') {
            const { error } = await supabase
              .from(item.table_name)
              .delete()
              .eq('id', item.record_id);
            if (!error) {
              await db.syncQueue.delete(item.id);
            }
          }
        }
        
        resolve({ success: true });
      } catch (error) {
        console.warn('Push to cloud warning:', error.message || error);
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
    const isConfigured =
      import.meta.env.VITE_SUPABASE_URL &&
      !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('placeholder');

    if (!isConfigured) {
      return { success: true, message: 'Local-first offline mode' };
    }

    const tablesToSync = ['projects', 'subprojects', 'notes', 'tags', 'note_tags', 'checklist_items', 'wishlist_items', 'wishlist_folders', 'routine_entries', 'attachments'];
    
    for (const table of tablesToSync) {
      // Simplistic pull: grab everything for the user
      // A more robust implementation would fetch only items since last_synced_at
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`Error pulling ${table}:`, error);
        continue;
      }
      
      if (data && data.length > 0) {
        // Implement Conflict resolution: Last-write-wins by updated_at timestamp
        const localRecords = await db[table].toArray();
        const localMap = new Map(localRecords.map(r => [r.id || r.note_id + '-' + r.tag_id, r]));
        
        const recordsToUpdate = [];
        
        for (const cloudRecord of data) {
          const key = cloudRecord.id || cloudRecord.note_id + '-' + cloudRecord.tag_id;
          const localRecord = localMap.get(key);
          
          if (!localRecord) {
            recordsToUpdate.push(cloudRecord);
          } else if (cloudRecord.updated_at && localRecord.updated_at) {
            const cloudDate = new Date(cloudRecord.updated_at);
            const localDate = new Date(localRecord.updated_at);
            if (cloudDate > localDate) {
              recordsToUpdate.push(cloudRecord);
            }
          } else {
            // No updated_at field, favor cloud data by default
            recordsToUpdate.push(cloudRecord);
          }
        }
        
        if (recordsToUpdate.length > 0) {
          await db[table].bulkPut(recordsToUpdate);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Pull from cloud error:', error);
    return { success: false, error };
  }
}
