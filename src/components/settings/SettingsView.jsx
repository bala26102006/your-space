import React, { useRef } from 'react';
import { Settings, Download, Upload } from 'lucide-react';
import { exportJson, importJson } from '../../lib/export';

export default function SettingsView() {
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    try {
      await exportJson();
    } catch (e) {
      console.error(e);
      alert('Export failed: ' + e.message);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (window.confirm('Importing will overwrite existing matching records. Proceed?')) {
      try {
        await importJson(file);
        alert('Import successful! Please refresh the page to see changes.');
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Import failed: ' + err.message);
      }
    }
    
    // Reset input
    e.target.value = null;
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-text-primary" />
        <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
      </div>

      <div className="space-y-8">
        <section className="bg-card-default border border-black/5 dark:border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-text-primary border-b border-black/5 dark:border-white/10 pb-2">Data Management</h2>
          <p className="text-sm text-text-muted mb-6">
            Backup your entire workspace to a JSON file, or restore from an existing backup.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export All Data to JSON</span>
            </button>

            <button
              onClick={handleImportClick}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-bg-sidebar border border-black/10 dark:border-white/20 hover:bg-hover-bg text-text-primary rounded-lg font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Import Data from JSON</span>
            </button>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
