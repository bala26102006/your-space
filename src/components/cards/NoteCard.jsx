import React, { useState } from 'react';
import { Pin, MoreVertical, Archive, Trash2, Tag as TagIcon, Calendar, Copy, CheckCircle2, Circle, Palette } from 'lucide-react';
import { COLOR_OPTIONS } from '../shared/ColorPicker';
import TagPill from '../shared/TagPill';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import { getChecklistProgress, getWishlistTotalCost } from '../../lib/queries/cardSummary';
import { generateUUID } from '../../lib/uuid';
import { useConfirmStore } from '../../store/confirmStore';
import { useToastStore } from '../../store/toastStore';
import { softDeleteItem, restoreItem, archiveItem, unarchiveItem } from '../../lib/services/trashService';

export default function NoteCard({
  note,
  isSelected,
  tags = [],
  onSelect,
  onPinToggle,
  onArchive,
  onDelete,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const { openSoftDelete } = useConfirmStore();
  const { showToast } = useToastStore();

  const handlePin = async (e) => {
    e.stopPropagation();
    const nextPin = !note.is_pinned;
    await db.notes.update(note.id, {
      is_pinned: nextPin,
      updated_at: new Date().toISOString(),
    });
    if (onPinToggle) onPinToggle(note.id);
    showToast({ message: nextPin ? 'Pinned note' : 'Unpinned note' });
  };

  const handleColorSelect = async (e, colorId) => {
    e.stopPropagation();
    setShowColorMenu(false);
    await db.notes.update(note.id, {
      color: colorId,
      updated_at: new Date().toISOString(),
    });
    const opt = COLOR_OPTIONS.find((c) => c.id === colorId);
    showToast({ message: `Color changed to ${opt?.label || colorId}` });
  };

  const handleArchive = async (e) => {
    e.stopPropagation();
    setShowMenu(false);
    const isArchived = Boolean(note.is_archived);
    if (isArchived) {
      await unarchiveItem({
        id: note.id,
        type: 'note',
        title: note.title || 'Untitled note',
        workspace: note.workspace_id || 'quicknotes',
      });
      showToast({ message: `Unarchived "${note.title || 'note'}"` });
    } else {
      await archiveItem({
        id: note.id,
        type: 'note',
        title: note.title || 'Untitled note',
        workspace: note.workspace_id || 'quicknotes',
      });
      showToast({
        message: `Archived "${note.title || 'note'}"`,
        action: {
          label: 'Undo',
          onClick: async () => {
            await unarchiveItem({
              id: note.id,
              type: 'note',
              title: note.title || 'Untitled note',
              workspace: note.workspace_id || 'quicknotes',
            });
          },
        },
      });
    }
    if (onArchive) onArchive(note.id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    openSoftDelete({
      title: note.title || 'Untitled note',
      count: 1,
      onConfirm: async () => {
        await softDeleteItem({
          id: note.id,
          type: 'note',
          title: note.title || 'Untitled note',
          workspace: note.workspace_id || 'quicknotes',
        });
        showToast({
          message: `Moved "${note.title || 'note'}" to Trash`,
          action: {
            label: 'Undo',
            onClick: async () => {
              await restoreItem({
                id: note.id,
                type: 'note',
                title: note.title || 'Untitled note',
                workspace: note.workspace_id || 'quicknotes',
              });
            },
          },
        });
        if (onDelete) onDelete(note.id);
      },
    });
  };

  const checklistItems = useLiveQuery(
    () => {
      if (note.workspace_id === 'checklists') {
        return db.checklist_items.where('note_id').equals(note.id).toArray();
      }
      return [];
    },
    [note.id, note.workspace_id]
  );

  const getPreviewText = () => {
    if (!note.content) return '';
    if (typeof note.content === 'string') return note.content;
    
    if (note.workspace_id === 'checklists') {
      if ((!checklistItems || checklistItems.length === 0) && note.content?.items?.length > 0) {
        let total = 0;
        let checked = 0;
        note.content.items.forEach(item => {
          total++;
          if (item.checked) checked++;
          (item.subItems || []).forEach(sub => {
            total++;
            if (sub.checked) checked++;
          });
        });
        if (total === 0) return 'Empty checklist';
        return `Progress: ${checked}/${total} tasks (${Math.round((checked / total) * 100)}%)`;
      }

      if (!checklistItems || checklistItems.length === 0) return 'Empty checklist';
      const tasks = checklistItems.filter(i => i.item_type === 'task' || !i.item_type);
      const total = tasks.length;
      if (total === 0) return 'No tasks yet';
      const checked = tasks.filter(i => i.is_completed).length;
      return `${checked}/${total} tasks`;
    }

    if (note.workspace_id === 'wishlist') {
      return note.content?.note || '';
    }

    if (note.workspace_id === 'sketch') {
      return note.content?.description || '';
    }

    // Parse TipTap JSON
    const extractText = (node) => {
      if (!node) return '';
      if (node.text) return node.text;
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join(' ');
      }
      return '';
    };

    const text = extractText(note.content);
    return text.trim();
  };

  const previewText = getPreviewText();

  const checklistProgress = useLiveQuery(() => 
    note.workspace_id === 'checklists' ? getChecklistProgress(note.id) : null
  , [note.id, note.workspace_id]);

  const wishlistTotalCost = useLiveQuery(() => 
    note.workspace_id === 'wishlist' ? getWishlistTotalCost(note.id) : null
  , [note.id, note.workspace_id]);

  let earliestDueDate = null;
  if (note.workspace_id === 'checklists' && checklistItems?.length > 0) {
    const dates = checklistItems
      .filter(i => i.item_type === 'task' || !i.item_type)
      .map(i => i.due_date)
      .filter(Boolean)
      .sort();
    if (dates.length > 0) {
      earliestDueDate = dates[0];
    }
  }

  // Find color style
  const colorToken = note.color || 'default';

  const getColorClasses = (color) => {
    switch (color) {
      case 'yellow':
        return 'bg-card-yellow border-yellow-200/50 dark:border-yellow-900/30';
      case 'red':
        return 'bg-card-red border-red-200/50 dark:border-red-900/30';
      case 'blue':
        return 'bg-card-blue border-blue-200/50 dark:border-blue-900/30';
      case 'green':
        return 'bg-card-green border-green-200/50 dark:border-green-900/30';
      case 'purple':
        return 'bg-card-purple border-purple-200/50 dark:border-purple-900/30';
      default:
        return 'bg-card-default border-black/5 dark:border-white/10';
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-card p-4 border transition-all duration-200 ease-out cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-black/40 overflow-hidden break-words ${getColorClasses(
        colorToken
      )} ${isSelected ? 'ring-2 ring-[var(--workspace-accent)] shadow-card-hover' : ''}`}
    >
      {/* Card Header: Color Indicator dot + Pin + Project complete + Actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {colorToken !== 'default' && (
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{
                backgroundColor: COLOR_OPTIONS.find((c) => c.id === colorToken)?.border || '#E5E7EB',
              }}
            />
          )}
          {note.workspace_id === 'projects' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                db.notes.update(note.id, {
                  is_completed: !note.is_completed,
                  updated_at: new Date().toISOString()
                });
              }}
              className={`p-0.5 rounded transition-colors ${
                note.is_completed ? 'text-emerald-500' : 'text-text-muted hover:text-emerald-500'
              }`}
              title={note.is_completed ? 'Mark scene as pending' : 'Mark scene as complete'}
              aria-label={note.is_completed ? 'Mark scene as pending' : 'Mark scene as complete'}
            >
              {note.is_completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 opacity-40 hover:opacity-100" />
              )}
            </button>
          )}
          {note.is_pinned && (
            <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 transform rotate-45" />
          )}
        </div>

        {/* Actions Bar: Visible on hover on desktop, always visible on touch */}
        <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
          {/* Color Change Button & Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowColorMenu(!showColorMenu);
                setShowMenu(false);
              }}
              title="Change color"
              aria-label="Change note color"
              className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            {showColorMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-9 z-30 p-2 bg-bg-primary rounded-xl shadow-xl border border-black/10 dark:border-white/10 flex items-center gap-1.5"
              >
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={(e) => handleColorSelect(e, c.id)}
                    title={c.label}
                    aria-label={`Select ${c.label} color`}
                    className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${
                      (note.color || 'default') === c.id ? 'ring-2 ring-[var(--workspace-accent)] ring-offset-1 scale-105' : ''
                    }`}
                    style={{ backgroundColor: c.border }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pin Button */}
          <button
            type="button"
            onClick={handlePin}
            title={note.is_pinned ? 'Unpin note' : 'Pin note'}
            aria-label={note.is_pinned ? 'Unpin note' : 'Pin note'}
            className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
          >
            <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'fill-current text-amber-500' : ''}`} />
          </button>

          {/* More Actions Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
                setShowColorMenu(false);
              }}
              title="More actions"
              aria-label="More note actions"
              className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-9 z-30 w-40 py-1 bg-bg-primary rounded-button shadow-xl border border-black/10 dark:border-white/10 text-xs"
              >
                {note.workspace_id === 'checklists' && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const newId = generateUUID();
                      const newNote = {
                        ...note,
                        id: newId,
                        title: `${note.title || 'Checklist'} (Copy)`,
                        content: { ...(note.content || {}), isTemplate: false },
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      };
                      await db.notes.add(newNote);
                      const items = await db.checklist_items.where('note_id').equals(note.id).toArray();
                      const dbItems = items.map((item) => ({
                        ...item,
                        id: generateUUID(),
                        note_id: newId,
                        is_completed: false,
                      }));
                      await db.checklist_items.bulkAdd(dbItems);
                      setShowMenu(false);
                      showToast({ message: 'Checklist duplicated' });
                      if (onSelect) onSelect(newId);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate & Reset</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleArchive}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-hover-bg text-text-primary"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{note.is_archived ? 'Unarchive' : 'Archive'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Move to Trash</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Title */}
      <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
        <h3 className={`font-semibold text-base line-clamp-1 break-words overflow-hidden ${note.is_completed ? 'line-through text-text-muted opacity-70' : 'text-text-primary'}`}>
          {note.title || 'Untitled Note'}
        </h3>
        {note.is_completed && note.workspace_id === 'projects' && (
          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
            Done
          </span>
        )}
      </div>

      {/* Card Content Preview (up to 3 lines) */}
      <p className="text-sm text-text-muted line-clamp-3 leading-relaxed min-h-[3rem] break-words overflow-hidden">
        {previewText || 'Empty note...'}
      </p>

      {/* Actionable Metadata (Progress Bar / Total Cost) */}
      {note.workspace_id === 'checklists' && checklistProgress?.total > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-medium text-text-muted mb-1.5 uppercase tracking-wider">
            <span>Progress</span>
            <span>{checklistProgress.completed}/{checklistProgress.total} done</span>
          </div>
          <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--workspace-accent)] rounded-full transition-all duration-500" 
              style={{ width: `${checklistProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {note.workspace_id === 'wishlist' && wishlistTotalCost != null && wishlistTotalCost > 0 && (
        <div className="mt-3 flex items-center gap-1.5 w-max px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <span>Total Cost: ${wishlistTotalCost.toFixed(2)}</span>
        </div>
      )}

      {/* Due Date Badge (Checklists) */}
      {earliestDueDate && (
        <div className="mt-3 flex items-center gap-1 w-max px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <Calendar className="w-3 h-3" />
          <span>Due: {earliestDueDate}</span>
        </div>
      )}

      {/* Tags Footer */}
      {tags.length > 0 && (
        <div className="mt-3 pt-2 flex flex-wrap gap-1 border-t border-black/5 dark:border-white/5">
          {tags.map((tag) => (
            <TagPill key={tag.id} label={tag.label} />
          ))}
        </div>
      )}
    </div>
  );
}
