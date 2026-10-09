import React, { useState, useEffect, useMemo } from 'react';
import { Copy, Plus, Trash2, CheckSquare, Square, GripVertical, Type, AlignLeft, ChevronDown } from 'lucide-react';
import { db } from '../../lib/db';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { getStarterKitItems } from '../../lib/starterKits';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ 
  id, 
  item, 
  isTemplate, 
  readOnly, 
  onUpdate, 
  onRemove, 
  onKeyDown,
  isCollapsed,
  nestedCount,
  onToggleCollapse
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isIndented = !!item.parent_item_id;
  const isHeader = item.item_type === 'header';
  const isNote = item.item_type === 'note';
  const isTask = !isHeader && !isNote;

  return (
    <div ref={setNodeRef} style={style} className={`group flex flex-col gap-1 ${isIndented ? 'ml-8' : ''} ${isHeader ? 'mt-4 mb-2' : ''}`}>
      <div className="flex items-start gap-2 relative">
        {/* Intuitive Tactile Drag Handle */}
        <div 
          {...attributes} 
          {...listeners} 
          className="p-1 -ml-1 rounded cursor-grab active:cursor-grabbing text-text-muted/40 hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors mt-0.5"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Section Header Collapse Toggle */}
        {isHeader && (
          <button
            type="button"
            onClick={() => onToggleCollapse && onToggleCollapse(item.id)}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors mt-0.5"
            title={isCollapsed ? 'Expand section' : 'Collapse section'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90 text-text-muted' : 'text-text-primary'}`} />
          </button>
        )}

        {isTask && (
          <button 
            onClick={() => {
              if (isTemplate || readOnly) return;
              onUpdate(item.id, 'is_completed', !item.is_completed);
            }}
            disabled={isTemplate || readOnly}
            className={`p-1 mt-0.5 rounded transition-colors ${isTemplate ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer'}`}
          >
            {item.is_completed ? <CheckSquare className="w-5 h-5 text-green-500" /> : <Square className="w-5 h-5 text-text-muted" />}
          </button>
        )}
        
        <input 
          type="text"
          value={item.text || ''}
          onChange={(e) => onUpdate(item.id, 'text', e.target.value)}
          onKeyDown={(e) => onKeyDown(e, item)}
          disabled={readOnly}
          placeholder={isHeader ? "Section Header..." : isNote ? "Add a note..." : "Task..."}
          className={`flex-1 bg-transparent border-none outline-none resize-none ${
            isHeader ? 'font-bold text-sm tracking-wider uppercase text-text-primary pt-1.5' : 
            isNote ? 'text-sm italic text-text-muted pt-1.5' :
            `text-sm font-medium pt-1.5 ${item.is_completed && !isTemplate ? 'line-through text-text-muted' : 'text-text-primary'}`
          }`}
        />

        {/* Collapsed Items Count Badge */}
        {isHeader && nestedCount > 0 && (
          <button
            type="button"
            onClick={() => onToggleCollapse && onToggleCollapse(item.id)}
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full mt-2 transition-colors ${
              isCollapsed 
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold' 
                : 'bg-black/5 dark:bg-white/5 text-text-muted opacity-70 hover:opacity-100'
            }`}
          >
            {isCollapsed ? `${nestedCount} hidden` : `${nestedCount} items`}
          </button>
        )}

        {isTask && item.due_date && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 mt-2">
            {item.due_date}
          </span>
        )}

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
          {isTask && (
            <input 
              type="date"
              value={item.due_date || ''}
              onChange={(e) => onUpdate(item.id, 'due_date', e.target.value)}
              disabled={readOnly}
              className="text-[10px] px-1 bg-bg-sidebar border border-black/10 dark:border-white/10 rounded text-text-primary outline-none"
              title="Optional Due Date"
            />
          )}
          {!readOnly && (
            <button onClick={() => onRemove(item.id)} className="p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChecklistEditor({ noteId, content, onChange, readOnly }) {
  const isTemplate = content?.isTemplate || false;

  const rawItems = useLiveQuery(() => {
    if (!noteId) return [];
    if (noteId.startsWith('starter-kit-')) {
       return getStarterKitItems(noteId);
    }
    return db.checklist_items.where('note_id').equals(noteId).sortBy('sort_order');
  }, [noteId]) || [];

  const items = useMemo(() => {
    return rawItems;
  }, [rawItems]);

  // Collapsible section headers state
  const [collapsedSections, setCollapsedSections] = useState(new Set());

  const toggleSectionCollapse = (headerId) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(headerId)) next.delete(headerId);
      else next.add(headerId);
      return next;
    });
  };

  // Group items by header and identify hidden items
  const { headerCounts, hiddenItemIds } = useMemo(() => {
    const counts = {};
    const hidden = new Set();
    let currentHeaderId = null;

    items.forEach(item => {
      if (item.item_type === 'header') {
        currentHeaderId = item.id;
        counts[currentHeaderId] = 0;
      } else {
        if (currentHeaderId) {
          counts[currentHeaderId] = (counts[currentHeaderId] || 0) + 1;
          if (collapsedSections.has(currentHeaderId)) {
            hidden.add(item.id);
          }
        }
      }
    });

    return { headerCounts: counts, hiddenItemIds: hidden };
  }, [items, collapsedSections]);

  const visibleItems = useMemo(() => {
    return items.filter(item => !hiddenItemIds.has(item.id));
  }, [items, hiddenItemIds]);

  // Migrate old JSON items if needed
  useEffect(() => {
    if (!noteId || items.length > 0 || !content?.items?.length) return;
    
    // Check if migration is already done or not needed (by checking count)
    const migrate = async () => {
      const count = await db.checklist_items.where('note_id').equals(noteId).count();
      if (count === 0 && content.items.length > 0) {
        const newItems = [];
        let order = Date.now();
        content.items.forEach(old => {
          const parentId = crypto.randomUUID();
          newItems.push({
            id: parentId,
            note_id: noteId,
            parent_item_id: null,
            text: old.text,
            is_completed: old.checked,
            due_date: old.dueDate || null,
            sort_order: order++
          });
          if (old.subItems) {
            old.subItems.forEach(sub => {
              newItems.push({
                id: crypto.randomUUID(),
                note_id: noteId,
                parent_item_id: parentId,
                text: sub.text,
                is_completed: sub.checked,
                due_date: null,
                sort_order: order++
              });
            });
          }
        });
        await db.checklist_items.bulkAdd(newItems);
        // Clear the old JSON items so we don't migrate again
        onChange({ ...content, items: [] });
      }
    };
    migrate();
  }, [noteId, items.length, content]);

  const handleTemplateToggle = (checked) => {
    if (readOnly) return;
    onChange({ ...(content || {}), isTemplate: checked });
  };

  const handleDuplicateReset = async () => {
    if (readOnly) return;
    // Uncheck all items
    const updates = items.map(i => ({ key: i.id, changes: { is_completed: false } }));
    
    await db.transaction('rw', db.checklist_items, async () => {
      for (const update of updates) {
        await db.checklist_items.update(update.key, update.changes);
      }
    });
    
    onChange({ ...(content || {}), isTemplate: false });
  };

  const addItem = async (type = 'task') => {
    const newItem = {
      id: crypto.randomUUID(),
      note_id: noteId,
      parent_item_id: null,
      item_type: type,
      text: '',
      is_completed: false,
      due_date: null,
      sort_order: Date.now(),
    };
    await db.checklist_items.add(newItem);
  };

  const updateItem = async (id, field, value) => {
    await db.checklist_items.update(id, { [field]: value });
  };

  const removeItem = async (id) => {
    await db.checklist_items.delete(id);
    // Also delete any children
    const children = items.filter(i => i.parent_item_id === id);
    for (const c of children) {
      await db.checklist_items.delete(c.id);
    }
  };

  // Keyboard shortcut (Tab / Shift+Tab)
  const handleKeyDown = async (e, item) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const idx = items.findIndex(i => i.id === item.id);
      
      if (!e.shiftKey) {
        // Indent: Make it a child of the previous item (only if previous item is top-level)
        if (idx > 0) {
          const prevItem = items[idx - 1];
          if (!prevItem.parent_item_id) {
            await db.checklist_items.update(item.id, { parent_item_id: prevItem.id });
          }
        }
      } else {
        // Outdent: Remove parent_item_id
        if (item.parent_item_id) {
          await db.checklist_items.update(item.id, { parent_item_id: null });
        }
      }
    }
  };

  // Drag and Drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    // Update sort_order for everything to ensure Dexie reflects the new state
    await db.transaction('rw', db.checklist_items, async () => {
      let currentOrder = Date.now() - 10000; // base timestamp
      for (let i = 0; i < reordered.length; i++) {
        await db.checklist_items.update(reordered[i].id, { sort_order: currentOrder + i });
      }
    });
  };

  // Compute progress
  const taskItems = items.filter(i => i.item_type === 'task' || !i.item_type);
  const totalTasks = taskItems.length;
  const completedTasks = taskItems.filter(i => i.is_completed).length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl pb-10">
      
      {/* Header / Template Toggle & Progress */}
      <div className="flex flex-col gap-4 p-4 bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`relative w-10 h-5 rounded-full transition-colors ${isTemplate ? 'bg-blue-500' : 'bg-black/20 dark:bg-white/20'}`}>
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${isTemplate ? 'left-6' : 'left-1'}`} />
            </div>
            <input
              type="checkbox"
              className="hidden"
              checked={isTemplate}
              onChange={(e) => handleTemplateToggle(e.target.checked)}
              disabled={readOnly}
            />
            <div>
              <div className="font-semibold text-sm text-text-primary">Template Mode</div>
              <div className="text-xs text-text-muted">If active, checkboxes are locked.</div>
            </div>
          </label>
          
          {isTemplate && !readOnly && (
            <button 
              onClick={handleDuplicateReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors shadow"
            >
              <Copy className="w-3.5 h-3.5" />
              Duplicate & Reset
            </button>
          )}
        </div>

        {/* Subtle Progress Bar */}
        <div className="flex flex-col gap-1.5 pt-3 border-t border-black/5 dark:border-white/5">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Progress</span>
            <span className="text-[10px] font-medium text-text-muted">{completedTasks}/{totalTasks} done</span>
          </div>
          <div className="w-full h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Items List */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {visibleItems.map((item) => (
              <SortableItem
                key={item.id}
                id={item.id}
                item={item}
                isTemplate={isTemplate}
                readOnly={readOnly}
                onUpdate={updateItem}
                onRemove={removeItem}
                onKeyDown={handleKeyDown}
                isCollapsed={collapsedSections.has(item.id)}
                nestedCount={headerCounts[item.id] || 0}
                onToggleCollapse={toggleSectionCollapse}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <button 
            onClick={() => addItem('task')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-button text-xs font-medium text-text-primary transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Add Task
          </button>
          <button 
            onClick={() => addItem('header')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-button text-xs font-medium text-text-primary transition-colors"
          >
            <Type className="w-3.5 h-3.5" />
            Add Header
          </button>
          <button 
            onClick={() => addItem('note')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-button text-xs font-medium text-text-primary transition-colors"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            Add Note
          </button>
        </div>
      )}

    </div>
  );
}
