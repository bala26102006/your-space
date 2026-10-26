import React from 'react';
import { 
  X, 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  ArrowUpRight,
  ChevronRight,
  BookOpen,
  CheckSquare,
  Repeat,
  Palette,
  StickyNote,
  Calendar as CalendarIcon,
  Smile,
  Plus,
  MoveRight
} from 'lucide-react';
import { 
  formatFullDayLabel, 
  getRelativeDateLabel, 
  getTodayStr,
  getCapacityLevel 
} from '../../lib/calendar/calendarUtils';
import { CALENDAR_LAYERS } from '../../lib/calendar/calendarService';
import { useUIStore } from '../../store/uiStore';
import CalendarEmptyState from './CalendarEmptyState';
import OnThisDaySection from './OnThisDaySection';

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
 * DayDetailPanel
 * Side panel on wide panes, bottom sheet on narrow panes.
 * Displays items for the selected date grouped by layer, with calm past/future language.
 */
export default function DayDetailPanel({
  selectedDate,
  items = [],
  onClose,
  layerFilter = {},
  onQuickAdd,
  onEditEvent,
  onMoveItem,
}) {
  const { setActiveWorkspace, setSelectedNoteId, setSelectedProjectId, setSelectedSubprojectId } = useUIStore();

  const todayStr = getTodayStr();
  const isPast = selectedDate < todayStr;
  const isToday = selectedDate === todayStr;
  const isFuture = selectedDate > todayStr;

  const fullDateLabel = formatFullDayLabel(selectedDate);
  const relativeLabel = getRelativeDateLabel(selectedDate, todayStr);

  // Filter items according to active layer toggles
  const visibleItems = items.filter(item => layerFilter[item.source] !== false);

  // Group items by layer
  const grouped = {};
  visibleItems.forEach(item => {
    if (!grouped[item.source]) {
      grouped[item.source] = [];
    }
    grouped[item.source].push(item);
  });

  const layerKeys = Object.keys(grouped);
  const capacity = getCapacityLevel(visibleItems.length);

  // Open item in its native panel
  const handleOpenItem = (item) => {
    const payload = item.payload || {};
    const workspace = payload.workspace || item.source;

    useUIStore.setState({
      activeWorkspace: workspace,
      selectedProjectId: payload.projectId || null,
      selectedSubprojectId: payload.subprojectId || null,
      selectedNoteId: payload.noteId || item.id,
      searchQuery: '',
      activeTagId: null,
    });
  };

  const handleItemClick = (item) => {
    if (item.source === 'events' && onEditEvent) {
      onEditEvent(item.payload?.raw || item);
      return;
    }
    handleOpenItem(item);
  };

  return (
    <aside 
      className="flex flex-col bg-card-default border border-[var(--border)] rounded-2xl shadow-card overflow-hidden w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-120px)] transition-all duration-200"
      aria-label={`Details for ${fullDateLabel}`}
    >
      {/* Panel Top Header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--raised)] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isToday
                ? 'bg-[var(--accent)] text-[var(--btn-fg)]'
                : isPast
                ? 'bg-black/5 dark:bg-white/10 text-text-muted'
                : 'bg-[var(--accent-soft)] text-[var(--accent-text)]'
            }`}>
              {relativeLabel || (isPast ? 'Past' : 'Upcoming')}
            </span>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${capacity.badgeClass}`}>
              {capacity.label}
            </span>
          </div>

          <h2 className="font-heading text-base font-bold text-text-primary truncate">
            {fullDateLabel}
          </h2>
        </div>

        {/* Actions: Add Button & Close Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onQuickAdd && (
            <button
              type="button"
              onClick={() => onQuickAdd(selectedDate)}
              aria-label={`Add item to ${fullDateLabel}`}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-text-primary hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all flex items-center gap-1 text-xs font-semibold min-h-[38px] active:scale-95 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close day details"
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Panel Body: Items list or Empty state */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
        {visibleItems.length === 0 ? (
          <CalendarEmptyState
            title={isPast ? "Quiet in retrospect" : isToday ? "Clear horizon today" : "An open canvas"}
            subtitle={
              isPast
                ? "No entries or recorded tasks on this date."
                : isToday
                ? "Nothing due today. Enjoy your focused momentum!"
                : "No events, deadlines, or habits scheduled yet."
            }
          />
        ) : (
          layerKeys.map(sourceKey => {
            const layerDef = CALENDAR_LAYERS[sourceKey] || {
              label: sourceKey,
              colorToken: 'var(--accent)',
              textColor: 'text-text-primary',
            };
            const Icon = SOURCE_ICONS[sourceKey] || CheckSquare;
            const sourceItems = grouped[sourceKey];

            return (
              <div key={sourceKey} className="space-y-2">
                {/* Layer Group Header */}
                <div className="flex items-center justify-between text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <span 
                      style={{ color: layerDef.colorToken }}
                      className="shrink-0"
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[11px]">{layerDef.label}</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-70">
                    {sourceItems.length}
                  </span>
                </div>

                {/* Items in Layer */}
                <div className="space-y-1.5">
                  {sourceItems.map(item => {
                    const isDone = item.status === 'done';
                    const isOverdue = item.status === 'overdue';
                    const isMissed = item.status === 'missed';
                    const isDraggable = item.source === 'checklists' || item.source === 'wishlist' || item.source === 'events';

                    return (
                      <div
                        key={item.key}
                        onClick={() => handleItemClick(item)}
                        className="group flex items-center justify-between p-2.5 rounded-xl border border-black/5 dark:border-white/5 hover:border-[var(--accent)]/30 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-all cursor-pointer min-h-[44px]"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleItemClick(item);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Status Indicator */}
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : isOverdue ? (
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                          ) : isMissed ? (
                            <Circle className="w-4 h-4 text-red-400 opacity-60 shrink-0" />
                          ) : (
                            <span 
                              style={{ borderColor: item.colorToken }}
                              className="w-3.5 h-3.5 rounded-full border-2 shrink-0 opacity-70 group-hover:opacity-100"
                            />
                          )}

                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-medium truncate ${
                              isDone ? 'line-through opacity-60 text-text-muted' : 'text-text-primary'
                            }`}>
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-[10px] text-text-muted truncate">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions: Move to Date & Open Arrow */}
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {isDraggable && onMoveItem && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMoveItem(item);
                              }}
                              title="Reschedule to another date"
                              className="p-1 rounded-lg text-text-muted hover:text-[var(--accent)] hover:bg-black/5 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity"
                            >
                              <MoveRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* Historical Traces from Previous Years / Months */}
        <OnThisDaySection selectedDate={selectedDate} />
      </div>
    </aside>
  );
}
