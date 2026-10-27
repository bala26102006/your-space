import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Check, 
  AlertCircle,
  Shuffle
} from 'lucide-react';
import { getTodayStr, parseLocalDate, formatLocalDate } from '../../lib/calendar/calendarUtils';
import { rescheduleCalendarItem } from '../../lib/calendar/calendarService';
import { toggleChecklistItemCompletion } from '../../lib/checklists/checklistUtils';
import { useToastStore } from '../../store/toastStore';
import { db } from '../../lib/db';

/**
 * OverdueReviewModal
 * Review sheet for overdue items grouped by checklist.
 * Actions per row: Today, Tomorrow, Pick date, Mark done.
 * "Spread evenly": max 5 items/day, within next 14 days, with preview before applying.
 */
export default function OverdueReviewModal({
  isOpen,
  onClose,
  overdueItems = [],
}) {
  const todayStr = getTodayStr();

  // Selected item IDs for batch actions
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [datePickers, setDatePickers] = useState({}); // itemId -> dateStr
  const [previewPlan, setPreviewPlan] = useState(null); // array of { item, targetDate } or null
  const [isApplying, setIsApplying] = useState(false);

  // Group items by checklist / parent list
  const groupedByList = useMemo(() => {
    const map = {};
    overdueItems.forEach(item => {
      const listName = item.subtitle || 'Checklist Tasks';
      if (!map[listName]) {
        map[listName] = [];
      }
      map[listName].push(item);
    });
    return map;
  }, [overdueItems]);

  if (!isOpen) return null;

  // Toggle selection
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === overdueItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(overdueItems.map(i => i.id)));
    }
  };

  // Quick actions
  const handleMoveToToday = async (item) => {
    await rescheduleCalendarItem(item, todayStr);
  };

  const handleMoveToTomorrow = async (item) => {
    const d = parseLocalDate(todayStr);
    d.setDate(d.getDate() + 1);
    const tomorrowStr = formatLocalDate(d);
    await rescheduleCalendarItem(item, tomorrowStr);
  };

  const handlePickDate = async (item, newDate) => {
    if (!newDate) return;
    await rescheduleCalendarItem(item, newDate);
    setDatePickers(prev => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };

  const handleMarkDone = async (item) => {
    if (item.source === 'checklists') {
      await toggleChecklistItemCompletion(item.id, true);
      useToastStore.getState().showToast({
        message: `Completed "${item.title}"`,
      });
    } else if (item.source === 'wishlist') {
      const now = new Date().toISOString();
      const note = await db.notes.get(item.id);
      if (note) {
        const existingContent = note.content && typeof note.content === 'object' ? note.content : {};
        await db.notes.update(item.id, {
          status: 'got_it',
          is_completed: true,
          got_it_at: now,
          content: {
            ...existingContent,
            status: 'got_it',
            gotIt: true,
          },
          updated_at: now,
        });
        useToastStore.getState().showToast({
          message: `Marked "${item.title}" as Got it!`,
        });
      }
    }
  };

  // Calculate "Spread evenly" preview
  const handleCalculateSpread = () => {
    const targetItems = overdueItems.filter(i => selectedIds.has(i.id));
    if (targetItems.length === 0) return;

    const plan = [];
    const now = parseLocalDate(todayStr);
    
    // Spread across next 14 days, max 5 items per day
    let currentDayOffset = 1; // start from tomorrow or 0 for today
    let itemsOnCurrentDay = 0;

    targetItems.forEach((item) => {
      if (itemsOnCurrentDay >= 5) {
        currentDayOffset = Math.min(14, currentDayOffset + 1);
        itemsOnCurrentDay = 0;
      }

      const d = new Date(now);
      d.setDate(now.getDate() + currentDayOffset);
      const targetDate = formatLocalDate(d);

      plan.push({
        item,
        targetDate,
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      });

      itemsOnCurrentDay++;
    });

    setPreviewPlan(plan);
  };

  // Apply spread plan
  const handleApplySpread = async () => {
    if (!previewPlan || previewPlan.length === 0) return;
    setIsApplying(true);

    const previousStates = [];

    try {
      for (const entry of previewPlan) {
        previousStates.push({ item: entry.item, oldDate: entry.item.date });
        await rescheduleCalendarItem(entry.item, entry.targetDate, false);
      }

      useToastStore.getState().showToast({
        message: `Evenly spread ${previewPlan.length} tasks across upcoming days`,
        action: {
          label: 'Undo',
          onClick: async () => {
            for (const prev of previousStates) {
              await rescheduleCalendarItem(prev.item, prev.oldDate, false);
            }
          }
        },
        duration: 6000,
      });

      setPreviewPlan(null);
      setSelectedIds(new Set());
      onClose();
    } catch (err) {
      console.error('Failed to apply spread plan:', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Overdue items review"
    >
      <div className="bg-[var(--paper)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-text-primary">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] bg-[var(--raised)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading text-base sm:text-lg font-bold tracking-tight">
                Overdue Tasks Review
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {overdueItems.length} {overdueItems.length === 1 ? 'task needs' : 'tasks need'} a calm new date
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close review"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Spread Evenly Action Bar */}
        <div className="px-4 py-2.5 border-b border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-text-muted hover:text-text-primary select-none">
            <input 
              type="checkbox"
              checked={selectedIds.size > 0 && selectedIds.size === overdueItems.length}
              onChange={handleSelectAll}
              className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <span>Select all ({selectedIds.size} of {overdueItems.length})</span>
          </label>

          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={handleCalculateSpread}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)] hover:bg-[var(--accent)] hover:text-[var(--btn-fg)] transition-all font-semibold disabled:opacity-40 disabled:pointer-events-none active:scale-95"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Spread evenly ({selectedIds.size})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Spread Preview if active */}
          {previewPlan && (
            <div className="p-4 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                    Spread Preview (Max 5/day, Next 14 Days)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewPlan(null)}
                  className="text-xs text-text-muted hover:text-text-primary"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-text-muted">
                Review how {previewPlan.length} tasks will be distributed. Nothing changes until you confirm.
              </p>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {previewPlan.map((entry, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--paper)] border border-[var(--border)]"
                  >
                    <span className="font-medium truncate mr-2">{entry.item.title}</span>
                    <span className="font-mono text-text-muted shrink-0 text-[11px] bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full">
                      → {entry.dayLabel}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPreviewPlan(null)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={handleApplySpread}
                  className="px-4 py-1.5 rounded-xl bg-[var(--btn-bg)] text-[var(--btn-fg)] text-xs font-bold hover:opacity-90 shadow-xs disabled:opacity-50"
                >
                  {isApplying ? 'Applying...' : 'Confirm & Spread'}
                </button>
              </div>
            </div>
          )}

          {/* Grouped Items List */}
          {Object.entries(groupedByList).map(([listTitle, items]) => (
            <div key={listTitle} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-text-muted uppercase tracking-wider">
                <span>{listTitle}</span>
                <span className="font-mono text-[11px] opacity-70">{items.length}</span>
              </div>

              <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--paper)] shadow-2xs">
                {items.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  const isPickerOpen = Boolean(datePickers[item.id]);

                  return (
                    <div 
                      key={item.key || item.id}
                      className="p-3 flex flex-wrap items-center justify-between gap-3 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(item.id)}
                          aria-label={`Select ${item.title}`}
                          className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-text-primary truncate">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-red-500 font-medium">
                            Was due: {item.date}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPickerOpen ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="date"
                              defaultValue={item.date}
                              onChange={(e) => handlePickDate(item, e.target.value)}
                              className="text-xs px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                            />
                            <button
                              type="button"
                              onClick={() => setDatePickers(prev => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                              })}
                              className="p-1 text-text-muted hover:text-text-primary"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleMoveToToday(item)}
                              title="Move due date to Today"
                              className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--paper)] hover:border-[var(--accent)] text-[11px] font-semibold text-text-primary transition-all active:scale-95"
                            >
                              Today
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMoveToTomorrow(item)}
                              title="Move due date to Tomorrow"
                              className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--paper)] hover:border-[var(--accent)] text-[11px] font-semibold text-text-primary transition-all active:scale-95"
                            >
                              Tomorrow
                            </button>

                            <button
                              type="button"
                              onClick={() => setDatePickers(prev => ({ ...prev, [item.id]: true }))}
                              title="Pick a specific date"
                              className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--paper)] hover:border-[var(--accent)] text-[11px] font-semibold text-text-primary transition-all active:scale-95"
                            >
                              Pick date…
                            </button>

                            {item.source === 'checklists' && (
                              <button
                                type="button"
                                onClick={() => handleMarkDone(item)}
                                title="Mark as done"
                                className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--raised)] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-xs font-semibold text-text-primary hover:border-[var(--accent)] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
