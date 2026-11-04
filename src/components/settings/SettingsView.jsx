import React, { useRef, useState } from 'react';
import {
  Settings,
  Download,
  Upload,
  Cloud,
  RefreshCw,
  GitBranch,
  ExternalLink,
  Copy,
  Check,
  Server,
  Database,
  ShieldCheck,
} from 'lucide-react';
import { exportJson, importJson } from '../../lib/export';
import { pushToCloud, pullFromCloud } from '../../lib/sync/syncEngine';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';

export default function SettingsView() {
  const fileInputRef = useRef(null);
  const { showToast } = useToastStore();
  const { openPermanentDelete } = useConfirmStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const githubUrl = 'https://github.com/bala26102006/your-space';
  const localUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

  const isCloudConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    !import.meta.env.VITE_SUPABASE_URL.includes('placeholder') &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('placeholder')
  );

  const handleExport = async () => {
    try {
      await exportJson();
      showToast({ message: 'Workspace exported successfully to JSON' });
    } catch (e) {
      console.error(e);
      showToast({ message: 'Export failed: ' + e.message });
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

    openPermanentDelete({
      title: 'Import Data',
      count: 1,
      onConfirm: async () => {
        try {
          await importJson(file);
          showToast({ message: 'Import successful! Refreshing...' });
          setTimeout(() => {
            window.location.reload();
          }, 800);
        } catch (err) {
          console.error(err);
          showToast({ message: 'Import failed: ' + err.message });
        }
      },
    });

    // Reset input
    e.target.value = null;
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      showToast({ message: 'Syncing with cloud...' });
      const pushRes = await pushToCloud();
      const pullRes = await pullFromCloud();
      if (pushRes?.success && pullRes?.success) {
        showToast({ message: 'Sync completed successfully' });
      } else {
        showToast({ message: 'Sync completed in local-first mode' });
      }
    } catch (err) {
      console.error('Sync error:', err);
      showToast({ message: 'Sync warning: ' + (err.message || 'Check connection') });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(githubUrl);
    setCopiedLink(true);
    showToast({ message: 'Source repository link copied to clipboard' });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-text-primary">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-text-primary leading-tight">
            Settings
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Manage your local-first workspace data, cloud connectivity, and source code.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* SECTION 1: SOURCE CODE & PROJECT CONNECT */}
        <section className="bg-card-default border border-black/5 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 mb-4">
            <div className="flex items-center gap-2.5">
              <GitBranch className="w-4 h-4 text-[var(--workspace-accent)]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                Source Code & Repository
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Connected
            </span>
          </div>

          <p className="text-xs text-text-muted leading-relaxed mb-4">
            "Your Space" is fully open-source and built with local-first IndexedDB (Dexie.js), React 18, Vite, and optional Supabase cloud synchronization.
          </p>

          <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-0.5">
                GitHub Repository
              </span>
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono font-semibold text-[var(--workspace-accent)] hover:underline truncate block"
              >
                {githubUrl}
              </a>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 rounded-lg text-xs font-medium text-text-primary transition-colors min-h-[32px]"
                title="Copy source link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>

              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--workspace-accent)] text-white hover:opacity-90 rounded-lg text-xs font-semibold transition-all min-h-[32px] shadow-xs"
                title="Open GitHub repository"
              >
                <span>View Source</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-text-muted">
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center gap-2.5">
              <Server className="w-4 h-4 text-text-muted shrink-0" />
              <div>
                <span className="font-semibold text-text-primary block">App URL</span>
                <a href={localUrl} className="text-[11px] font-mono hover:underline text-text-muted">{localUrl}</a>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center gap-2.5">
              <Database className="w-4 h-4 text-text-muted shrink-0" />
              <div>
                <span className="font-semibold text-text-primary block">Database</span>
                <span className="text-[11px]">Dexie.js v7 (IndexedDB Offline)</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: CLOUD SYNC & CONNECTIVITY */}
        <section className="bg-card-default border border-black/5 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 mb-4">
            <div className="flex items-center gap-2.5">
              <Cloud className="w-4 h-4 text-sky-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                Cloud Sync & Connectivity
              </h2>
            </div>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
              isCloudConfigured
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                : 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20'
            }`}>
              {isCloudConfigured ? 'Cloud Connected' : 'Local-First Offline'}
            </span>
          </div>

          <p className="text-xs text-text-muted leading-relaxed mb-4">
            {isCloudConfigured
              ? 'Supabase backend is configured. Changes are saved locally to IndexedDB and automatically synchronized to the cloud.'
              : 'Running in zero-latency offline mode. All your notes, routines, sketches, checklists, and calendar items stay securely on your device.'}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs min-h-[36px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </section>

        {/* SECTION 3: DATA BACKUP & RESTORE */}
        <section className="bg-card-default border border-black/5 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 mb-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                Data Management (Backup & Restore)
              </h2>
            </div>
          </div>

          <p className="text-xs text-text-muted leading-relaxed mb-6">
            Export all workspaces, folders, notes, checklist items, wishes, sketches, and habit routines to a single portable JSON file, or restore from an existing backup.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs min-h-[38px]"
            >
              <Download className="w-4 h-4" />
              <span>Export All Data to JSON</span>
            </button>

            <button
              type="button"
              onClick={handleImportClick}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-text-primary rounded-xl text-xs font-semibold transition-colors min-h-[38px]"
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
