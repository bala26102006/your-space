import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { db } from '../db';

/**
 * Export a text string to PDF using jsPDF
 */
export async function exportToPDF(title, content) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title, 20, 20);
  
  doc.setFontSize(12);
  const lines = doc.splitTextToSize(content || '', 170);
  doc.text(lines, 20, 30);
  
  doc.save(`${title || 'Document'}.pdf`);
}

/**
 * Export a text string to Word using docx
 */
export async function exportToWord(title, content) {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: 32, // half-points
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun(content || ''),
          ],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title || 'Document'}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Full JSON Export of all local Dexie data
 */
export async function exportBackup() {
  const data = {};
  for (const table of db.tables) {
    data[table.name] = await table.toArray();
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `YourSpace_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Full JSON Import to restore local Dexie data
 */
export async function importBackup(file) {
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
