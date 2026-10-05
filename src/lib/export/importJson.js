import { db } from '../db';

/**
 * Full JSON Import to restore local Dexie data
 */
export async function importJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        for (const tableName of Object.keys(data)) {
          if (db[tableName]) {
            await db[tableName].clear();
            await db[tableName].bulkAdd(data[tableName]);
          }
        }
        resolve(true);
      } catch (err) {
        console.error('Import failed', err);
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}
