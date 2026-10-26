import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Square, 
  MoreVertical, 
  Pin, 
  Copy, 
  FolderInput, 
  Archive, 
  Trash2, 
  Check, 
  Clock, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { 
  isItemCompleted, 
  getDueDateStatus, 
  toggleChecklistItemCompletion 
} from '../../lib/checklists/checklistUtils';

export default function ChecklistCard({
  note,
  items = [],
  allFolders = [],
  onSelect,
  onPinToggle,
  onDuplicate,
  onMoveToFolder,
  onArchive,
  onDelete,
  isListView = false
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setShowFolderSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  // Task metrics
  const { totalTasks, completedTasks, openTasks, percent, isAllDone, rootOpenPreviews } = useMemo(() => {
    const tasks = items.filter(i => i.item_type === 'task' || !i.item_type);
    const total = tasks.length;
    const completed = tasks.filter(i => isItemCompleted(i)).length;
    const open = total - completed;
    const p = total > 0 ? Math.round((completed / total) * 100) : 0;
    const allDone = total > 0 && completed === total;

    // Card preview: only root-level open tasks (not sub-items)
    const previews = tasks
      .filter(i => !i.parent_item_id && !isItemCompleted(i))
      .slice(0, 3);

    return {
      totalTasks: total,
      completedTasks: completed,
      openTasks: open,
      percent: p,
      isAllDone: allDone,
      rootOpenPreviews: previews
    };
  }, [items]);

  // Due date resolution
  const due = getDueDateStatus(note.content?.dueDate);

  // Handle Quick Tick from Preview
  const handleQuickTick = async (e, item) => {
    e.stopPropagation();
    await toggleChecklistItemCompletion(item.id, true);
  };

  // SVG Progress Ring calculations (Size: 42px, stroke: 4px)
  const ringSize = 42;
  const strokeWidth = 4;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  // -------------------------------------------------------------
  // LIST VIEW LAYOUT (Compact Row)
  // -------------------------------------------------------------
  if (isListView) {
    return (
      <div
        onClick={onSelect}
        className={`group relative p-3 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 bg-surface-card border-[var(--border-color)] hover:border-[var(--accent)]/40 hover:shadow-md ${
          isAllDone ? 'opacity-85' : ''
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Progress Ring / Checkbox */}
          <div className="relative shrink-0 flex items-center justify-center">
            {isAllDone ? (
              <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--btn-fg)] flex items-center justify-center shadow-xs">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            ) : (
              <svg width={32} height={32} className="transform -rotate-90">
                <circle
                  cx={16}
                  cy={16}
                  r={12}
                  className="stroke-black/10 dark:stroke-white/10"
                  strokeWidth={3}
                  fill="transparent"
                />
                <circle
                  cx={16}
                  cy={16}
                  r={12}
                  className="stroke-[var(--accent)] transition-all duration-300"
                  strokeWidth={3}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{
                    strokeDasharray: 2 * Math.PI * 12,
                    strokeDashoffset: (2 * Math.PI * 12) - (percent / 100) * (2 * Math.PI * 12)
                  }}
                />
              </svg>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary truncate">
                {note.title || 'Untitled Checklist'}
              </h3>
              {note.is_pinned && (
                <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              <span>{totalTasks} items</span>
              <span>•</span>
              <span>{openTasks === 0 ? 'All done' : `${openTasks} left`}</span>
              {note.category && note.category !== 'Uncategorized' && (
                <>
                  <span>•</span>
                  <span className="font-medium text-[var(--accent-text)]">{note.category}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {due && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${due.colorClass}`}>
              {due.label}
            </span>
          )}

          <span className="text-xs font-bold text-text-muted">
            {percent}%
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // GRID CARD LAYOUT (Standard Material 3 / Google Style)
  // -------------------------------------------------------------
  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-3xl p-5 border border-[var(--border-color)] bg-surface-card transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-xl hover:-translate-y-0.5 hover:border-[var(--accent)]/40 ${
        isAllDone ? 'opacity-90' : ''
      }`}
    >
      {/* Field Clipboard Clamp (scoped via [data-panel="checklists"]) */}
      <div className="checklist-card-clip" aria-hidden="true" />

      <div>
        {/* Top Header: Icon Bubble + Progress Ring + Menu */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Icon Bubble */}
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-text)] flex items-center justify-center text-lg font-bold shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              {note.content?.icon && note.content.icon.length <= 4 ? (
                note.content.icon
              ) : (
                <CheckSquare className="w-5 h-5" />
              )}
            </div>

            {/* Folder Pill (if set) */}
            {note.category && note.category !== 'Uncategorized' && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-text-muted truncate max-w-[130px]">
                {note.category}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Circular Progress Ring */}
            <div className="relative flex items-center justify-center">
              {isAllDone ? (
                <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--btn-fg)] flex items-center justify-center shadow-xs" title="100% Completed">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              ) : (
                <div className="relative flex items-center justify-center" title={`${percent}% done (${openTasks} left)`}>
                  <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={radius}
                      className="stroke-black/10 dark:stroke-white/10"
                      strokeWidth={strokeWidth}
                      fill="transparent"
                    />
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={radius}
                      className="stroke-[var(--accent)] transition-all duration-300"
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      fill="transparent"
                      style={{
                        strokeDasharray: circumference,
                        strokeDashoffset
                      }}
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-text-primary">
                    {totalTasks === 0 ? '—' : `${openTasks}`}
                  </span>
                </div>
              )}
            </div>

            {/* Overflow ⋯ Menu */}
            <div className="relative shrink-0" ref={menuOpen ? menuRef : null}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors opacity-80 group-hover:opacity-100"
                title="Checklist actions"
                aria-label="Checklist actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-48 bg-bg-primary rounded-2xl shadow-xl border border-black/10 dark:border-white/10 py-1.5 z-40 text-xs font-medium animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onPinToggle?.(note);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'text-amber-500 fill-amber-500' : 'text-text-muted'}`} />
                    <span>{note.is_pinned ? 'Unpin Checklist' : 'Pin to Top'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDuplicate?.(note);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-text-muted" />
                    <span>Duplicate Checklist</span>
                  </button>

                  {/* Move to Folder */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowFolderSubmenu(!showFolderSubmenu)}
                      className="w-full flex items-center justify-between px-3.5 py-2 text-left text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <FolderInput className="w-3.5 h-3.5 text-text-muted" />
                        <span>Move to Folder</span>
                      </span>
                      <span className="text-[10px] text-text-muted">▸</span>
                    </button>

                    {showFolderSubmenu && (
                      <div className="bg-bg-sidebar border-y border-black/5 dark:border-white/5 py-1 px-2 max-h-32 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onMoveToFolder?.(note, 'Uncategorized');
                          }}
                          className="w-full text-left px-2 py-1 text-[11px] rounded hover:bg-black/5 text-text-muted hover:text-text-primary"
                        >
                          (No folder)
                        </button>
                        {allFolders.map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              onMoveToFolder?.(note, f);
                            }}
                            className="w-full text-left px-2 py-1 text-[11px] rounded hover:bg-black/5 text-text-muted hover:text-text-primary truncate"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onArchive?.(note);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5 text-text-muted" />
                    <span>Archive</span>
                  </button>

                  <div className="my-1 border-t border-black/5 dark:border-white/5" />

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete?.(note);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Title (2-line clamp) */}
        <h3 className="text-base font-bold text-text-primary tracking-tight line-clamp-2 leading-snug">
          {note.title || 'Untitled Checklist'}
        </h3>

        {/* Meta Chips: Total count + Due Date */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs font-semibold text-text-muted">
            {totalTasks} {totalTasks === 1 ? 'item' : 'items'}
          </span>

          {due && (
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${due.colorClass}`}>
              {due.label}
            </span>
          )}

          {isAllDone && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Done ✓
            </span>
          )}
        </div>
      </div>

      {/* Preview of next 2 to 3 unchecked root tasks */}
      <div className="mt-4 pt-3.5 border-t border-black/5 dark:border-white/5">
        {totalTasks === 0 ? (
          <p className="text-xs text-text-muted italic py-1">
            Empty checklist — click to add items
          </p>
        ) : isAllDone ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium py-1 flex items-center gap-1.5">
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>All tasks completed!</span>
          </p>
        ) : rootOpenPreviews.length === 0 ? (
          <p className="text-xs text-text-muted py-1">
            {completedTasks} of {totalTasks} completed
          </p>
        ) : (
          <div className="space-y-1.5">
            {rootOpenPreviews.map(item => (
              <div
                key={item.id}
                onClick={(e) => handleQuickTick(e, item)}
                className="group/item flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors py-0.5"
                title="Tap to mark completed"
              >
                <div className="w-4 h-4 rounded-md border border-black/20 dark:border-white/20 group-hover/item:border-emerald-500 flex items-center justify-center shrink-0 transition-colors bg-white/50 dark:bg-white/5">
                  <Check className="w-3 h-3 text-emerald-500 opacity-0 group-hover/item:opacity-70 transition-opacity" />
                </div>
                <span className="truncate">
                  {item.text || 'Untitled task'}
                </span>
              </div>
            ))}
            {openTasks > rootOpenPreviews.length && (
              <span className="text-[11px] text-text-muted block pt-0.5 font-medium">
                +{openTasks - rootOpenPreviews.length} more left
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
