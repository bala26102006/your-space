import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import NoteCard from '../cards/NoteCard';

export default function SortableNoteItem({
  note,
  isSelected,
  tags,
  onSelect,
  onPinToggle,
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
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle position overlay */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-2 top-3 z-10 cursor-grab active:cursor-grabbing p-1 text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity bg-bg-primary/80 backdrop-blur-sm rounded"
        title="Drag to reorder scene/note"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <NoteCard
        note={note}
        isSelected={isSelected}
        tags={tags}
        onSelect={onSelect}
        onPinToggle={onPinToggle}
        onArchive={onArchive}
        onDelete={onDelete}
      />
    </div>
  );
}
