import { db } from '../db';

/**
 * Full JSON Export of all local Dexie data
 */
export async function exportJson() {
  const data = {};
  for (const table of db.tables) {
    data[table.name] = await table.toArray();
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `YourSpace_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
