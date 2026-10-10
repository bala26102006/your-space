import React, { useState } from 'react';
import {
  Trash2,
  RefreshCw,
  Clock,
  CheckSquare,
  Square,
  AlertOctagon,
  History,
  Archive,
  StickyNote,
  FolderKanban,
  BookOpen,
  Sparkles,
  Repeat,
  Palette,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import { restoreItem, permanentDeleteItem, logActivity } from '../../lib/services/trashService';
import { useConfirmStore } from '../../store/confirmStore';

const WORKSPACE_ICONS = {
  quicknotes: { icon: StickyNote, label: 'Quick Notes', color: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
  projects: { icon: FolderKanban, label: 'Projects', color: 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  journal: { icon: BookOpen, label: 'Journal', color: 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' },
  checklists: { icon: CheckSquare, label: 'Checklists', color: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  wishlist: { icon: Sparkles, label: 'Wish List', color: 'text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20' },
  routines: { icon: Repeat, label: 'Routines', color: 'text-sky-500 dark:text-sky-400 bg-sky-500/10 border-sky-500/20' },
  sketch: { icon: Palette, label: 'Sketch', color: 'text-orange-500 dark:text-orange-400 bg-orange-500/10 border-orange-500/20' },
};

export default function TrashView() {
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'history'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const { openPermanentDelete } = useConfirmStore();

  // 1. Fetch deleted items
  const deletedNotes = useLiveQuery(
    () => db.notes.filter(n => Boolean(n.is_deleted)).toArray(),
    []
  ) || [];

  const deletedProjects = useLiveQuery(
    () => db.projects.filter(p => Boolean(p.is_deleted)).toArray(),
    []
  ) || [];

  const deletedSubprojects = useLiveQuery(
    () => db.subprojects.filter(sp => Boolean(sp.is_deleted)).toArray(),
    []
  ) || [];

  // 2. Fetch activity log
  const activities = useLiveQuery(
    () => db.activityLog.toArray(),
    []
  ) || [];

  const sortedActivities = React.useMemo(() => {
    return [...activities].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [activities]);

  // Combine and normalize trashed items
  const trashedItems = React.useMemo(() => {
    const list = [
      ...deletedNotes.map((n) => ({
        id: n.id,
        type: 'note',
        title: n.title || 'Untitled note',
        workspace: n.workspace_id || n.deletedFrom || 'quicknotes',
        deletedAt: n.deletedAt || n.deleted_at,
        raw: n,
      })),
      ...deletedProjects.map((p) => ({
        id: p.id,
        type: 'project',
        title: p.title || 'Untitled project',
        workspace: 'projects',
        deletedAt: p.deletedAt || p.deleted_at,
        raw: p,
      })),
      ...deletedSubprojects.map((sp) => ({
        id: sp.id,
        type: 'subproject',
        title: sp.title || 'Untitled subproject',
        workspace: 'projects',
        deletedAt: sp.deletedAt || sp.deleted_at,
        raw: sp,
      })),
    ];

    return list.sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));
  }, [deletedNotes, deletedProjects, deletedSubprojects]);

  const getDaysLeft = (deletedAtStr) => {
    if (!deletedAtStr) return 7;
    const diffMs = Date.now() - new Date(deletedAtStr).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - diffDays);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  // Selection handlers
  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === trashedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(trashedItems.map((i) => i.id)));
    }
  };

  // Single Item Actions
  const handleRestore = async (item) => {
    await restoreItem({
      id: item.id,
      type: item.type,
      title: item.title,
      workspace: item.workspace,
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
  };

  const handleDeleteForever = (item) => {
    openPermanentDelete({
      title: item.title,
      count: 1,
      onConfirm: async () => {
        await permanentDeleteItem({
          id: item.id,
          type: item.type,
          title: item.title,
          workspace: item.workspace,
        });
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      },
    });
  };

  // Bulk Actions
  const handleRestoreSelected = async () => {
    const selectedItems = trashedItems.filter((i) => selectedIds.has(i.id));
    for (const item of selectedItems) {
      await restoreItem({
        id: item.id,
        type: item.type,
        title: item.title,
        workspace: item.workspace,
      });
    }
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    openPermanentDelete({
      count,
      onConfirm: async () => {
        const selectedItems = trashedItems.filter((i) => selectedIds.has(i.id));
        for (const item of selectedItems) {
          await permanentDeleteItem({
            id: item.id,
            type: item.type,
            title: item.title,
            workspace: item.workspace,
          });
        }
        setSelectedIds(new Set());
      },
    });
  };

  const handleEmptyTrash = () => {
    const count = trashedItems.length;
    if (count === 0) return;
    openPermanentDelete({
      count,
      title: 'all items in Trash',
      onConfirm: async () => {
        for (const item of trashedItems) {
          await permanentDeleteItem({
            id: item.id,
            type: item.type,
            title: item.title,
            workspace: item.workspace,
          });
        }
        setSelectedIds(new Set());
      },
    });
  };

  const handleClearHistory = () => {
    openPermanentDelete({
      title: 'deletion activity history',
      count: sortedActivities.length,
      onConfirm: async () => {
        await db.activityLog.clear();
      },
    });
  };

  const renderActionBadge = (action) => {
    switch (action) {
      case 'moved_to_trash':
        return {
          icon: Trash2,
          label: 'Moved to Trash',
          color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        };
      case 'restored':
        return {
          icon: RefreshCw,
          label: 'Restored',
          color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'permanently_deleted':
      case 'auto_purged':
        return {
          icon: AlertOctagon,
          label: action === 'auto_purged' ? 'Auto-Purged (7d)' : 'Permanently Deleted',
          color: 'text-red-500 bg-red-500/10 border-red-500/20',
        };
      case 'archived':
        return {
          icon: Archive,
          label: 'Archived',
          color: 'text-stone-500 bg-stone-500/10 border-stone-500/20',
        };
      case 'unarchived':
        return {
          icon: CheckCircle2,
          label: 'Unarchived',
          color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        };
      default:
        return {
          icon: History,
          label: action,
          color: 'text-text-muted bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10',
        };
    }
  };

  return (
    <div className="space-y-6 pb-16 min-w-0">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 min-w-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-text-primary capitalize leading-tight">
              Trash
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 uppercase tracking-wider">
              {trashedItems.length} {trashedItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="h-0.5 w-8 rounded-full bg-red-500 mt-1.5" />
          <p className="text-xs text-text-muted mt-1">
            Items are permanently deleted automatically after 7 days
          </p>
        </div>

        {/* Top Actions: Tabs & Empty Trash */}
        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-black/5 dark:bg-white/5 rounded-button border border-black/5 dark:border-white/10 text-xs">
            <button
              onClick={() => setActiveTab('items')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-button font-medium transition-colors ${
                activeTab === 'items'
                  ? 'bg-bg-primary text-text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Trash Items</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-button font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-bg-primary text-text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
              {sortedActivities.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-black/10 dark:bg-white/10">
                  {sortedActivities.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'items' && trashedItems.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-button border border-red-500/20 transition-colors"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Empty Trash</span>
            </button>
          )}

          {activeTab === 'history' && sortedActivities.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-button transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Trash Items View */}
      {activeTab === 'items' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Bulk Selection Bar */}
          {trashedItems.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2.5 mb-3 bg-card-default border border-black/5 dark:border-white/10 rounded-lg text-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={selectAll}
                  className="flex items-center gap-1.5 text-text-muted hover:text-text-primary font-medium"
                >
                  {selectedIds.size === trashedItems.length && trashedItems.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-red-500" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span>
                    {selectedIds.size > 0
                      ? `${selectedIds.size} of ${trashedItems.length} selected`
                      : 'Select All'}
                  </span>
                </button>
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRestoreSelected}
                    className="flex items-center gap-1 px-2.5 py-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded font-medium transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Restore Selected ({selectedIds.size})</span>
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1 px-2.5 py-1 text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded font-medium transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedIds.size})</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Trashed Items List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {trashedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-card-default rounded-xl border border-black/5 dark:border-white/10">
                <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-3">
                  <Trash2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-text-primary">Trash is empty</h3>
                <p className="text-xs text-text-muted max-w-sm mt-1">
                  Deleted notes, projects, and items stay here for 7 days before being permanently purged.
                </p>
              </div>
            ) : (
              trashedItems.map((item) => {
                const wsMeta = WORKSPACE_ICONS[item.workspace] || WORKSPACE_ICONS.quicknotes;
                const WsIcon = wsMeta.icon;
                const daysLeft = getDaysLeft(item.deletedAt);
                const isSelected = selectedIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3.5 bg-card-default border rounded-xl transition-all duration-150 ${
                      isSelected
                        ? 'border-red-500/50 ring-1 ring-red-500/30 bg-red-500/5'
                        : 'border-black/5 dark:border-white/10 hover:border-black/15 dark:hover:border-white/20'
                    }`}
                  >
                    {/* Left: Checkbox + Workspace Badge + Title */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className="text-text-muted hover:text-text-primary shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-red-500" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      {/* Workspace Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${wsMeta.color}`}
                      >
                        <WsIcon className="w-3 h-3" />
                        <span>{wsMeta.label}</span>
                      </span>

                      {/* Title & Type */}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-text-primary truncate">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                          <span>Deleted on {formatDate(item.deletedAt)}</span>
                          <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                            <Clock className="w-3 h-3" />
                            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <button
                        onClick={() => handleRestore(item)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                        title="Restore to original workspace"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => handleDeleteForever(item)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete forever</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Deletion Activity History Timeline */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto pr-1">
          {sortedActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-card-default rounded-xl border border-black/5 dark:border-white/10">
              <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/5 text-text-muted flex items-center justify-center mb-3">
                <History className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-text-primary">No activity recorded yet</h3>
              <p className="text-xs text-text-muted max-w-sm mt-1">
                Actions like deleting, archiving, or restoring items will be chronologically tracked here.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-black/10 dark:before:bg-white/10">
              {sortedActivities.map((act) => {
                const badge = renderActionBadge(act.action);
                const BadgeIcon = badge.icon;
                const wsMeta = WORKSPACE_ICONS[act.workspace] || WORKSPACE_ICONS.quicknotes;

                return (
                  <div key={act.id} className="relative flex items-start gap-3 text-xs">
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center border shadow-xs ${badge.color}`}
                    >
                      <BadgeIcon className="w-2.5 h-2.5" />
                    </div>

                    {/* Timeline Content Card */}
                    <div className="flex-1 p-3 bg-card-default border border-black/5 dark:border-white/10 rounded-xl">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          <span className="font-semibold text-text-primary text-sm">
                            {act.itemTitle || 'Untitled'}
                          </span>
                        </div>
                        <span className="text-[11px] text-text-muted">
                          {formatDate(act.timestamp)} {formatTime(act.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-text-muted mt-1.5">
                        <span className="flex items-center gap-1">
                          Workspace:
                          <span className="font-medium text-text-secondary capitalize">
                            {wsMeta.label || act.workspace}
                          </span>
                        </span>
                        {act.itemId && (
                          <span className="text-[10px] font-mono opacity-60">
                            (ID: {act.itemId.slice(0, 8)}...)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
