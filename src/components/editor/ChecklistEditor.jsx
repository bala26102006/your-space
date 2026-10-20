import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Copy,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  GripVertical,
  Type,
  AlignLeft,
  ChevronDown,
  ChevronRight,
  Star,
  Clock,
  Calendar,
  Sparkles,
  Download,
  Share2,
  Printer,
  Undo2,
  Check,
  RefreshCw,
  Archive,
  FileText,
  SlidersHorizontal,
  ListPlus,
  X,
} from 'lucide-react';
import { db } from '../../lib/db';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { getStarterKitItems } from '../../lib/starterKits';
import { generateUUID } from '../../lib/uuid';
import {
  isItemCompleted,
  toggleChecklistItemCompletion,
  parseSmartDate,
  parseBrainDump,
  generateChecklistExportText,
  downloadFile,
  getDueDateStatus,
  getTodayStr,
  formatLocalDate,
} from '../../lib/checklists/checklistUtils';
import { useToastStore } from '../../store/toastStore';
import { useConfirmStore } from '../../store/confirmStore';
import { archiveItem } from '../../lib/services/trashService';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// -----------------------------------------------------------------
// Confetti Animation Helper (Respects reduced motion)
// -----------------------------------------------------------------
function fireCelebrationConfetti(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const colors = ['#10B981', '#059669', '#34D399', '#6EE7B7', '#F59E0B', '#3B82F6', '#8B5CF6'];
  const particles = [];
  const particleCount = 50;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: w / 2 + (Math.random() - 0.5) * 80,
      y: h / 2,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 6 - 3,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vr: (Math.random() - 0.5) * 12,
      opacity: 1,
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
    });
  }

  const startTime = Date.now();
  const animate = () => {
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, w, h);

    let activeParticles = 0;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22;
      p.vx *= 0.98;
      p.rotation += p.vr;
      p.opacity = Math.max(0, 1 - elapsed / 2000);

      if (p.opacity > 0 && p.y < h + 20) {
        activeParticles++;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
        }
        ctx.restore();
      }
    });

    if (activeParticles > 0 && elapsed < 2000) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
  };

  requestAnimationFrame(animate);
}

