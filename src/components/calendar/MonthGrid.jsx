import React, { useRef, useEffect } from 'react';
import { 
  getWeekdayHeaders, 
  isSameDay, 
  parseLocalDate, 
  formatLocalDate,
  getTodayStr 
} from '../../lib/calendar/calendarUtils';
import { AlertCircle } from 'lucide-react';

/**
 * MonthGrid
 * Accessible, keyboard-navigable 6x7 month grid for "Life Lens".
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

  const weekdayHeaders = getWeekdayHeaders(weekStart);
  const { cells, year, month } = gridData;

  // Filter items according to active layer toggles
  const getVisibleItemsForDate = (dateStr) => {
    const list = itemsByDate[dateStr] || [];
    return list.filter(item => {
      if (layerFilter[item.source] === false) return false;
      return true;
    });
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
        // Jump to start of current row (week)
        targetIndex = currentIndex - (currentIndex % 7);
        break;
      case 'End':
        e.preventDefault();
        // Jump to end of current row (week)
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
      default:
        return;
    }

    if (targetIndex !== null && targetIndex >= 0 && targetIndex < cells.length) {
      const targetDate = cells[targetIndex].dateStr;
      onSelectDate(targetDate);

      // Focus target cell element
      const el = gridRef.current?.querySelector(`[data-date="${targetDate}"]`);
      if (el) el.focus();
    }
  };

  return (
    <div 
      ref={gridRef}
      className="flex-1 min-w-0 flex flex-col bg-card-default border border-[var(--border)] rounded-2xl shadow-card overflow-hidden select-none"
      role="grid"
      aria-label={`${cells[15]?.year || year} Calendar`}
    >
      {/* Weekday Header Row */}
      <div 
        className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--raised)] text-xs font-semibold text-text-muted"
        role="row"
      >
        {weekdayHeaders.map((hdr, idx) => (
          <div
            key={idx}
            className="py-2.5 text-center truncate tracking-wider uppercase text-[11px]"
            role="columnheader"
            aria-label={hdr.short}
          >
            <span className="hidden sm:inline">{hdr.short}</span>
            <span className="sm:hidden">{hdr.letter}</span>
          </div>
        ))}
      </div>

      {/* 6x7 Day Cells Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[var(--border)]">
        {cells.map((cell, idx) => {
          const visibleItems = getVisibleItemsForDate(cell.dateStr);
          const hasItems = visibleItems.length > 0;
          const isSelected = isSameDay(cell.dateStr, selectedDate);
          const hasOverdue = visibleItems.some(i => i.status === 'overdue');
          const isCurrentMonth = cell.isCurrentMonth;

          // Item count label for screen readers
          const ariaLabel = `${cell.dateStr}: ${visibleItems.length} ${visibleItems.length === 1 ? 'item' : 'items'}${cell.isToday ? ', Today' : ''}${hasOverdue ? ', has overdue items' : ''}`;

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
              className={`group relative flex flex-col p-1 sm:p-1.5 transition-colors duration-150 cursor-pointer min-h-[64px] sm:min-h-[82px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:z-20 ${
                !isCurrentMonth
                  ? 'bg-black/[0.02] dark:bg-white/[0.02] text-text-muted opacity-45'
                  : 'bg-[var(--paper)] text-text-primary'
              } ${
                hasItems && isCurrentMonth
                  ? 'bg-gradient-to-b from-transparent to-[var(--accent-soft)]/20'
                  : ''
              } ${
                isSelected
                  ? 'ring-2 ring-inset ring-[var(--accent)] bg-[var(--accent-soft)]/30 z-10'
                  : 'hover:bg-[var(--raised)]/60'
              }`}
            >
              {/* Day Header: Number + Overdue pip + Today highlight */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center justify-center text-xs font-semibold rounded-full min-w-[22px] h-[22px] px-1 transition-all ${
                    cell.isToday
                      ? 'bg-[var(--accent)] text-[var(--btn-fg)] font-bold shadow-xs'
                      : isSelected
                      ? 'text-[var(--accent-text)] font-bold'
                      : ''
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {/* Overdue Pip */}
                {hasOverdue && (
                  <span 
                    title="Contains overdue items"
                    className="flex items-center justify-center w-2 h-2 rounded-full bg-red-500 ring-2 ring-[var(--paper)] shrink-0"
                  />
                )}
              </div>

              {/* Day Content: Compact Chips on wide panes / Dots on narrow panes */}
              <div className="flex-1 min-h-0 flex flex-col justify-start gap-1 overflow-hidden">
                {/* 1. Desktop / Wide view: Compact Chips (up to 3 items) */}
                <div className="hidden @[480px]:flex flex-col gap-1 overflow-hidden">
                  {visibleItems.slice(0, 3).map((item) => (
                    <div
                      key={item.key}
                      style={{ borderLeftColor: item.colorToken }}
                      className={`text-[10.5px] leading-tight px-1.5 py-0.5 rounded border-l-2 truncate transition-opacity ${
                        item.status === 'done'
                          ? 'opacity-60 line-through bg-black/[0.03] dark:bg-white/[0.03] text-text-muted'
                          : item.status === 'overdue'
                          ? 'bg-red-500/10 text-red-700 dark:text-red-400 font-medium'
                          : 'bg-black/[0.04] dark:bg-white/[0.06] text-text-primary'
                      }`}
                      title={item.title}
                    >
                      {item.title}
                    </div>
                  ))}

                  {visibleItems.length > 3 && (
                    <span className="text-[9.5px] font-semibold text-text-muted px-1 mt-auto">
                      +{visibleItems.length - 3} more
                    </span>
                  )}
                </div>

                {/* 2. Compact / Mobile view: Colored Dots */}
                <div className="@[480px]:hidden flex flex-wrap gap-1 items-center mt-auto pb-0.5">
                  {visibleItems.slice(0, 4).map((item) => (
                    <span
                      key={item.key}
                      style={{ backgroundColor: item.colorToken }}
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        item.status === 'done' ? 'opacity-40' : ''
                      }`}
                      title={item.title}
                    />
                  ))}
                  {visibleItems.length > 4 && (
                    <span className="text-[8.5px] font-bold text-text-muted leading-none">
                      +{visibleItems.length - 4}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
