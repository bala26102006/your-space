import React, { useRef, useState } from 'react';
import { 
  getWeekdayHeaders, 
  isSameDay, 
  parseLocalDate, 
  formatLocalDate,
  getTodayStr 
} from '../../lib/calendar/calendarUtils';
import { Check } from 'lucide-react';
import { rescheduleCalendarItem } from '../../lib/calendar/calendarService';

/**
 * MonthGrid
 * Simple, calm month calendar grid.
 * Fits 1280x720 without page scroll (flex column with min-h-0 and rows minmax(72px, 1fr)).
 * Past days show small dots only. Today and future days show up to 2 chips with colored left edge + "+N more".
 * Journal is ONE mood-colored dot per day.
 * Routines (if enabled) show ONE tiny completion dot per day.
 * Done items show checkmark and lighter tone, NO strikethrough.
 * HTML5 drag-and-drop support for due tasks and wishes.
 */
export default function MonthGrid({
  gridData,
  itemsByDate = {},
  selectedDate,
  onSelectDate,
  onOpenDayDetail,
  onPrevMonth,
  onNextMonth,
  weekStart = 'monday',
  layerFilter = {},
}) {
  const gridRef = useRef(null);
  const todayStr = getTodayStr();
  const [dropTargetDate, setDropTargetDate] = useState(null);

  const weekdayHeaders = getWeekdayHeaders(weekStart);
  const { cells, year, month } = gridData;

  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    if (item.source !== 'checklists' && item.source !== 'wishlist' && item.source !== 'events') {
      return;
    }
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: item.id,
      source: item.source,
      type: item.type,
      title: item.title,
      date: item.date,
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, dateStr) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetDate !== dateStr) {
      setDropTargetDate(dateStr);
    }
  };

  const handleDragLeave = (e, dateStr) => {
    if (dropTargetDate === dateStr) {
      setDropTargetDate(null);
    }
  };

  const handleDrop = async (e, targetDateStr) => {
    e.preventDefault();
    setDropTargetDate(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const item = JSON.parse(dataStr);
      if (item && item.id && item.date !== targetDateStr) {
        await rescheduleCalendarItem(item, targetDateStr);
      }
    } catch (err) {
      console.error('Failed to reschedule on drop:', err);
    }
  };

  // Keyboard navigation handler for the grid
  const handleKeyDown = (e, currentIndex) => {
    let targetIndex = null;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        targetIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        targetIndex = Math.min(cells.length - 1, currentIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        targetIndex = Math.max(0, currentIndex - 7);
        break;
      case 'ArrowDown':
        e.preventDefault();
        targetIndex = Math.min(cells.length - 1, currentIndex + 7);
        break;
      case 'Home':
        e.preventDefault();
        targetIndex = currentIndex - (currentIndex % 7);
        break;
      case 'End':
        e.preventDefault();
        targetIndex = currentIndex - (currentIndex % 7) + 6;
        break;
      case 'PageUp':
        e.preventDefault();
        if (onPrevMonth) onPrevMonth();
        return;
      case 'PageDown':
        e.preventDefault();
        if (onNextMonth) onNextMonth();
        return;
      case 't':
      case 'T':
        e.preventDefault();
        onSelectDate(todayStr);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelectDate(cells[currentIndex].dateStr);
        if (onOpenDayDetail) onOpenDayDetail(cells[currentIndex].dateStr);
        return;
      case 'Escape':
        e.preventDefault();
        if (onOpenDayDetail) onOpenDayDetail(null);
        return;
      default:
        return;
    }

    if (targetIndex !== null && targetIndex >= 0 && targetIndex < cells.length) {
      const targetDate = cells[targetIndex].dateStr;
      onSelectDate(targetDate);
      const el = gridRef.current?.querySelector(`[data-date="${targetDate}"]`);
      if (el) el.focus();
    }
  };

  return (
    <div 
      ref={gridRef}
      className="flex-1 min-h-0 flex flex-col bg-card-default border border-[var(--border)] rounded-2xl shadow-card overflow-hidden select-none"
      role="grid"
      aria-label={`${cells[15]?.year || year} Month Calendar`}
    >
      {/* Weekday Header Row */}
      <div 
        className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--raised)] text-xs font-semibold text-text-muted shrink-0"
        role="row"
      >
        {weekdayHeaders.map((hdr, idx) => {
          const isWeekend = (weekStart === 'monday' && (idx === 5 || idx === 6)) || (weekStart === 'sunday' && (idx === 0 || idx === 6));
          return (
            <div
              key={idx}
              className={`py-2 text-center truncate tracking-wider uppercase text-[11px] font-bold ${
                isWeekend ? 'bg-black/[0.015] dark:bg-white/[0.015]' : ''
              }`}
              role="columnheader"
              aria-label={hdr.short}
            >
              <span className="hidden sm:inline">{hdr.short}</span>
              <span className="sm:hidden">{hdr.letter}</span>
            </div>
          );
        })}
      </div>

      {/* 6x7 Day Cells Grid: flex-1 with rows minmax(72px, 1fr) */}
      <div 
        className="flex-1 min-h-0 grid grid-cols-7 [grid-template-rows:repeat(6,minmax(72px,1fr))] divide-x divide-y divide-[var(--border)] overflow-hidden"
      >
        {cells.map((cell, idx) => {
          const rawItems = itemsByDate[cell.dateStr] || [];
          
          // Filter items based on layer toggles
          const visibleItems = rawItems.filter(item => layerFilter[item.source] !== false);

          const isPast = cell.dateStr < todayStr;
          const isToday = cell.isToday;
          const isSelected = isSameDay(cell.dateStr, selectedDate);
          const isCurrentMonth = cell.isCurrentMonth;
          const isDropTarget = dropTargetDate === cell.dateStr;

          // Weekend check for subtle tint
          const colIndex = idx % 7;
          const isWeekendCol = (weekStart === 'monday' && (colIndex === 5 || colIndex === 6)) || 
                               (weekStart === 'sunday' && (colIndex === 0 || colIndex === 6));

          // 1. Separate Journal entries to guarantee ONE mood dot per day
          const journalEntries = visibleItems.filter(i => i.source === 'journal');
          const primaryMoodColor = journalEntries.length > 0 ? (journalEntries[0].colorToken || '#D97706') : null;

          // 2. Separate Routines to guarantee ONE completion dot per day
          const routineEntries = visibleItems.filter(i => i.source === 'routines');
          let routineDotColor = null;
          if (routineEntries.length > 0 && layerFilter.routines) {
            const allDone = routineEntries.every(r => r.status === 'done');
            const anyDone = routineEntries.some(r => r.status === 'done');
            routineDotColor = allDone ? '#10B981' : (anyDone ? '#F59E0B' : (isPast ? '#EF4444' : '#0284C7'));
          }

          // 3. Due items (checklist tasks and wishes) + Events
          const dueTasks = visibleItems.filter(i => i.source === 'checklists' && i.type === 'task');
          const wishes = visibleItems.filter(i => i.source === 'wishlist');
          const events = visibleItems.filter(i => i.source === 'events');
          const sketches = visibleItems.filter(i => i.source === 'sketch');
          const quicknotes = visibleItems.filter(i => i.source === 'quicknotes');

          // Actionable items for chips (today/future days)
          const chipItems = [...events, ...dueTasks, ...wishes];
          const displayChips = chipItems.slice(0, 2);
          const overflowCount = chipItems.length - 2;

          // Item count label for screen readers
          const ariaLabel = `${cell.dateStr}: ${visibleItems.length} items${isToday ? ', Today' : ''}`;

          return (
            <div
              key={cell.dateStr}
              data-date={cell.dateStr}
              tabIndex={isSelected ? 0 : -1}
              role="gridcell"
              aria-label={ariaLabel}
              aria-selected={isSelected}
              onClick={() => {
                onSelectDate(cell.dateStr);
                if (onOpenDayDetail) onOpenDayDetail(cell.dateStr);
              }}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onDragOver={(e) => handleDragOver(e, cell.dateStr)}
              onDragLeave={(e) => handleDragLeave(e, cell.dateStr)}
              onDrop={(e) => handleDrop(e, cell.dateStr)}
              className={`group relative flex flex-col p-1 sm:p-1.5 transition-colors duration-150 cursor-pointer min-h-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:z-20 ${
                !isCurrentMonth
                  ? 'bg-black/[0.02] dark:bg-white/[0.02] text-text-muted opacity-40'
                  : isWeekendCol
                  ? 'bg-black/[0.012] dark:bg-white/[0.012] text-text-primary'
                  : 'bg-[var(--paper)] text-text-primary'
              } ${
                isSelected
                  ? 'ring-2 ring-inset ring-[var(--accent)] bg-[var(--accent-soft)]/20 z-10'
                  : 'hover:bg-[var(--raised)]/50'
              } ${
                isDropTarget
                  ? 'ring-2 ring-dashed ring-[var(--accent)] bg-[var(--accent-soft)]/40 z-20'
                  : ''
              }`}
            >
              {/* Day Number Row */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center justify-center text-xs font-semibold rounded-full w-6 h-6 transition-all ${
                    isToday
                      ? 'bg-[var(--accent)] text-[var(--btn-fg)] font-bold shadow-xs'
                      : isSelected
                      ? 'ring-2 ring-[var(--accent)] text-[var(--accent-text)] font-bold'
                      : ''
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {/* Single Mood Dot indicator if present and on future/today day */}
                {!isPast && primaryMoodColor && (
                  <span 
                    style={{ backgroundColor: primaryMoodColor }}
                    title="Journal mood entry"
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                  />
                )}
              </div>

              {/* Day Cell Body */}
              <div className="flex-1 min-h-0 flex flex-col justify-start gap-1 overflow-hidden">
                {/* PAST DAYS: Small dots only */}
                {isPast ? (
                  <div className="flex flex-wrap gap-1 items-center mt-auto pb-0.5">
                    {/* Due tasks dots */}
                    {dueTasks.slice(0, 3).map(t => (
                      <span 
                        key={t.key}
                        style={{ backgroundColor: t.colorToken || '#10B981' }}
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.status === 'done' ? 'opacity-40' : ''}`}
                        title={`Task: ${t.title}`}
                      />
                    ))}

                    {/* Wishes dots */}
                    {wishes.slice(0, 2).map(w => (
                      <span 
                        key={w.key}
                        style={{ backgroundColor: w.colorToken || '#8B5CF6' }}
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        title={`Wish: ${w.title}`}
                      />
                    ))}

                    {/* Events dots */}
                    {events.slice(0, 2).map(e => (
                      <span 
                        key={e.key}
                        style={{ backgroundColor: e.colorToken || '#0F766E' }}
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        title={`Event: ${e.title}`}
                      />
                    ))}

                    {/* ONE Journal mood dot */}
                    {primaryMoodColor && (
                      <span 
                        style={{ backgroundColor: primaryMoodColor }}
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        title="Journal mood"
                      />
                    )}

                    {/* ONE Routine completion dot */}
                    {routineDotColor && (
                      <span 
                        style={{ backgroundColor: routineDotColor }}
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        title="Routines status"
                      />
                    )}

                    {/* Sketch dots if enabled */}
                    {sketches.slice(0, 1).map(s => (
                      <span 
                        key={s.key}
                        style={{ backgroundColor: s.colorToken || '#F97316' }}
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        title={`Sketch: ${s.title}`}
                      />
                    ))}

                    {/* Note dots if enabled */}
                    {quicknotes.slice(0, 1).map(n => (
                      <span 
                        key={n.key}
                        style={{ backgroundColor: n.colorToken || '#F59E0B' }}
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        title={`Note: ${n.title}`}
                      />
                    ))}
                  </div>
                ) : (
                  /* TODAY & FUTURE DAYS: Up to 2 one-line chips + "+N more" */
                  <div className="flex flex-col gap-1 overflow-hidden">
                    {displayChips.map((item) => {
                      const isDone = item.status === 'done';
                      const isDraggable = item.source === 'checklists' || item.source === 'wishlist' || item.source === 'events';

                      return (
                        <div
                          key={item.key}
                          draggable={isDraggable}
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragEnd={() => setDropTargetDate(null)}
                          style={{ borderLeftColor: item.colorToken }}
                          className={`text-[10px] leading-tight px-1.5 py-0.5 rounded border-l-2 truncate transition-all select-none ${
                            isDraggable ? 'cursor-grab active:cursor-grabbing' : ''
                          } ${
                            isDone
                              ? 'opacity-60 bg-black/[0.03] dark:bg-white/[0.03] text-text-muted font-normal'
                              : 'bg-black/[0.04] dark:bg-white/[0.06] text-text-primary font-medium hover:bg-black/[0.08] dark:hover:bg-white/[0.1]'
                          }`}
                          title={`${item.title} (${item.subtitle || item.source})`}
                        >
                          {isDone && <Check className="w-2.5 h-2.5 inline mr-1 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                          <span>{item.title}</span>
                        </div>
                      );
                    })}

                    {/* "+N more" label */}
                    {overflowCount > 0 && (
                      <span className="text-[9.5px] font-semibold text-text-muted px-1 mt-auto">
                        +{overflowCount} more
                      </span>
                    )}

                    {/* Tiny dots row for journal mood and routines on today/future */}
                    <div className="flex items-center gap-1 mt-auto pb-0.5">
                      {routineDotColor && (
                        <span 
                          style={{ backgroundColor: routineDotColor }}
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          title="Routines"
                        />
                      )}
                      {sketches.length > 0 && layerFilter.sketch && (
                        <span 
                          className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"
                          title="Sketches"
                        />
                      )}
                      {quicknotes.length > 0 && layerFilter.quicknotes && (
                        <span 
                          className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                          title="Notes"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* One-Line Legend Under the Grid */}
      <div 
        className="flex items-center justify-center gap-4 sm:gap-6 py-2 px-3 text-[11px] text-text-muted border-t border-[var(--border)] bg-[var(--raised)] shrink-0 overflow-x-auto no-scrollbar"
        aria-hidden="true"
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>Due task</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
          <span>Wish</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
          <span>Event</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          <span>Journal mood</span>
        </div>
      </div>
    </div>
  );
}
