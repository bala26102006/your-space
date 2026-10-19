import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Folder, 
  MoreVertical, 
  Edit3, 
  Palette, 
  Trash2, 
  Plus, 
  Clock, 
  CheckCircle2,
  Check
} from 'lucide-react';
import { 
  getFolderMeta, 
  setFolderMeta, 
  getDueDateStatus, 
  isItemCompleted 
} from '../../lib/checklists/checklistUtils';

const FOLDER_COLORS = [
  { id: 'emerald', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', hex: '#10B981' },
  { id: 'sky', bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', bar: 'bg-sky-500', hex: '#0EA5E9' },
  { id: 'amber', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', hex: '#F59E0B' },
  { id: 'rose', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', bar: 'bg-rose-500', hex: '#F43F5E' },
  { id: 'indigo', bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', bar: 'bg-indigo-500', hex: '#6366F1' },
  { id: 'violet', bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', bar: 'bg-violet-500', hex: '#8B5CF6' },
];

export default function FolderCard({
  folderName,
  checklists = [],
  itemsByNoteId = new Map(),
  onSelectFolder,
  onRenameFolder,
  onDeleteFolder,
  onAddChecklist
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameInput, setEditNameInput] = useState(folderName);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [meta, setMeta] = useState(() => getFolderMeta(folderName));
  const menuRef = useRef(null);

  useEffect(() => {
    setMeta(getFolderMeta(folderName));
    setEditNameInput(folderName);
  }, [folderName]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  // Aggregate metrics across all checklists in this folder
  const { totalTasks, completedTasks, dueOrOverdueCount, aggregatePercent } = useMemo(() => {
    let total = 0;
    let completed = 0;
    let dueCount = 0;

    checklists.forEach(c => {
      const items = itemsByNoteId.get(c.id) || [];
      items.forEach(item => {
        if (item.item_type && item.item_type !== 'task') return;
        total++;
        if (isItemCompleted(item)) {
          completed++;
        } else if (item.due_date) {
          const st = getDueDateStatus(item.due_date);
          if (st && (st.isOverdue || st.isToday)) {
            dueCount++;
          }
        }
      });
    });

    const p = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      totalTasks: total,
      completedTasks: completed,
      dueOrOverdueCount: dueCount,
      aggregatePercent: p
    };
  }, [checklists, itemsByNoteId]);

  const activeColorObj = FOLDER_COLORS.find(c => c.id === meta.color) || FOLDER_COLORS[0];

  const handleSaveName = (e) => {
    e.preventDefault();
    if (!editNameInput.trim()) return;
    onRenameFolder?.(folderName, editNameInput.trim());
    setIsEditingName(false);
  };

  const handleChangeColor = (colorId) => {
    const updated = { ...meta, color: colorId };
    setFolderMeta(folderName, updated);
    setMeta(updated);
    setShowColorPicker(false);
  };

  return (
    <div
      onClick={() => onSelectFolder?.(folderName)}
      className="group relative rounded-3xl p-5 border border-black/8 dark:border-white/10 bg-white dark:bg-bg-primary transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-xl hover:-translate-y-0.5 hover:border-emerald-500/40"
    >
      <div>
        {/* Top: Folder Icon + Checklist Count + Menu */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 shadow-2xs group-hover:scale-105 transition-transform ${activeColorObj.bg}`}>
              <Folder className="w-5 h-5 fill-current opacity-30 stroke-[2.5]" />
            </div>

            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-text-muted">
              {checklists.length} {checklists.length === 1 ? 'checklist' : 'checklists'}
            </span>
          </div>

          {/* Folder ⋯ Menu */}
          <div className="relative shrink-0" ref={menuOpen ? menuRef : null}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors opacity-80 group-hover:opacity-100"
              title="Folder options"
              aria-label="Folder options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-44 bg-bg-primary rounded-2xl shadow-xl border border-black/10 dark:border-white/10 py-1.5 z-40 text-xs font-medium animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setIsEditingName(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-text-muted" />
                  <span>Rename Folder</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-left text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Palette className="w-3.5 h-3.5 text-text-muted" />
                      <span>Change Color</span>
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeColorObj.hex }} />
                  </button>

                  {showColorPicker && (
                    <div className="flex items-center gap-2 px-3.5 py-2 border-y border-black/5 dark:border-white/5 bg-bg-sidebar">
                      {FOLDER_COLORS.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleChangeColor(c.id)}
                          className="w-5 h-5 rounded-full hover:scale-110 transition-transform relative flex items-center justify-center"
                          style={{ backgroundColor: c.hex }}
                        >
                          {meta.color === c.id && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="my-1 border-t border-black/5 dark:border-white/5" />

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteFolder?.(folderName);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Folder</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title or Rename Form */}
        {isEditingName ? (
          <form onSubmit={handleSaveName} onClick={(e) => e.stopPropagation()} className="mt-1 flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              value={editNameInput}
              onChange={(e) => setEditNameInput(e.target.value)}
              className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button type="submit" className="px-2.5 py-1 bg-emerald-500 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-600">Save</button>
            <button type="button" onClick={() => setIsEditingName(false)} className="px-2 py-1 bg-black/5 text-text-muted text-[11px] rounded-lg">Cancel</button>
          </form>
        ) : (
          <h3 className="text-base font-bold text-text-primary tracking-tight truncate leading-snug">
            {folderName}
          </h3>
        )}

        {/* Due/Overdue Tag */}
        {dueOrOverdueCount > 0 && (
          <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            <span>{dueOrOverdueCount} due or overdue</span>
          </div>
        )}
      </div>

      {/* Bottom Area: Aggregate Progress Bar */}
      <div className="mt-5 pt-3.5 border-t border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between text-xs font-medium text-text-muted mb-1.5">
          <span>{completedTasks} of {totalTasks} tasks done</span>
          <span className="font-bold text-text-primary">{aggregatePercent}%</span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${activeColorObj.bar}`}
            style={{ width: `${aggregatePercent}%` }}
          />
        </div>

        {/* Empty folder action */}
        {checklists.length === 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddChecklist?.(folderName);
            }}
            className="mt-3 w-full py-1.5 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-[11px] font-semibold text-text-muted hover:text-emerald-600 hover:border-emerald-500 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add Checklist</span>
          </button>
        )}
      </div>
    </div>
  );
}
