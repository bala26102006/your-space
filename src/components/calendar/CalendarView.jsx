import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Filter, 
  Settings2, 
  CheckSquare, 
  Repeat, 
  BookOpen, 
  Sparkles, 
  Palette, 
  StickyNote,
  MoreVertical,
  Check
} from 'lucide-react';
import { 
  getMonthGrid, 
  formatMonthYearTitle, 
  getTodayStr, 
  parseLocalDate, 
  formatLocalDate,
  getWeekStartSetting, 
  setWeekStartSetting,
  subscribeToMidnightRollover 
} from '../../lib/calendar/calendarUtils';
import { 
  CALENDAR_LAYERS, 
  getCalendarItemsForRange, 
  getLayerFilterPreferences, 
  setLayerFilterPreferences,
  calendarCache 
} from '../../lib/calendar/calendarService';
import MonthGrid from './MonthGrid';
import DayDetailPanel from './DayDetailPanel';
import { useLiveQuery } from '../../hooks/useLiveQuery';

const SOURCE_ICON_COMPONENTS = {
  checklists: CheckSquare,
  routines: Repeat,
  journal: BookOpen,
  wishlist: Sparkles,
  sketch: Palette,
  quicknotes: StickyNote,
  events: CalendarIcon,
};

/**
 * CalendarView ("Life Lens")
 * Wall Calendar personality with tear-off binder holes, unified multi-panel lens,
 * layer filters, and accessible month navigation.
 */
