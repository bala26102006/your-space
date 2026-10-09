import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Folder, FileText, MoreVertical, Archive, Trash2, Edit2, Check } from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';

export default function SortableSubprojectItem({
  subproject,
  onSelect,
  onRename,
  onArchive,
  onDelete,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subproject.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [titleInput, setTitleInput] = useState(subproject.title);
  const [showMenu, setShowMenu] = useState(false);

  // Count notes inside subproject
  const noteStats = useLiveQuery(async () => {
    const notes = await db.notes.where('subproject_id').equals(subproject.id).toArray();
    const active = notes.filter((n) => !n.is_archived && !n.is_deleted);
    const completed = active.filter((n) => n.is_completed).length;
    return { total: active.length, completed };
  }, [subproject.id]) || { total: 0, completed: 0 };

  const handleSaveRename = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (titleInput.trim()) {
      onRename(subproject.id, titleInput.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className="group relative flex items-center justify-between p-3.5 bg-card-default border border-black/5 dark:border-white/10 rounded-card transition-all duration-200 ease-out cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-black/40"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing p-1 text-text-muted hover:text-text-primary opacity-40 group-hover:opacity-100 transition-opacity"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />

        {isEditing ? (
          <form onSubmit={handleSaveRename} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 flex-1">
            <input
              type="text"
              autoFocus
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="px-2 py-0.5 text-xs bg-bg-primary border border-black/10 dark:border-white/10 rounded text-text-primary w-full"
            />
            <button type="submit" className="p-1 text-emerald-600 hover:text-emerald-700">
              <Check className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <span className="font-semibold text-sm text-text-primary truncate">
            {subproject.title || 'Untitled Section'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted flex items-center gap-1.5 bg-black/5 dark:bg-white/5 px-2.5 py-0.5 rounded-full font-mono">
          <FileText className="w-3 h-3" />
          <span>{noteStats.total > 0 ? `${noteStats.completed}/${noteStats.total} done` : '0 notes'}</span>
        </span>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-6 z-20 w-36 py-1 bg-bg-primary rounded-button shadow-lg border border-black/10 dark:border-white/10 text-xs"
            >
              <button
                onClick={() => {
                  setIsEditing(true);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-hover-bg text-text-primary"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Rename</span>
              </button>
              <button
                onClick={() => {
                  onArchive(subproject.id);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-hover-bg text-text-primary"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{subproject.is_archived ? 'Unarchive' : 'Archive'}</span>
              </button>
              <button
                onClick={() => {
                  onDelete(subproject.id);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Trash</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