// -----------------------------------------------------------------
// Sub-Component: Sortable Checklist Item with Progressive Details
// -----------------------------------------------------------------
function SortableItem({
  id,
  item,
  isTemplate,
  readOnly,
  onUpdate,
  onUpdateMultiple,
  onRemove,
  onKeyDown,
  onPasteText,
  isCollapsed,
  nestedCount,
  onToggleCollapse,
  inputRefCallback,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [showDetails, setShowDetails] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isIndented = !!item.parent_item_id;
  const isHeader = item.item_type === 'header';
  const isNote = item.item_type === 'note';
  const isTask = !isHeader && !isNote;
  const isDone = isItemCompleted(item);

  // Real-time smart date detection
  const smartDate = useMemo(() => {
    if (!isTask || isDone || !item.text) return null;
    const parsed = parseSmartDate(item.text);
    if (!parsed) return null;
    // Only suggest if not already set to this date
    if (item.due_date === parsed.detectedDate && item.due_time === parsed.detectedTime) {
      return null;
    }
    return parsed;
  }, [item.text, isTask, isDone, item.due_date, item.due_time]);

  const handleApplySmartDate = () => {
    if (!smartDate) return;
    onUpdateMultiple(item.id, {
      text: smartDate.cleanedText,
      due_date: smartDate.detectedDate,
      due_time: smartDate.detectedTime || item.due_time || null,
    });
  };

  const dueStatus = useMemo(() => {
    if (!item.due_date) return null;
    return getDueDateStatus(item.due_date);
  }, [item.due_date]);

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text');
    if (text && text.includes('\n')) {
      e.preventDefault();
      onPasteText(item.id, text);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex flex-col gap-1 transition-all duration-150 ${
        isIndented ? 'ml-8' : ''
      } ${isHeader ? 'mt-4 mb-2' : ''}`}
    >
      <div className="flex items-start gap-2 relative min-w-0">
        {/* Tactile Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="p-1 -ml-1 rounded cursor-grab active:cursor-grabbing text-text-muted/30 hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors mt-0.5 shrink-0"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Section Header Collapse Toggle */}
        {isHeader && (
          <button
            type="button"
            onClick={() => onToggleCollapse && onToggleCollapse(item.id)}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors mt-0.5 shrink-0"
            title={isCollapsed ? 'Expand section' : 'Collapse section'}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isCollapsed ? '-rotate-90 text-text-muted' : 'text-text-primary'
              }`}
            />
          </button>
        )}

        {/* Task Completion Checkbox */}
        {isTask && (
          <button
            type="button"
            onClick={() => {
              if (isTemplate || readOnly) return;
              onUpdate(item.id, 'is_completed', !isDone);
            }}
            disabled={isTemplate || readOnly}
            className={`p-1 mt-0.5 rounded transition-colors shrink-0 ${
              isTemplate
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer'
            }`}
            title={isDone ? 'Mark uncompleted' : 'Mark completed'}
          >
            {isDone ? (
              <CheckSquare className="w-5 h-5 text-emerald-500 transition-transform active:scale-90" />
            ) : (
              <Square className="w-5 h-5 text-text-muted transition-transform active:scale-90" />
            )}
          </button>
        )}

        {/* Item Text Input */}
        <div className="flex-1 min-w-0">
          <input
            ref={(el) => inputRefCallback && inputRefCallback(item.id, el)}
            type="text"
            value={item.text || ''}
            onChange={(e) => onUpdate(item.id, 'text', e.target.value)}
            onKeyDown={(e) => onKeyDown(e, item)}
            onPaste={handlePaste}
            disabled={readOnly}
            placeholder={
              isHeader
                ? 'SECTION HEADER...'
                : isNote
                ? 'Add an explanatory note...'
                : 'Task description...'
            }
            className={`w-full bg-transparent border-none outline-none resize-none min-w-0 ${
              isHeader
                ? 'font-bold text-xs tracking-wider uppercase text-emerald-600 dark:text-emerald-400 pt-1.5'
                : isNote
                ? 'text-xs italic text-text-muted pt-1.5'
                : `text-sm font-medium pt-1 ${
                    isDone && !isTemplate
                      ? 'line-through text-text-muted opacity-60'
                      : 'text-text-primary'
                  }`
            }`}
          />

          {/* Smart Date Suggestion Chip */}
          {smartDate && (
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={handleApplySmartDate}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all shadow-xs active:scale-95"
              >
                <Calendar className="w-3 h-3" />
                <span>Set due to {smartDate.displayLabel}?</span>
                <span className="underline ml-0.5 font-bold">Apply</span>
              </button>
            </div>
          )}

          {/* Inline Badges Summary (Due date, When cue, Critical, Estimate, Note) */}
          {isTask && !showDetails && (item.due_date || item.when_cue || item.estimate_minutes || item.note || item.is_critical) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px]">
              {item.is_critical && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  <span>Critical</span>
                </span>
              )}

              {dueStatus && (
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full font-medium border ${dueStatus.colorClass}`}
                >
                  <Calendar className="w-2.5 h-2.5" />
                  <span>
                    {dueStatus.label}
                    {item.due_time ? ` ${item.due_time}` : ''}
                  </span>
                </span>
              )}

              {item.when_cue && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 capitalize font-medium">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{item.when_cue}</span>
                </span>
              )}

              {item.estimate_minutes && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-mono">
                  <span>~{item.estimate_minutes}m</span>
                </span>
              )}

              {item.note && (
                <span className="text-text-muted truncate max-w-[180px] italic">
                  "{item.note}"
                </span>
              )}
            </div>
          )}

          {/* Progressive Details Panel */}
          {isTask && showDetails && (
            <div className="mt-2 p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/10 space-y-2 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Due Date & Time */}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <input
                    type="date"
                    value={item.due_date || ''}
                    onChange={(e) => onUpdate(item.id, 'due_date', e.target.value || null)}
                    className="px-2 py-1 text-xs bg-bg-primary border border-black/10 dark:border-white/10 rounded text-text-primary outline-none"
                  />
                  <input
                    type="time"
                    value={item.due_time || ''}
                    onChange={(e) => onUpdate(item.id, 'due_time', e.target.value || null)}
                    className="px-2 py-1 text-xs bg-bg-primary border border-black/10 dark:border-white/10 rounded text-text-primary outline-none"
                    title="Optional time"
                  />
                </div>

                {/* When Cue */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-text-muted">When:</span>
                  {['Morning', 'Afternoon', 'Evening'].map((cue) => (
                    <button
                      key={cue}
                      type="button"
                      onClick={() =>
                        onUpdate(item.id, 'when_cue', item.when_cue === cue ? null : cue)
                      }
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                        item.when_cue === cue
                          ? 'bg-blue-500 text-white font-semibold'
                          : 'bg-black/5 dark:bg-white/10 text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {cue}
                    </button>
                  ))}
                </div>

                {/* Estimate */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-text-muted">Est:</span>
                  {[5, 15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() =>
                        onUpdate(
                          item.id,
                          'estimate_minutes',
                          item.estimate_minutes === mins ? null : mins
                        )
                      }
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono transition-colors ${
                        item.estimate_minutes === mins
                          ? 'bg-purple-500 text-white font-semibold'
                          : 'bg-black/5 dark:bg-white/10 text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Note / Additional details */}
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Additional note, URL, or instruction..."
                  value={item.note || ''}
                  onChange={(e) => onUpdate(item.id, 'note', e.target.value)}
                  className="w-full px-2.5 py-1 text-xs bg-bg-primary border border-black/10 dark:border-white/10 rounded text-text-primary placeholder:text-text-muted outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Collapsed Header Badge */}
        {isHeader && nestedCount > 0 && (
          <button
            type="button"
            onClick={() => onToggleCollapse && onToggleCollapse(item.id)}
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full mt-2 transition-colors shrink-0 ${
              isCollapsed
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                : 'bg-black/5 dark:bg-white/5 text-text-muted opacity-70 hover:opacity-100'
            }`}
          >
            {isCollapsed ? `${nestedCount} hidden` : `${nestedCount} items`}
          </button>
        )}

        {/* Right Action Icons (Star, More Details, Delete) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0">
          {isTask && !readOnly && (
            <>
              <button
                type="button"
                onClick={() => onUpdate(item.id, 'is_critical', !item.is_critical)}
                className={`p-1 rounded transition-colors ${
                  item.is_critical
                    ? 'text-amber-500'
                    : 'text-text-muted hover:text-amber-500 hover:bg-amber-500/10'
                }`}
                title={item.is_critical ? 'Critical Task (Starred)' : 'Mark as critical'}
                aria-label="Toggle critical task"
              >
                <Star
                  className={`w-3.5 h-3.5 ${item.is_critical ? 'fill-amber-500' : ''}`}
                />
              </button>

              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className={`p-1 rounded transition-colors ${
                  showDetails
                    ? 'bg-black/10 dark:bg-white/15 text-text-primary'
                    : 'text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                title={showDetails ? 'Hide details' : 'Item details (due, cue, note)'}
                aria-label="Toggle item details"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
              title="Delete item"
              aria-label="Delete item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
// Main Component: ChecklistEditor
// -----------------------------------------------------------------
export default function ChecklistEditor({ noteId, content, onChange, readOnly }) {
  const isTemplate = content?.isTemplate || false;
  const { showToast } = useToastStore();
  const { openSoftDelete } = useConfirmStore();

  const confettiCanvasRef = useRef(null);
  const celebrationFiredRef = useRef(false);
  const inputRefs = useRef(new Map());

  // Local state
  const [showCompleted, setShowCompleted] = useState(true);
  const [showBrainDumpModal, setShowBrainDumpModal] = useState(false);
  const [brainDumpInput, setBrainDumpInput] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState(new Set());

  // 1. Fetch checklist items from Dexie
  const rawItems = useLiveQuery(() => {
    if (!noteId) return [];
    if (noteId.startsWith('starter-kit-')) {
      return getStarterKitItems(noteId);
    }
    return db.checklist_items.where('note_id').equals(noteId).sortBy('sort_order');
  }, [noteId]) || [];

  const items = useMemo(() => rawItems, [rawItems]);

  // Fetch current note object for title & metadata
  const currentNote = useLiveQuery(() => (noteId ? db.notes.get(noteId) : null), [noteId]);

  // 2. Collapse sections toggle
  const toggleSectionCollapse = (headerId) => {
    setCollapsedSections((prev) => {
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

    items.forEach((item) => {
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

  // Partition items into Active vs Completed
  const { activeItems, completedItems, taskItems, totalTasks, completedTasks, progressPercent } =
    useMemo(() => {
      const active = [];
      const completed = [];
      const tasks = [];

      items.forEach((item) => {
        if (hiddenItemIds.has(item.id)) return;

        const isTask = item.item_type === 'task' || !item.item_type;
        if (isTask) tasks.push(item);

        if (isTask && isItemCompleted(item)) {
          completed.push(item);
        } else {
          active.push(item);
        }
      });

      const total = tasks.length;
      const done = tasks.filter((i) => isItemCompleted(i)).length;
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);

      return {
        activeItems: active,
        completedItems: completed,
        taskItems: tasks,
        totalTasks: total,
        completedTasks: done,
        progressPercent: pct,
      };
    }, [items, hiddenItemIds]);

  // Goal gradient hint calculation
  const goalGradientHint = useMemo(() => {
    if (totalTasks === 0) return 'Add your first task to begin';
    const remaining = totalTasks - completedTasks;
    if (remaining === 0) return '🎉 All tasks done! Outstanding work.';
    if (remaining === 1) return '🎯 Just 1 task left — finish strong!';
    if (remaining <= 3) return `⚡ Only ${remaining} tasks to go — almost there!`;
    if (progressPercent >= 50) return `🚀 Over halfway done (${progressPercent}%) — great momentum!`;
    return `${completedTasks} of ${totalTasks} completed (${progressPercent}%)`;
  }, [totalTasks, completedTasks, progressPercent]);

  // 3. Celebration moment when 100% done
  useEffect(() => {
    if (totalTasks > 0 && completedTasks === totalTasks) {
      if (!celebrationFiredRef.current) {
        celebrationFiredRef.current = true;
        const prefersReducedMotion =
          window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReducedMotion && confettiCanvasRef.current) {
          fireCelebrationConfetti(confettiCanvasRef.current);
        }
      }
    } else {
      celebrationFiredRef.current = false;
    }
  }, [totalTasks, completedTasks]);

  // 4. Auto-remove empty untitled items when unmounting
  useEffect(() => {
    return () => {
      if (noteId && !readOnly) {
        db.checklist_items
          .where('note_id')
          .equals(noteId)
          .filter((i) => !i.text || !i.text.trim())
          .delete()
          .catch(console.error);
      }
    };
  }, [noteId, readOnly]);

  // 5. Input ref callback map
  const setInputRef = (id, el) => {
    if (el) inputRefs.current.set(id, el);
    else inputRefs.current.delete(id);
  };

  // -------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------
  const addItem = async (type = 'task', afterId = null) => {
    const newId = generateUUID();
    let targetOrder = Date.now();

    if (afterId) {
      const idx = items.findIndex((i) => i.id === afterId);
      if (idx !== -1) {
        const curOrder = items[idx].sort_order || Date.now();
        const nextOrder = items[idx + 1] ? items[idx + 1].sort_order : curOrder + 2000;
        targetOrder = Math.floor((curOrder + nextOrder) / 2);
      }
    }

    const newItem = {
      id: newId,
      note_id: noteId,
      parent_item_id: null,
      item_type: type,
      text: '',
      is_completed: 0,
      completedAt: null,
      due_date: null,
      due_time: null,
      when_cue: null,
      estimate_minutes: null,
      note: '',
      is_critical: false,
      sort_order: targetOrder,
    };

    await db.checklist_items.add(newItem);

    // Auto-focus next tick
    setTimeout(() => {
      const el = inputRefs.current.get(newId);
      if (el) el.focus();
    }, 50);

    return newId;
  };

  const updateItem = async (id, field, value) => {
    if (field === 'is_completed') {
      const willBeDone = Boolean(value);
      await toggleChecklistItemCompletion(id, willBeDone);

      // Show toast with Undo
      const targetItem = items.find((i) => i.id === id);
      showToast({
        message: willBeDone
          ? `Checked off "${targetItem?.text || 'task'}"`
          : `Unchecked "${targetItem?.text || 'task'}"`,
        duration: 3500,
        action: {
          label: 'Undo',
          onClick: async () => {
            await toggleChecklistItemCompletion(id, !willBeDone);
          },
        },
      });
    } else {
      await db.checklist_items.update(id, { [field]: value });
    }
  };

  const updateItemMultiple = async (id, updates) => {
    await db.checklist_items.update(id, updates);
  };

  const removeItem = async (id) => {
    const targetItem = items.find((i) => i.id === id);
    if (!targetItem) return;

    // Check children
    const children = items.filter((i) => i.parent_item_id === id);

    await db.checklist_items.delete(id);
    for (const c of children) {
      await db.checklist_items.delete(c.id);
    }

    // Undo toast
    showToast({
      message: `Deleted "${targetItem.text || 'item'}"`,
      duration: 4000,
      action: {
        label: 'Undo',
        onClick: async () => {
          await db.checklist_items.add(targetItem);
          if (children.length > 0) {
            await db.checklist_items.bulkAdd(children);
          }
        },
      },
    });
  };

  // Keyboard navigation & fast capture (Enter, Backspace, Tab, Shift+Tab)
  const handleKeyDown = async (e, item) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await addItem('task', item.id);
    } else if (e.key === 'Backspace' && (!item.text || item.text.trim() === '')) {
      e.preventDefault();
      const idx = items.findIndex((i) => i.id === item.id);
      await db.checklist_items.delete(item.id);
      // Focus previous item
      if (idx > 0) {
        const prevId = items[idx - 1].id;
        setTimeout(() => {
          const el = inputRefs.current.get(prevId);
          if (el) el.focus();
        }, 50);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const idx = items.findIndex((i) => i.id === item.id);
      if (!e.shiftKey) {
        // Indent: Make child of previous item if top-level
        if (idx > 0) {
          const prevItem = items[idx - 1];
          if (!prevItem.parent_item_id) {
            await db.checklist_items.update(item.id, { parent_item_id: prevItem.id });
          }
        }
      } else {
        // Outdent
        if (item.parent_item_id) {
          await db.checklist_items.update(item.id, { parent_item_id: null });
        }
      }
    } else if (e.key === 'ArrowUp') {
      const idx = items.findIndex((i) => i.id === item.id);
      if (idx > 0) {
        e.preventDefault();
        const prevId = items[idx - 1].id;
        const el = inputRefs.current.get(prevId);
        if (el) el.focus();
      }
    } else if (e.key === 'ArrowDown') {
      const idx = items.findIndex((i) => i.id === item.id);
      if (idx < items.length - 1) {
        e.preventDefault();
        const nextId = items[idx + 1].id;
        const el = inputRefs.current.get(nextId);
        if (el) el.focus();
      }
    }
  };

  // Multi-line paste handler (Brain Dump from clipboard)
  const handlePasteLines = async (currentItemId, rawText) => {
    const parsed = parseBrainDump(rawText);
    if (parsed.length === 0) return;

    const idx = items.findIndex((i) => i.id === currentItemId);
    let baseOrder = items[idx] ? items[idx].sort_order + 100 : Date.now();

    const newItems = [];
    let lastParentId = null;

    parsed.forEach((p, i) => {
      const itemId = generateUUID();
      const isSub = p.isIndented && lastParentId !== null;

      newItems.push({
        id: itemId,
        note_id: noteId,
        parent_item_id: isSub ? lastParentId : null,
        item_type: p.item_type,
        text: p.text,
        is_completed: p.isCompleted ? 1 : 0,
        completedAt: p.isCompleted ? formatLocalDate() : null,
        due_date: null,
        due_time: null,
        when_cue: null,
        estimate_minutes: null,
        note: '',
        is_critical: false,
        sort_order: baseOrder + i * 10,
      });

      if (!isSub && p.item_type === 'task') {
        lastParentId = itemId;
      }
    });

    await db.checklist_items.bulkAdd(newItems);
    showToast({ message: `Added ${newItems.length} items from pasted list!` });
  };

  // Drag and Drop reordering
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

    await db.transaction('rw', db.checklist_items, async () => {
      let currentOrder = Date.now() - 20000;
      for (let i = 0; i < reordered.length; i++) {
        await db.checklist_items.update(reordered[i].id, { sort_order: currentOrder + i * 10 });
      }
    });
  };

  // Reset checklist / Start again
  const handleStartAgain = async () => {
    await db.transaction('rw', db.checklist_items, async () => {
      for (const item of items) {
        await db.checklist_items.update(item.id, { is_completed: 0, completedAt: null });
      }
    });
    celebrationFiredRef.current = false;
    showToast({ message: 'Checklist reset — ready to tackle again!' });
  };

  // Save as Template
  const handleSaveAsTemplate = () => {
    onChange({ ...(content || {}), isTemplate: true });
    showToast({ message: 'Saved as template!' });
  };

  // Archive checklist
  const handleArchiveChecklist = async () => {
    if (!currentNote) return;
    await archiveItem({
      id: currentNote.id,
      type: 'note',
      title: currentNote.title || 'Checklist',
      workspace: 'checklists',
    });
    showToast({ message: 'Checklist archived' });
  };

  // Share & Export Actions
  const handleShareText = async () => {
    const text = generateChecklistExportText(currentNote?.title, items);
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentNote?.title || 'Checklist',
          text,
        });
        showToast({ message: 'Shared successfully!' });
        return;
      } catch (err) {}
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      showToast({ message: 'Copied checklist text to clipboard!' });
    } catch (err) {
      showToast({ message: 'Failed to copy text' });
    }
  };

  const handleDownloadMarkdown = () => {
    const text = generateChecklistExportText(currentNote?.title, items);
    const filename = `${(currentNote?.title || 'checklist').toLowerCase().replace(/\s+/g, '-')}.md`;
    downloadFile(filename, text, 'text/markdown');
    showToast({ message: `Downloaded ${filename}` });
  };

  const handleDownloadText = () => {
    const text = generateChecklistExportText(currentNote?.title, items);
    const filename = `${(currentNote?.title || 'checklist').toLowerCase().replace(/\s+/g, '-')}.txt`;
    downloadFile(filename, text, 'text/plain');
    showToast({ message: `Downloaded ${filename}` });
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-3xl pb-16 relative">
      {/* Confetti canvas for all-done celebration */}
      <canvas
        ref={confettiCanvasRef}
        className="absolute inset-0 pointer-events-none z-30 w-full h-full"
      />

      {/* -------------------------------------------------------------
          1. HEADER CARD: PROGRESS RING + GOAL GRADIENT + ACTIONS
      ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 p-4 sm:p-5 bg-card-default border border-black/5 dark:border-white/10 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Progress Ring & Hint */}
          <div className="flex items-center gap-3.5 min-w-0">
            {/* SVG Circular Ring */}
            <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-black/5 dark:text-white/10"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500 transition-all duration-500 ease-out"
                  strokeDasharray={`${progressPercent}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-mono text-[11px] font-bold text-text-primary">
                {progressPercent}%
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-primary">
                  {completedTasks} of {totalTasks} done
                </span>
                {totalTasks > completedTasks && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {totalTasks - completedTasks} left
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted truncate mt-0.5 font-medium">
                {goalGradientHint}
              </p>
            </div>
          </div>

          {/* Quick Header Action Buttons (Paste List, Share, Template Mode) */}
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowBrainDumpModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-text-primary text-xs font-medium transition-all shadow-xs active:scale-95"
                title="Paste multi-line text to import items"
              >
                <ListPlus className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Paste List</span>
              </button>
            )}

            {/* Share / Export Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-text-primary text-xs font-medium transition-all shadow-xs active:scale-95"
                title="Share & Export"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-9 w-48 bg-card-default border border-black/10 dark:border-white/10 rounded-xl shadow-xl z-40 p-1.5 text-xs space-y-0.5 animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      handleShareText();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 text-text-primary"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Share as text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      handleDownloadMarkdown();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 text-text-primary"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    <span>Download (.md)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      handleDownloadText();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 text-text-primary"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    <span>Download (.txt)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      window.print();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 text-text-primary"
                  >
                    <Printer className="w-3.5 h-3.5 text-purple-500" />
                    <span>Print checklist</span>
                  </button>
                </div>
              )}
            </div>

            {/* Template Mode Toggle */}
            <label className="flex items-center gap-2 cursor-pointer group px-2 py-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5">
              <input
                type="checkbox"
                className="hidden"
                checked={isTemplate}
                onChange={(e) => onChange({ ...(content || {}), isTemplate: e.target.checked })}
                disabled={readOnly}
              />
              <div
                className={`relative w-8 h-4 rounded-full transition-colors ${
                  isTemplate ? 'bg-emerald-500' : 'bg-black/20 dark:bg-white/20'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                    isTemplate ? 'left-4' : 'left-0.5'
                  }`}
                />
              </div>
              <span className="text-[11px] font-semibold text-text-muted">Template</span>
            </label>
          </div>
        </div>

        {/* Thin Emerald Progress Bar */}
        <div className="w-full h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. FINISH CELEBRATION MOMENT (When 100% complete)
      ------------------------------------------------------------- */}
      {totalTasks > 0 && completedTasks === totalTasks && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 border border-emerald-500/30 text-center space-y-3 animate-in fade-in zoom-in-95">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-text-primary">
              All Tasks Cleared!
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Everything in this checklist is completed. What would you like to do next?
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleStartAgain}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-bg-primary text-text-primary text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition-all active:scale-95 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
              <span>Start Again</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAsTemplate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-bg-primary text-text-primary text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 transition-all active:scale-95 shadow-xs"
            >
              <Copy className="w-3.5 h-3.5 text-blue-500" />
              <span>Save as Template</span>
            </button>
            <button
              type="button"
              onClick={handleArchiveChecklist}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all active:scale-95 shadow-xs"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive Checklist</span>
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          3. ACTIVE ITEMS LIST (With dnd-kit)
      ------------------------------------------------------------- */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={activeItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1.5">
            {activeItems.map((item) => (
              <SortableItem
                key={item.id}
                id={item.id}
                item={item}
                isTemplate={isTemplate}
                readOnly={readOnly}
                onUpdate={updateItem}
                onUpdateMultiple={updateItemMultiple}
                onRemove={removeItem}
                onKeyDown={handleKeyDown}
                onPasteText={handlePasteLines}
                isCollapsed={collapsedSections.has(item.id)}
                nestedCount={headerCounts[item.id] || 0}
                onToggleCollapse={toggleSectionCollapse}
                inputRefCallback={setInputRef}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* -------------------------------------------------------------
          4. COMPLETED ITEMS ACCORDION ("Done (N)")
      ------------------------------------------------------------- */}
      {completedItems.length > 0 && (
        <div className="pt-2 border-t border-black/5 dark:border-white/5">
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 py-1 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-200 ${
                showCompleted ? 'rotate-90' : ''
              }`}
            />
            <span>Done ({completedItems.length})</span>
          </button>

          {showCompleted && (
            <div className="space-y-1 mt-2 pl-2 border-l-2 border-emerald-500/20">
              {completedItems.map((item) => (
                <SortableItem
                  key={item.id}
                  id={item.id}
                  item={item}
                  isTemplate={isTemplate}
                  readOnly={readOnly}
                  onUpdate={updateItem}
                  onUpdateMultiple={updateItemMultiple}
                  onRemove={removeItem}
                  onKeyDown={handleKeyDown}
                  onPasteText={handlePasteLines}
                  isCollapsed={false}
                  nestedCount={0}
                  onToggleCollapse={() => {}}
                  inputRefCallback={setInputRef}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          5. TOOLBAR (Add Task, Add Header, Add Note)
      ------------------------------------------------------------- */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => addItem('task')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Task</span>
          </button>
          <button
            type="button"
            onClick={() => addItem('header')}
            className="flex items-center gap-1.5 px-3 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 rounded-xl text-xs font-medium text-text-primary transition-colors"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Add Header</span>
          </button>
          <button
            type="button"
            onClick={() => addItem('note')}
            className="flex items-center gap-1.5 px-3 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 rounded-xl text-xs font-medium text-text-primary transition-colors"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBrainDumpModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 rounded-xl text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            <ListPlus className="w-3.5 h-3.5 text-emerald-500" />
            <span>Brain Dump / Paste</span>
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------
          6. BRAIN DUMP ("PASTE LIST") MODAL
      ------------------------------------------------------------- */}
      {showBrainDumpModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowBrainDumpModal(false)}
        >
          <div
            className="w-full max-w-lg bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-text-primary">
                  Brain Dump / Paste List
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBrainDumpModal(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Paste lines from an email, doc, or notes. Bullets (-, *, •), numbers (1.), and checkboxes ([ ], [x], ☐, ☑) are cleaned automatically. Indented lines become sub-items.
            </p>

            <textarea
              rows={8}
              autoFocus
              value={brainDumpInput}
              onChange={(e) => setBrainDumpInput(e.target.value)}
              placeholder={`Groceries:
- Milk
- Eggs
  - Organic brown
- Sourdough Bread`}
              className="w-full p-3 text-xs bg-bg-primary border border-black/10 dark:border-white/10 rounded-xl text-text-primary placeholder:text-text-muted/50 font-mono outline-none resize-none focus:ring-1 focus:ring-emerald-500/50"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-muted">
                {parseBrainDump(brainDumpInput).length} items detected
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBrainDumpModal(false)}
                  className="px-3.5 py-1.5 rounded-xl hover:bg-black/5 text-xs text-text-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!brainDumpInput.trim()}
                  onClick={() => {
                    handlePasteLines(items[items.length - 1]?.id || null, brainDumpInput);
                    setBrainDumpInput('');
                    setShowBrainDumpModal(false);
                  }}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Import Items
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
