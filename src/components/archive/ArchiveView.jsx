import React from 'react';
import {
  Archive,
  Trash2,
  RefreshCw,
  StickyNote,
  FolderKanban,
  BookOpen,
  CheckSquare,
  Sparkles,
  Repeat,
  Palette,
  ArrowUpRight,
} from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import { unarchiveItem, softDeleteItem } from '../../lib/services/trashService';
import { useConfirmStore } from '../../store/confirmStore';

const WORKSPACE_DEFINITIONS = [
  { id: 'quicknotes', label: 'Quick Notes', icon: StickyNote, color: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { id: 'projects', label: 'Projects', icon: FolderKanban, color: 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  { id: 'journal', label: 'Journal', icon: BookOpen, color: 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' },
  { id: 'checklists', label: 'Checklists', icon: CheckSquare, color: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'wishlist', label: 'Wish List', icon: Sparkles, color: 'text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { id: 'routines', label: 'Routines', icon: Repeat, color: 'text-sky-500 dark:text-sky-400 bg-sky-500/10 border-sky-500/20' },
  { id: 'sketch', label: 'Sketch', icon: Palette, color: 'text-orange-500 dark:text-orange-400 bg-orange-500/10 border-orange-500/20' },
];

export default function ArchiveView() {
  const { openSoftDelete } = useConfirmStore();

  // Fetch archived items
  const archivedNotes = useLiveQuery(
    () => db.notes.filter(n => Boolean(n.is_archived)).toArray(),
    []
  ) || [];

  const archivedProjects = useLiveQuery(
    () => db.projects.filter(p => Boolean(p.is_archived)).toArray(),
    []
  ) || [];

  const archivedSubprojects = useLiveQuery(
    () => db.subprojects.filter(sp => Boolean(sp.is_archived)).toArray(),
    []
  ) || [];

  // Combine items
  const allArchived = React.useMemo(() => {
    return [
      ...archivedNotes.map((n) => ({
        id: n.id,
        type: 'note',
        title: n.title || 'Untitled note',
        workspace: n.workspace_id || 'quicknotes',
        content: n.content,
        archivedAt: n.archivedAt || n.updated_at,
        raw: n,
      })),
      ...archivedProjects.map((p) => ({
        id: p.id,
        type: 'project',
        title: p.title || 'Untitled project',
        workspace: 'projects',
        content: p.description,
        archivedAt: p.archivedAt || p.updated_at,
        raw: p,
      })),
      ...archivedSubprojects.map((sp) => ({
        id: sp.id,
        type: 'subproject',
        title: sp.title || 'Untitled subproject',
        workspace: 'projects',
        content: null,
        archivedAt: sp.archivedAt || sp.updated_at,
        raw: sp,
      })),
    ];
  }, [archivedNotes, archivedProjects, archivedSubprojects]);

  // Group by workspace
  const groupedItems = React.useMemo(() => {
    const groups = {};
    WORKSPACE_DEFINITIONS.forEach((ws) => {
      groups[ws.id] = [];
    });

    allArchived.forEach((item) => {
      const wsId = groups[item.workspace] ? item.workspace : 'quicknotes';
      groups[wsId].push(item);
    });

    return groups;
  }, [allArchived]);

  const handleUnarchive = async (item) => {
    await unarchiveItem({
      id: item.id,
      type: item.type,
      title: item.title,
      workspace: item.workspace,
    });
  };

  const handleMoveToTrash = (item) => {
    openSoftDelete({
      title: item.title,
      count: 1,
      onConfirm: async () => {
        // First unarchive to clean state, then soft delete
        await unarchiveItem({
          id: item.id,
          type: item.type,
          title: item.title,
          workspace: item.workspace,
        });
        await softDeleteItem({
          id: item.id,
          type: item.type,
          title: item.title,
          workspace: item.workspace,
        });
      },
    });
  };

  const getPreviewText = (content) => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (content.content && Array.isArray(content.content)) {
      const extract = (node) => {
        if (!node) return '';
        if (node.text) return node.text;
        if (node.content && Array.isArray(node.content)) {
          return node.content.map(extract).join(' ');
        }
        return '';
      };
      return extract(content).trim();
    }
    return '';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative min-w-0">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 min-w-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-text-primary capitalize leading-tight">
              Archive
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/20 uppercase tracking-wider">
              {allArchived.length} {allArchived.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="h-0.5 w-8 rounded-full bg-stone-500 mt-1.5" />
          <p className="text-xs text-text-muted mt-1">
            Archived notes and projects grouped by their original workspaces
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-8 pr-1 pb-12">
        {allArchived.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-card-default rounded-xl border border-black/5 dark:border-white/10">
            <div className="w-14 h-14 rounded-full bg-stone-500/10 text-stone-500 flex items-center justify-center mb-3">
              <Archive className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-text-primary">Archive is empty</h3>
            <p className="text-xs text-text-muted max-w-sm mt-1">
              Items archived from any workspace will be safely stored here, grouped by workspace.
            </p>
          </div>
        ) : (
          WORKSPACE_DEFINITIONS.map((ws) => {
            const items = groupedItems[ws.id] || [];
            if (items.length === 0) return null;
            const WsIcon = ws.icon;

            return (
              <div key={ws.id} className="space-y-3">
                {/* Workspace Group Header */}
                <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg border ${ws.color}`}>
                      <WsIcon className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                      {ws.label}
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-text-muted">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => {
                    const preview = getPreviewText(item.content);

                    return (
                      <div
                        key={item.id}
                        className="group flex flex-col justify-between p-4 bg-card-default border border-black/5 dark:border-white/10 hover:border-black/15 dark:hover:border-white/20 rounded-xl transition-all duration-150 hover:shadow-card-hover"
                      >
                        {/* Top: Title & Preview */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="text-sm font-semibold text-text-primary line-clamp-1">
                              {item.title}
                            </h4>
                            <span className="text-[10px] text-text-muted shrink-0 pt-0.5">
                              {formatDate(item.archivedAt)}
                            </span>
                          </div>

                          {preview ? (
                            <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">
                              {preview}
                            </p>
                          ) : (
                            <p className="text-xs text-text-muted/60 italic">
                              No preview content
                            </p>
                          )}
                        </div>

                        {/* Bottom: Action Buttons */}
                        <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                          <button
                            onClick={() => handleUnarchive(item)}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
                            title="Restore back to workspace"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Unarchive</span>
                          </button>

                          <button
                            onClick={() => handleMoveToTrash(item)}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Move to trash"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Move to Trash</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