export default function CalendarView() {
  const todayStr = getTodayStr();

  // Current viewed month/year
  const todayObj = parseLocalDate(todayStr);
  const [currentYear, setCurrentYear] = useState(todayObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayObj.getMonth() + 1); // 1-12

  // Selected date for day detail
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);

  // Settings & Filter states
  const [weekStart, setWeekStart] = useState(() => getWeekStartSetting());
  const [layerFilter, setLayerFilter] = useState(() => getLayerFilterPreferences());
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Auto-update if midnight passes
  useEffect(() => {
    return subscribeToMidnightRollover((newTodayStr) => {
      // Trigger re-render with new today
    });
  }, []);

  // Compute 6x7 grid matrix
  const gridData = useMemo(() => {
    return getMonthGrid(currentYear, currentMonth, weekStart);
  }, [currentYear, currentMonth, weekStart]);

  // Fetch normalized items across the visible 42-day range
  const visibleItems = useLiveQuery(
    async () => {
      const items = await getCalendarItemsForRange(gridData.startDateStr, gridData.endDateStr);
      return items;
    },
    [gridData.startDateStr, gridData.endDateStr]
  ) || [];

  // Group items by date for O(1) cell lookup
  const itemsByDate = useMemo(() => {
    const map = {};
    visibleItems.forEach(item => {
      if (!map[item.date]) {
        map[item.date] = [];
      }
      map[item.date].push(item);
    });
    return map;
  }, [visibleItems]);

  // Selected day's items
  const selectedDayItems = useMemo(() => {
    return itemsByDate[selectedDate] || [];
  }, [itemsByDate, selectedDate]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = parseLocalDate(getTodayStr());
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setSelectedDate(getTodayStr());
  };

  // Toggle layer chip
  const toggleLayer = (layerId) => {
    setLayerFilter(prev => {
      const next = { ...prev, [layerId]: !prev[layerId] };
      setLayerFilterPreferences(next);
      return next;
    });
  };

  // Toggle week start
  const handleToggleWeekStart = (start) => {
    setWeekStart(start);
    setWeekStartSetting(start);
    setShowMoreMenu(false);
  };

  // Month-Year title e.g. "October 2026"
  const title = formatMonthYearTitle(currentYear, currentMonth);

  // Month list for picker
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="calendar-container @container flex-1 min-w-0 h-full flex flex-col select-none relative">
      {/* 1. Tear-Off Header with CSS Binder Holes */}
      <div className="bg-card-default border border-[var(--border)] rounded-2xl shadow-card overflow-hidden mb-4 shrink-0 calendar-tearoff-header">
        {/* CSS-Only Binder Holes Bar */}
        <div className="calendar-binder-track" aria-hidden="true">
          <div className="calendar-binder-ring" />
          <div className="calendar-binder-ring" />
          <div className="calendar-binder-ring" />
          <div className="calendar-binder-ring" />
          <div className="calendar-binder-ring hidden sm:block" />
          <div className="calendar-binder-ring hidden sm:block" />
          <div className="calendar-binder-ring hidden md:block" />
          <div className="calendar-binder-ring hidden md:block" />
        </div>

        {/* Main Controls Row */}
        <div className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 bg-[var(--header-band)]">
          {/* Left: Month Year Title + Navigation Arrows + Today Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMonthPicker(v => !v)}
                className="font-heading text-xl sm:text-2xl font-bold text-text-primary tracking-tight hover:text-[var(--accent)] transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg px-1.5 py-0.5"
                title="Change month or year"
              >
                <span>{title}</span>
                <span className="text-xs text-text-muted font-normal opacity-70">▾</span>
              </button>

              {/* Month / Year Picker Popover */}
              {showMonthPicker && (
                <div 
                  className="absolute left-0 top-full mt-1.5 z-50 bg-[var(--paper)] border border-[var(--border)] rounded-2xl p-3 shadow-xl w-64 max-w-[90vw] grid grid-cols-3 gap-1.5"
                  role="dialog"
                  aria-label="Select month"
                >
                  <div className="col-span-3 flex items-center justify-between pb-2 mb-1 border-b border-[var(--border)]">
                    <span className="text-xs font-bold text-text-primary">{currentYear}</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setCurrentYear(y => y - 1)}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-text-muted"
                      >
                        -1y
                      </button>
                      <button 
                        onClick={() => setCurrentYear(y => y + 1)}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-text-muted"
                      >
                        +1y
                      </button>
                    </div>
                  </div>

                  {monthNames.map((mName, idx) => {
                    const mNum = idx + 1;
                    const isCur = mNum === currentMonth;
                    return (
                      <button
                        key={mName}
                        type="button"
                        onClick={() => {
                          setCurrentMonth(mNum);
                          setShowMonthPicker(false);
                        }}
                        className={`text-xs py-1.5 px-2 rounded-xl font-medium transition-all ${
                          isCur
                            ? 'bg-[var(--accent)] text-[var(--btn-fg)] font-bold'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 text-text-primary'
                        }`}
                      >
                        {mName.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Prev / Next Buttons */}
            <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--paper)] p-0.5 shadow-xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="p-1.5 sm:p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="p-1.5 sm:p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Today Jump Button */}
            <button
              type="button"
              onClick={handleJumpToToday}
              className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--paper)] hover:border-[var(--accent)] text-xs font-semibold text-text-primary hover:text-[var(--accent)] shadow-xs transition-all active:scale-95 min-h-[36px] flex items-center justify-center"
            >
              Today
            </button>
          </div>

          {/* Right: More Menu (Week start settings) */}
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMoreMenu(v => !v)}
              aria-label="Calendar options"
              className="p-2 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center shadow-xs"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* More Menu Dropdown */}
            {showMoreMenu && (
              <div 
                className="absolute right-0 top-full mt-1.5 z-50 bg-[var(--paper)] border border-[var(--border)] rounded-2xl p-2 shadow-xl w-52"
                role="menu"
              >
                <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-2 py-1 mb-1">
                  Week Starts On
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleWeekStart('monday')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-text-primary transition-colors text-left"
                >
                  <span>Monday (Default)</span>
                  {weekStart === 'monday' && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleWeekStart('sunday')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-text-primary transition-colors text-left"
                >
                  <span>Sunday</span>
                  {weekStart === 'sunday' && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Layer Filter Chips Row */}
        <div className="px-3.5 py-2.5 border-t border-[var(--border)] bg-[var(--paper)] flex flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mr-1 hidden sm:inline">
            Layers:
          </span>

          {Object.values(CALENDAR_LAYERS).map((layer) => {
            const Icon = SOURCE_ICON_COMPONENTS[layer.id] || CheckSquare;
            const isActive = layerFilter[layer.id] !== false;

            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => toggleLayer(layer.id)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-xs border select-none active:scale-95 ${
                  isActive
                    ? 'border-transparent text-text-primary'
                    : 'opacity-40 border-dashed border-[var(--border)] bg-transparent text-text-muted'
                }`}
                style={{
                  backgroundColor: isActive ? layer.bgToken : 'transparent',
                  color: isActive ? undefined : undefined,
                }}
              >
                <span style={{ color: layer.colorToken }} className="shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="truncate">{layer.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Content Area: Month Grid + Day Detail Panel */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 items-stretch overflow-hidden">
        {/* Month Grid */}
        <MonthGrid
          gridData={gridData}
          itemsByDate={itemsByDate}
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            setSelectedDate(d);
            setIsDayDetailOpen(true);
          }}
          onOpenDayDetail={(d) => {
            setSelectedDate(d);
            setIsDayDetailOpen(true);
          }}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          weekStart={weekStart}
          layerFilter={layerFilter}
        />

        {/* Day Detail Panel (side panel on wide, collapsible drawer on narrow) */}
        {isDayDetailOpen && (
          <DayDetailPanel
            selectedDate={selectedDate}
            items={selectedDayItems}
            onClose={() => setIsDayDetailOpen(false)}
            layerFilter={layerFilter}
          />
        )}
      </div>
    </div>
  );
}
