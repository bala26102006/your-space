import React, { useState } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  MoveRight, 
  MoreVertical,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  getWeekDays, 
  getTodayStr, 
  formatLocalDate, 
  parseLocalDate,
  isSameDay 
} from '../../lib/calendar/calendarUtils';
import { rescheduleCalendarItem } from '../../lib/calendar/calendarService';
import { useUIStore } from '../../store/uiStore';

/**
 * WeekView
 * 7 columns of stacked items (not an artificial time grid).
 * Supports pointer drag & drop to reschedule items, plus accessible move buttons.
 */
export default function WeekView({
  referenceDate,
  itemsByDate = {},
  selectedDate,
  onSelectDate,
  onOpenDayDetail,
  onQuickAdd,
  onMoveItem,
  onEditEvent,
  weekStart = 'monday',
  layerFilter = {},
}) {
  const todayStr = getTodayStr();
  const weekData = getWeekDays(referenceDate, weekStart);

  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);

  // Filter items according to active layer toggles
  const getVisibleItemsForDate = (dateStr) => {
    const list = itemsByDate[dateStr] || [];
    return list.filter(item => layerFilter[item.source] !== false);
  };

  // Drag & Drop handlers
  const handleDragStart = (e, item) => {
    // Only checklists, wishes, and events are draggable
    if (item.source === 'routines' || item.source === 'journal' || item.source === 'sketch' || item.source === 'quicknotes') {
      e.preventDefault();
      return;
    }
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, dateStr) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr);
    }
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e, targetDateStr) => {
    e.preventDefault();
    setDragOverDate(null);
    if (!draggedItem || draggedItem.date === targetDateStr) {
      setDraggedItem(null);
      return;
    }

    await rescheduleCalendarItem(draggedItem, targetDateStr);
    setDraggedItem(null);
  };

  const handleItemClick = (e, item) => {
    e.stopPropagation();
    if (item.source === 'events' && onEditEvent) {
      onEditEvent(item.payload?.raw || item, item.date);
      return;
    }
    const payload = item.payload || {};
    useUIStore.setState({
      activeWorkspace: payload.workspace || item.source,
      selectedProjectId: payload.projectId || null,
      selectedSubprojectId: payload.subprojectId || null,
      selectedNoteId: payload.noteId || item.id,
      searchQuery: '',
      activeTagId: null,
    });
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-card-default border border-[var(--border)] rounded-2xl shadow-card overflow-hidden select-none min-h-[480px]">
      {/* 7 Columns Container */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
        {weekData.days.map((day) => {
          const visibleItems = getVisibleItemsForDate(day.dateStr);
          const isSelected = isSameDay(day.dateStr, selectedDate);
          const isDragTarget = dragOverDate === day.dateStr;

          return (
            <div
              key={day.dateStr}
              onDragOver={(e) => handleDragOver(e, day.dateStr)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day.dateStr)}
              onClick={() => {
                onSelectDate(day.dateStr);
                if (onOpenDayDetail) onOpenDayDetail(day.dateStr);
              }}
              className={`flex flex-col min-h-[160px] sm:min-h-0 sm:h-full p-2 transition-colors duration-150 ${
                isDragTarget
                  ? 'bg-[var(--accent-soft)]/50 ring-2 ring-inset ring-[var(--accent)]'
                  : isSelected
                  ? 'bg-[var(--accent-soft)]/15'
                  : 'bg-[var(--paper)] hover:bg-[var(--raised)]/40'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)] shrink-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-bold rounded-full min-w-[24px] h-[24px] px-1 ${
                      day.isToday
                        ? 'bg-[var(--accent)] text-[var(--btn-fg)] shadow-xs'
                        : isSelected
                        ? 'text-[var(--accent-text)]'
                        : 'text-text-primary'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {day.shortLabel}
                  </span>
                </div>

                {/* Quick Add Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAdd(day.dateStr);
                  }}
                  title={`Quick add item to ${day.dateStr}`}
                  className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stacked Items List */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5 no-scrollbar">
                {visibleItems.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-text-muted opacity-40 italic py-4">
                    Empty
                  </div>
                ) : (
                  visibleItems.map((item) => {
                    const isDraggable = item.source === 'checklists' || item.source === 'wishlist' || item.source === 'events';
                    const isDone = item.status === 'done';
                    const isOverdue = item.status === 'overdue';

                    return (
                      <div
                        key={item.key}
                        draggable={isDraggable}
                        onDragStart={(e) => handleDragStart(e, item)}
                        onClick={(e) => handleItemClick(e, item)}
                        style={{ borderLeftColor: item.colorToken }}
                        className={`group relative p-2 rounded-xl border border-black/5 dark:border-white/5 border-l-3 bg-card-default shadow-2xs hover:shadow-xs transition-all cursor-pointer select-none ${
                          isDraggable ? 'cursor-grab active:cursor-grabbing' : ''
                        } ${
                          isDone ? 'opacity-60 line-through' : ''
                        } ${
                          isOverdue ? 'bg-red-500/5' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-medium leading-snug line-clamp-2 ${
                            isDone ? 'text-text-muted' : isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-text-primary'
                          }`}>
                            {item.title}
                          </p>

                          {/* Accessible Move to Date Button */}
                          {isDraggable && onMoveItem && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMoveItem(item);
                              }}
                              title="Reschedule to another date"
                              className="p-0.5 rounded text-text-muted hover:text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              <MoveRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {item.subtitle && (
                          <p className="text-[10px] text-text-muted truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
