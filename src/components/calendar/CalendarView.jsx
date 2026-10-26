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
  Check,
  Plus
} from 'lucide-react';
import { 
  getMonthGrid, 
  getWeekDays,
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
import WeekView from './WeekView';
import AgendaView from './AgendaView';
import YearView from './YearView';
import DayDetailPanel from './DayDetailPanel';
import CountdownsStrip from './CountdownsStrip';
import QuickAddModal from './QuickAddModal';
import EventModal from './EventModal';
import MoveDateModal from './MoveDateModal';
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

const VIEW_TABS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'year', label: 'Year' },
];

/**
 * CalendarView ("Life Lens")
 * Wall Calendar personality with tear-off binder holes, unified multi-panel lens,
 * layer filters, view switcher (Month, Week, Agenda, Year), and Quick Add / Rescheduling.
 */
export default function CalendarView() {
  const todayStr = getTodayStr();
  const todayObj = parseLocalDate(todayStr);

  // Active view: 'month' | 'week' | 'agenda' | 'year'
  const [activeView, setActiveView] = useState(() => {
    try {
      return localStorage.getItem('calendar_active_view') || 'month';
    } catch {
      return 'month';
    }
  });

  const handleViewChange = (view) => {
    setActiveView(view);
    try {
      localStorage.setItem('calendar_active_view', view);
    } catch {}
  };

  // Current viewed month/year
  const [currentYear, setCurrentYear] = useState(todayObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(todayObj.getMonth() + 1); // 1-12

  // Selected date for day detail & week reference
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);

  // Modal states
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState(todayStr);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventModalDate, setEventModalDate] = useState(todayStr);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [movingItem, setMovingItem] = useState(null);

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

  // Query range calculation based on active view
  const queryRange = useMemo(() => {
    if (activeView === 'agenda') {
      const now = parseLocalDate(todayStr);
      const past45 = new Date(now);
      past45.setDate(now.getDate() - 45); // 45 days back to include overdue items
      const future30 = new Date(now);
      future30.setDate(now.getDate() + 30);
      return {
        startDateStr: formatLocalDate(past45),
        endDateStr: formatLocalDate(future30),
      };
    }
    if (activeView === 'week') {
      const week = getWeekDays(selectedDate, weekStart);
      return {
        startDateStr: week.startDateStr,
        endDateStr: week.endDateStr,
      };
    }
    return {
      startDateStr: gridData.startDateStr,
      endDateStr: gridData.endDateStr,
    };
  }, [activeView, todayStr, selectedDate, weekStart, gridData.startDateStr, gridData.endDateStr]);

  // Fetch normalized items across the visible range
  const visibleItems = useLiveQuery(
    async () => {
      const items = await getCalendarItemsForRange(queryRange.startDateStr, queryRange.endDateStr);
      return items;
    },
    [queryRange.startDateStr, queryRange.endDateStr]
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

  // Selected day's items - if present in itemsByDate use that, else query selectedDate specifically
  const selectedDateSpecificItems = useLiveQuery(
    async () => {
      if (!selectedDate) return [];
      if (selectedDate >= queryRange.startDateStr && selectedDate <= queryRange.endDateStr) {
        return itemsByDate[selectedDate] || [];
      }
      return await getCalendarItemsForRange(selectedDate, selectedDate);
    },
    [selectedDate, queryRange.startDateStr, queryRange.endDateStr, itemsByDate]
  ) || [];

  const selectedDayItems = (selectedDate >= queryRange.startDateStr && selectedDate <= queryRange.endDateStr)
    ? (itemsByDate[selectedDate] || [])
    : selectedDateSpecificItems;

  // Month names for picker & title
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Navigation handlers
  const handlePrev = () => {
    if (activeView === 'year') {
      setCurrentYear(y => y - 1);
    } else if (activeView === 'week') {
      const cur = parseLocalDate(selectedDate);
      cur.setDate(cur.getDate() - 7);
      const newDateStr = formatLocalDate(cur);
      setSelectedDate(newDateStr);
      setCurrentYear(cur.getFullYear());
      setCurrentMonth(cur.getMonth() + 1);
    } else if (activeView === 'agenda') {
      const cur = parseLocalDate(selectedDate);
      cur.setDate(cur.getDate() - 14);
      const newDateStr = formatLocalDate(cur);
      setSelectedDate(newDateStr);
      setCurrentYear(cur.getFullYear());
      setCurrentMonth(cur.getMonth() + 1);
    } else {
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear(y => y - 1);
      } else {
        setCurrentMonth(m => m - 1);
      }
    }
  };

  const handleNext = () => {
    if (activeView === 'year') {
      setCurrentYear(y => y + 1);
    } else if (activeView === 'week') {
      const cur = parseLocalDate(selectedDate);
      cur.setDate(cur.getDate() + 7);
      const newDateStr = formatLocalDate(cur);
      setSelectedDate(newDateStr);
      setCurrentYear(cur.getFullYear());
      setCurrentMonth(cur.getMonth() + 1);
    } else if (activeView === 'agenda') {
      const cur = parseLocalDate(selectedDate);
      cur.setDate(cur.getDate() + 14);
      const newDateStr = formatLocalDate(cur);
      setSelectedDate(newDateStr);
      setCurrentYear(cur.getFullYear());
      setCurrentMonth(cur.getMonth() + 1);
    } else {
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear(y => y + 1);
      } else {
        setCurrentMonth(m => m + 1);
      }
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

  // Action callbacks for modals
  const handleOpenQuickAdd = (targetDate = selectedDate || todayStr) => {
    setQuickAddDate(targetDate);
    setIsQuickAddOpen(true);
  };

  const handleOpenEventModal = (existing = null, targetDate = selectedDate || todayStr) => {
    setEditingEvent(existing);
    setEventModalDate(targetDate);
    setIsEventModalOpen(true);
  };

  const handleOpenMoveModal = (item) => {
    setMovingItem(item);
    setIsMoveModalOpen(true);
  };

  // Header Title based on view
  const title = useMemo(() => {
    if (activeView === 'year') {
      return `${currentYear}`;
    }
    if (activeView === 'week') {
      const week = getWeekDays(selectedDate, weekStart);
      const startObj = parseLocalDate(week.startDateStr);
      const endObj = parseLocalDate(week.endDateStr);
      const startM = monthNames[startObj.getMonth()].slice(0, 3);
      const endM = monthNames[endObj.getMonth()].slice(0, 3);
      if (startM === endM) {
        return `${startM} ${startObj.getDate()} – ${endObj.getDate()}, ${startObj.getFullYear()}`;
      }
      return `${startM} ${startObj.getDate()} – ${endM} ${endObj.getDate()}, ${startObj.getFullYear()}`;
    }
    if (activeView === 'agenda') {
      return `Agenda — ${currentYear}`;
    }
    return formatMonthYearTitle(currentYear, currentMonth);
  }, [activeView, currentYear, currentMonth, selectedDate, weekStart]);

  return (
    <div className="calendar-container @container flex-1 min-w-0 flex flex-col select-none relative pb-8">
      {/* 1. Tear-Off Header with CSS Binder Holes */}
      <div className="bg-card-default border border-[var(--border)] rounded-2xl shadow-card overflow-hidden mb-3 shrink-0 calendar-tearoff-header">
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
          {/* Left: Title + Navigation Arrows + Today Button */}
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
                onClick={handlePrev}
                aria-label="Previous"
                className="p-1.5 sm:p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next"
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

          {/* Center / Right: View Switcher + Quick Add + More Options */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Switcher Tabs: Month | Week | Agenda | Year */}
            <div 
              className="flex items-center p-0.5 rounded-xl border border-[var(--border)] bg-[var(--paper)] shadow-2xs"
              role="tablist"
              aria-label="Calendar view switcher"
            >
              {VIEW_TABS.map((tab) => {
                const isActive = activeView === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleViewChange(tab.id)}
                    className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-all active:scale-95 min-h-[30px] ${
                      isActive
                        ? 'bg-[var(--accent)] text-[var(--btn-fg)] shadow-xs font-bold'
                        : 'text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Add Button */}
            <button
              type="button"
              onClick={() => handleOpenQuickAdd(selectedDate || todayStr)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--btn-bg)] text-[var(--btn-fg)] hover:opacity-90 text-xs font-semibold shadow-xs transition-all active:scale-95 min-h-[36px]"
              title="Add event, task, or wish"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>

            {/* More Menu (Week start settings) */}
            <div className="relative flex items-center">
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

      {/* 2. Countdowns Strip (Exams, Birthdays, Trips) */}
      <CountdownsStrip
        events={upcomingCountdowns}
        onSelectEvent={(evt) => {
          handleOpenEventModal(evt.raw || evt, evt.date);
        }}
      />

      {/* 3. Main Content Area based on activeView */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 items-stretch">
        {activeView === 'month' && (
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
            onPrevMonth={handlePrev}
            onNextMonth={handleNext}
            weekStart={weekStart}
            layerFilter={layerFilter}
          />
        )}

        {activeView === 'week' && (
          <WeekView
            referenceDate={selectedDate}
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
            onQuickAdd={(d) => handleOpenQuickAdd(d)}
            onMoveItem={(item) => handleOpenMoveModal(item)}
            weekStart={weekStart}
            layerFilter={layerFilter}
          />
        )}

        {activeView === 'agenda' && (
          <AgendaView
            visibleItems={visibleItems}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setIsDayDetailOpen(true);
            }}
            onOpenDayDetail={(d) => {
              setSelectedDate(d);
              setIsDayDetailOpen(true);
            }}
            onMoveItem={(item) => handleOpenMoveModal(item)}
            layerFilter={layerFilter}
          />
        )}

        {activeView === 'year' && (
          <YearView
            year={currentYear}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setIsDayDetailOpen(true);
            }}
            onOpenDayDetail={(d) => {
              setSelectedDate(d);
              setIsDayDetailOpen(true);
            }}
          />
        )}

        {/* Day Detail Panel */}
        {isDayDetailOpen && (
          <DayDetailPanel
            selectedDate={selectedDate}
            items={selectedDayItems}
            onClose={() => setIsDayDetailOpen(false)}
            layerFilter={layerFilter}
            onQuickAdd={handleOpenQuickAdd}
            onEditEvent={handleOpenEventModal}
            onMoveItem={handleOpenMoveModal}
          />
        )}
      </div>

      {/* 4. Modals */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        targetDate={quickAddDate}
      />

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
    </div>
  );
}

