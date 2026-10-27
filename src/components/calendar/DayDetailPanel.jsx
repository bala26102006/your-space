import React from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  Plus, 
  MoveRight, 
  Repeat, 
  Sparkles, 
  CheckSquare, 
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { formatFullDayLabel, getRelativeDateLabel, getTodayStr } from '../../lib/calendar/calendarUtils';
import { useUIStore } from '../../store/uiStore';

/**
 * DayDetailPanel
 * Side panel on wide panes, bottom sheet on narrow panes.
 * Groups: Events, Due, Wishes, Journal (1 row with mood + title),
 * and for past days one line "Routines: X of Y done" with a link.
 * An empty future day shows "Nothing planned for this day." and an Add event button.
 */
export default function DayDetailPanel({
  selectedDate,
  items = [],
  onClose,
  layerFilter = {},
  onAddEvent,
  onEditEvent,
  onMoveItem,
}) {
  const todayStr = getTodayStr();
  const isPast = selectedDate < todayStr;
  const isToday = selectedDate === todayStr;
  const isFuture = selectedDate > todayStr;

  const fullDateLabel = formatFullDayLabel(selectedDate);
  const relativeLabel = getRelativeDateLabel(selectedDate, todayStr);

  // Filter items based on active layers (except routines on past days which we show in the summary line)
  const visibleItems = items.filter(item => {
    if (item.source === 'routines' && isPast) return false; // Handled in routine summary line
    if (layerFilter[item.source] === false) return false;
    return true;
  });

  // Categorize items
  const events = visibleItems.filter(i => i.source === 'events');
  const dueTasks = visibleItems.filter(i => i.source === 'checklists' && i.type === 'task');
  const wishes = visibleItems.filter(i => i.source === 'wishlist');
  const journalEntries = visibleItems.filter(i => i.source === 'journal');
  const sketches = visibleItems.filter(i => i.source === 'sketch');
  const quicknotes = visibleItems.filter(i => i.source === 'quicknotes');

  // Routines summary for past days
  const routineItems = items.filter(i => i.source === 'routines');
  const routineTotal = routineItems.length;
  const routineDone = routineItems.filter(r => r.status === 'done').length;

  const hasAnyItems = events.length > 0 || dueTasks.length > 0 || wishes.length > 0 || journalEntries.length > 0 || sketches.length > 0 || quicknotes.length > 0;

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

  const handleOpenRoutines = () => {
    useUIStore.setState({
      activeWorkspace: 'routines',
      searchQuery: '',
    });
  };

  return (
    <aside 
      className="flex flex-col bg-card-default border border-[var(--border)] rounded-2xl shadow-card overflow-hidden w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(100vh-140px)] transition-all duration-200"
      aria-label={`Details for ${fullDateLabel}`}
    >
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-[var(--border)] bg-[var(--raised)] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isToday
                ? 'bg-[var(--accent)] text-[var(--btn-fg)] shadow-2xs'
                : isPast
                ? 'bg-black/5 dark:bg-white/10 text-text-muted'
                : 'bg-[var(--accent-soft)] text-[var(--accent-text)]'
            }`}>
              {relativeLabel || (isPast ? 'Past' : 'Upcoming')}
            </span>
          </div>

          <h2 className="font-heading text-base font-bold text-text-primary truncate">
            {fullDateLabel}
          </h2>
        </div>

        {/* Actions: + Add Event & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onAddEvent && onAddEvent(selectedDate)}
            aria-label={`Add event on ${fullDateLabel}`}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-text-primary hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all flex items-center gap-1 text-xs font-semibold min-h-[36px] active:scale-95 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close day panel"
            className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Past Routines Summary Line */}
        {isPast && routineTotal > 0 && (
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between text-xs text-sky-800 dark:text-sky-300">
            <div className="flex items-center gap-2">
              <Repeat className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="font-medium">
                Routines: {routineDone} of {routineTotal} done
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenRoutines}
              className="text-xs font-semibold hover:underline flex items-center gap-0.5 text-sky-600 dark:text-sky-400"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 1. EVENTS GROUP */}
        {events.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-text-muted uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Events</span>
              </span>
              <span className="font-mono text-[11px] opacity-70">{events.length}</span>
            </div>

            <div className="space-y-1">
              {events.map((evt) => (
                <div
                  key={evt.key}
                  onClick={() => onEditEvent && onEditEvent(evt.payload?.raw || evt, evt.date)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--paper)] hover:border-[var(--accent)] hover:bg-[var(--raised)]/40 transition-all cursor-pointer min-h-[40px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span 
                      style={{ backgroundColor: evt.colorToken || '#0F766E' }}
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {evt.title}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {evt.subtitle || 'All Day Event'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. DUE CHECKLIST TASKS GROUP */}
        {dueTasks.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-text-muted uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Due Tasks</span>
              </span>
              <span className="font-mono text-[11px] opacity-70">{dueTasks.length}</span>
            </div>

            <div className="space-y-1">
              {dueTasks.map((task) => {
                const isDone = task.status === 'done';
                return (
                  <div
                    key={task.key}
                    onClick={() => handleOpenItem(task)}
                    className="group flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--paper)] hover:border-[var(--accent)] hover:bg-[var(--raised)]/40 transition-all cursor-pointer min-h-[40px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-emerald-500/60 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-medium truncate ${
                          isDone ? 'opacity-70 text-text-muted' : 'text-text-primary'
                        }`}>
                          {task.title}
                        </p>
                        <p className="text-[10px] text-text-muted truncate">
                          {task.subtitle || 'Checklist'}
                        </p>
                      </div>
                    </div>

                    {/* Reschedule Button */}
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {onMoveItem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveItem(task);
                          }}
                          title="Move to date…"
                          className="p-1 rounded-lg text-text-muted hover:text-[var(--accent)] hover:bg-black/5 dark:hover:bg-white/10 opacity-70 group-hover:opacity-100 transition-opacity"
                        >
                          <MoveRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. WISHES GROUP */}
        {wishes.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-text-muted uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                <span>Wishes</span>
              </span>
              <span className="font-mono text-[11px] opacity-70">{wishes.length}</span>
            </div>

            <div className="space-y-1">
              {wishes.map((wish) => (
                <div
                  key={wish.key}
                  onClick={() => handleOpenItem(wish)}
                  className="group flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--paper)] hover:border-[var(--accent)] hover:bg-[var(--raised)]/40 transition-all cursor-pointer min-h-[40px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {wish.title}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">
                        {wish.subtitle || 'Target Wish'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {onMoveItem && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveItem(wish);
                        }}
                        title="Move to date…"
                        className="p-1 rounded-lg text-text-muted hover:text-[var(--accent)] hover:bg-black/5 dark:hover:bg-white/10 opacity-70 group-hover:opacity-100 transition-opacity"
                      >
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. JOURNAL (ONE row with mood and entry title) */}
        {journalEntries.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-text-muted uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Journal</span>
              </span>
            </div>

            <div
              onClick={() => handleOpenItem(journalEntries[0])}
              className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--paper)] hover:border-[var(--accent)] hover:bg-[var(--raised)]/40 transition-all cursor-pointer min-h-[40px]"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="text-base shrink-0 leading-none">
                  {journalEntries[0].moodEmoji || '📝'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {journalEntries[0].title || 'Daily Journal Entry'}
                  </p>
                  <p className="text-[10px] text-text-muted truncate">
                    {journalEntries[0].subtitle || 'Journal'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!hasAnyItems && (!isPast || routineTotal === 0) && (
          <div className="text-center py-8 px-4 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--raised)] flex items-center justify-center mb-3 text-text-muted">
              <CalendarIcon className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className="text-xs text-text-muted mb-3">
              {isPast 
                ? "Nothing recorded for this day." 
                : isToday 
                ? "Nothing scheduled for today." 
                : "Nothing planned for this day."}
            </p>
            {isFuture && onAddEvent && (
              <button
                type="button"
                onClick={() => onAddEvent(selectedDate)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--btn-bg)] text-[var(--btn-fg)] text-xs font-semibold hover:opacity-90 shadow-xs active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add event</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
