import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  MoreVertical,
  Check,
  Plus,
  AlertCircle
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
  getUpcomingCountdowns,
  calendarCache 
} from '../../lib/calendar/calendarService';
import MonthGrid from './MonthGrid';
import DayDetailPanel from './DayDetailPanel';
import CountdownsStrip from './CountdownsStrip';
import EventModal from './EventModal';
import MoveDateModal from './MoveDateModal';
import OverdueReviewModal from './OverdueReviewModal';
import { useLiveQuery } from '../../hooks/useLiveQuery';

/**
 * CalendarView
 * Simple, calm month calendar:
 * - One compact header row
 * - Slim upcoming events countdown strip
 * - Single month grid fitting 1280x720 without page scroll
 * - Responsive Day Panel
 * - Full keyboard navigation and offline support
 */
export default function CalendarView() {
  const todayStr = getTodayStr();
  const todayObj = parseLocalDate(todayStr);

  // Current viewed month/year
  const [currentYear, setCurrentYear] = useState(todayObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayObj.getMonth() + 1); // 1-12

  // Selected date for day detail
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventModalDate, setEventModalDate] = useState(todayStr);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [movingItem, setMovingItem] = useState(null);

  const [isOverdueReviewOpen, setIsOverdueReviewOpen] = useState(false);

  // Settings & Filter states
  const [weekStart, setWeekStart] = useState(() => getWeekStartSetting());
  const [layerFilter, setLayerFilter] = useState(() => getLayerFilterPreferences());
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Auto-update if midnight passes
  useEffect(() => {
    return subscribeToMidnightRollover(() => {
      // Midnight rollover subscriber triggers re-render
    });
  }, []);

  // Compute 6x7 grid matrix
  const gridData = useMemo(() => {
    return getMonthGrid(currentYear, currentMonth, weekStart);
  }, [currentYear, currentMonth, weekStart]);

  // Fetch normalized items across the visible range
  const visibleItems = useLiveQuery(
    async () => {
      const items = await getCalendarItemsForRange(gridData.startDateStr, gridData.endDateStr);
      return items;
    },
    [gridData.startDateStr, gridData.endDateStr]
  ) || [];

  // Fetch upcoming countdowns
  const upcomingCountdowns = useLiveQuery(
    async () => {
      return await getUpcomingCountdowns(3);
    },
    []
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

  // Selected day items
  const selectedDayItems = useMemo(() => {
    return itemsByDate[selectedDate] || [];
  }, [itemsByDate, selectedDate]);

  // Genuine overdue checklist tasks and target wishes (strictly excluding routines, past events, sketches, notes)
  const overdueItems = useMemo(() => {
    return visibleItems.filter(i => {
      if (i.status === 'done' || i.status === 'info') return false;
      if (i.source === 'routines' || i.source === 'events' || i.source === 'sketch' || i.source === 'quicknotes') return false;
      return i.date < todayStr;
    });
  }, [visibleItems, todayStr]);

  // Month names for picker
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Navigation handlers
  const handlePrev = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNext = () => {
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

  // Toggle layer checkbox in More menu
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

  // Action callbacks
  const handleOpenAddEvent = (targetDate = selectedDate || todayStr) => {
    setEditingEvent(null);
    setEventModalDate(targetDate);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (evt, targetDate = selectedDate || todayStr) => {
    setEditingEvent(evt);
    setEventModalDate(targetDate);
    setIsEventModalOpen(true);
  };

  const handleOpenMoveModal = (item) => {
    setMovingItem(item);
    setIsMoveModalOpen(true);
  };

  // Close menus on Escape key
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowMoreMenu(false);
        setShowMonthPicker(false);
        setIsDayDetailOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const headerTitle = formatMonthYearTitle(currentYear, currentMonth);

  return (
    <div className="calendar-container @container flex-1 min-h-0 flex flex-col select-none relative pb-2 overflow-hidden">
      {/* 1. Tear-Off Header with Slim Strip */}
      <div className="bg-card-default border border-[var(--border)] rounded-2xl shadow-card overflow-visible mb-2.5 shrink-0 calendar-tearoff-header">
        {/* Slim decorative strip (12-14px) */}
        <div className="h-3.5 bg-[var(--raised)] border-b border-[var(--border)] rounded-t-2xl" aria-hidden="true" />

        {/* Main Header Controls Row: EXACTLY ONE COMPACT ROW */}
        <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 bg-[var(--header-band)]">
          {/* Left: Month/Year Title & Picker + Nav Arrows + Today + Overdue chip */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMonthPicker(v => !v)}
                className="font-heading text-lg sm:text-xl font-bold text-text-primary tracking-tight hover:text-[var(--accent)] transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg px-1 py-0.5"
                title="Change month or year"
                aria-expanded={showMonthPicker}
              >
                <span>{headerTitle}</span>
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
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-text-muted text-xs"
                      >
                        -1y
                      </button>
                      <button 
                        onClick={() => setCurrentYear(y => y + 1)}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-text-muted text-xs"
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
            <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--paper)] p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous month"
                className="p-1 sm:p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next month"
                className="p-1 sm:p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Today Jump Button */}
            <button
              type="button"
              onClick={handleJumpToToday}
              className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--paper)] hover:border-[var(--accent)] text-xs font-semibold text-text-primary hover:text-[var(--accent)] shadow-2xs transition-all active:scale-95 min-h-[34px] flex items-center justify-center"
            >
              Today
            </button>

            {/* Small "N overdue" chip (ONLY when overdue items exist) */}
            {overdueItems.length > 0 && (
              <button
                type="button"
                onClick={() => setIsOverdueReviewOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-all active:scale-95 min-h-[28px]"
                title="Review overdue tasks"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{overdueItems.length} overdue</span>
              </button>
            )}
          </div>

          {/* Right: + Add Button + More Menu */}
          <div className="flex items-center gap-2">
            {/* + Add Button */}
            <button
              type="button"
              onClick={() => handleOpenAddEvent(selectedDate || todayStr)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--btn-bg)] text-[var(--btn-fg)] hover:opacity-90 text-xs font-semibold shadow-xs transition-all active:scale-95 min-h-[34px]"
              title="Add new event"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>

            {/* More Menu: Only "Week starts on" & "Show on calendar" */}
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => setShowMoreMenu(v => !v)}
                aria-label="Calendar settings and layers"
                aria-expanded={showMoreMenu}
                className="p-1.5 sm:p-2 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center shadow-2xs"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* More Menu Dropdown */}
              {showMoreMenu && (
                <div 
                  className="absolute right-0 top-full mt-1.5 z-50 bg-[var(--paper)] border border-[var(--border)] rounded-2xl p-2.5 shadow-xl w-60"
                  role="menu"
                >
                  <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-2 py-1 mb-1">
                    Week Starts On
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleWeekStart('monday')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-text-primary transition-colors text-left font-medium"
                  >
                    <span>Monday (Default)</span>
                    {weekStart === 'monday' && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleWeekStart('sunday')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-text-primary transition-colors text-left font-medium"
                  >
                    <span>Sunday</span>
                    {weekStart === 'sunday' && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                  </button>

                  <div className="my-1.5 border-t border-[var(--border)]" />

                  <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-2 py-1 mb-1">
                    Show on Calendar
                  </div>
                  <div className="space-y-0.5">
                    {Object.values(CALENDAR_LAYERS).map((layer) => {
                      const isChecked = layerFilter[layer.id] !== false;
                      return (
                        <label
                          key={layer.id}
                          className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-text-primary cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2">
                            <span 
                              style={{ backgroundColor: layer.colorToken }}
                              className="w-2 h-2 rounded-full shrink-0"
                            />
                            <span>{layer.label}</span>
                          </div>
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleLayer(layer.id)}
                            className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Upcoming Strip (Slim row under header, hidden when 0 events) */}
      <CountdownsStrip
        events={upcomingCountdowns}
        onSelectEvent={(evt) => {
          handleOpenEditEvent(evt.raw || evt, evt.date);
        }}
      />

      {/* 3. Main Month Grid & Day Panel: Fits 1280x720 */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 items-stretch overflow-hidden">
        <MonthGrid
          gridData={gridData}
          itemsByDate={itemsByDate}
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            if (d) {
              setSelectedDate(d);
              setIsDayDetailOpen(true);
            } else {
              setIsDayDetailOpen(false);
            }
          }}
          onOpenDayDetail={(d) => {
            if (d) {
              setSelectedDate(d);
              setIsDayDetailOpen(true);
            } else {
              setIsDayDetailOpen(false);
            }
          }}
          onPrevMonth={handlePrev}
          onNextMonth={handleNext}
          weekStart={weekStart}
          layerFilter={layerFilter}
        />

        {/* Day Detail Panel */}
        {isDayDetailOpen && (
          <DayDetailPanel
            selectedDate={selectedDate}
            items={selectedDayItems}
            onClose={() => setIsDayDetailOpen(false)}
            layerFilter={layerFilter}
            onAddEvent={handleOpenAddEvent}
            onEditEvent={handleOpenEditEvent}
            onMoveItem={handleOpenMoveModal}
          />
        )}
      </div>

      {/* 4. Modals */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
        }}
        initialDate={eventModalDate}
        existingEvent={editingEvent}
      />

      <MoveDateModal
        isOpen={isMoveModalOpen}
        onClose={() => {
          setIsMoveModalOpen(false);
          setMovingItem(null);
        }}
        item={movingItem}
      />

      <OverdueReviewModal
        isOpen={isOverdueReviewOpen}
        onClose={() => setIsOverdueReviewOpen(false)}
        overdueItems={overdueItems}
      />
    </div>
  );
}
