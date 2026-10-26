import React from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Circle, 
  Calendar as CalendarIcon, 
  MoveRight, 
  Clock, 
  ChevronRight,
  BookOpen,
  CheckSquare,
  Repeat,
  Sparkles,
  Palette,
  StickyNote
} from 'lucide-react';
import { 
  getTodayStr, 
  parseLocalDate, 
  formatLocalDate, 
  formatFullDayLabel, 
  getRelativeDateLabel 
} from '../../lib/calendar/calendarUtils';
import { CALENDAR_LAYERS } from '../../lib/calendar/calendarService';
import { useUIStore } from '../../store/uiStore';
import CalendarEmptyState from './CalendarEmptyState';
import SmartRescheduleCard from './SmartRescheduleCard';

const SOURCE_ICONS = {
  checklists: CheckSquare,
  routines: Repeat,
  journal: BookOpen,
  wishlist: Sparkles,
  sketch: Palette,
  quicknotes: StickyNote,
  events: CalendarIcon,
};

/**
 * AgendaView
 * Linear stream view grouped into Overdue, Today, and Next 14 Days.
 * Ideal for narrow mobile viewports.
 */
export default function AgendaView({
  visibleItems = [],
  onSelectDate,
  onOpenDayDetail,
  onMoveItem,
  onEditEvent,
  layerFilter = {},
}) {
  const todayStr = getTodayStr();
  const { setActiveWorkspace, setSelectedNoteId, setSelectedProjectId, setSelectedSubprojectId } = useUIStore();

  // Filter items by layer preferences
  const items = visibleItems.filter(item => layerFilter[item.source] !== false);

  // Group items into Overdue, Today, and Next 14 Days
  const overdueItems = [];
  const todayItems = [];
  const upcomingByDate = {};

  // Compute 14 days threshold
  const now = parseLocalDate(todayStr);
  const max14 = new Date(now);
  max14.setDate(now.getDate() + 14);
  const max14Str = formatLocalDate(max14);

  items.forEach(item => {
    if (item.status === 'overdue' || (item.date < todayStr && item.status !== 'done' && item.status !== 'info')) {
      overdueItems.push(item);
    } else if (item.date === todayStr) {
      todayItems.push(item);
    } else if (item.date > todayStr && item.date <= max14Str) {
      if (!upcomingByDate[item.date]) {
        upcomingByDate[item.date] = [];
      }
      upcomingByDate[item.date].push(item);
    }
  });

  const upcomingDates = Object.keys(upcomingByDate).sort();

  const handleItemClick = (item) => {
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

  const renderItemRow = (item) => {
    const Icon = SOURCE_ICONS[item.source] || CheckSquare;
    const isDone = item.status === 'done';
    const isOverdue = item.status === 'overdue';
    const isDraggable = item.source === 'checklists' || item.source === 'wishlist' || item.source === 'events';

    return (
      <div
        key={item.key}
        onClick={() => handleItemClick(item)}
        className="group flex items-center justify-between p-3 rounded-xl border border-black/5 dark:border-white/5 bg-card-default hover:border-[var(--accent)]/30 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-all cursor-pointer min-h-[44px]"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Status Icon */}
          {isDone ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : isOverdue ? (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          ) : (
            <span 
              style={{ borderColor: item.colorToken }}
              className="w-4 h-4 rounded-full border-2 shrink-0 opacity-70 group-hover:opacity-100"
            />
          )}

          <div className="min-w-0 flex-1">
            <p className={`text-xs font-medium truncate ${
              isDone ? 'line-through text-text-muted opacity-60' : 'text-text-primary'
            }`}>
              {item.title}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-0.5">
              <span style={{ color: item.colorToken }} className="font-semibold uppercase tracking-wider">
                {item.source}
              </span>
              {item.subtitle && (
                <>
                  <span>•</span>
                  <span className="truncate">{item.subtitle}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reschedule Button */}
        {isDraggable && onMoveItem && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveItem(item);
            }}
            title="Reschedule"
            className="p-1 rounded-lg text-text-muted hover:text-[var(--accent)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors ml-2 shrink-0"
          >
            <MoveRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 min-w-0 space-y-6 select-none">
      {/* 1. OVERDUE SECTION (if any) */}
      {overdueItems.length > 0 && (
        <section className="bg-red-500/[0.04] border border-red-500/20 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              <span>Overdue Items ({overdueItems.length})</span>
            </div>
          </div>

          {/* Smart batch reschedule helper card */}
          <SmartRescheduleCard overdueItems={overdueItems} />

          <div className="space-y-1.5">
            {overdueItems.map(renderItemRow)}
          </div>
        </section>
      )}

      {/* 2. TODAY SECTION */}
      <section className="bg-card-default border border-[var(--border)] rounded-2xl p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                Today
              </span>
              <span className="text-xs text-text-muted font-medium">
                {formatFullDayLabel(todayStr)}
              </span>
            </div>
          </div>
          <span className="text-xs font-mono text-text-muted">
            {todayItems.length} {todayItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {todayItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-text-muted">
            No pending items due today. Enjoy the calm!
          </div>
        ) : (
          <div className="space-y-1.5">
            {todayItems.map(renderItemRow)}
          </div>
        )}
      </section>

      {/* 3. NEXT 14 DAYS SECTION */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider px-1">
          Next 14 Days
        </h3>

        {upcomingDates.length === 0 ? (
          <div className="p-8 text-center bg-card-default border border-[var(--border)] rounded-2xl text-xs text-text-muted">
            No items scheduled in the next 14 days.
          </div>
        ) : (
          upcomingDates.map(dateStr => {
            const dateItems = upcomingByDate[dateStr];
            const relative = getRelativeDateLabel(dateStr, todayStr);
            const fullDate = formatFullDayLabel(dateStr);

            return (
              <div 
                key={dateStr}
                className="bg-card-default border border-[var(--border)] rounded-2xl p-4 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-primary">
                      {relative}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {fullDate}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">
                    {dateItems.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {dateItems.map(renderItemRow)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
