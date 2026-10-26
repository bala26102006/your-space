import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { rescheduleCalendarItem } from '../../lib/calendar/calendarService';
import { getTodayStr, parseLocalDate, formatLocalDate } from '../../lib/calendar/calendarUtils';

/**
 * MoveDateModal
 * Accessible keyboard & touch dialog to reschedule an item to a new date.
 */
export default function MoveDateModal({
  isOpen,
  onClose,
  item = null,
}) {
  const todayStr = getTodayStr();
  const [selectedDate, setSelectedDate] = useState(item?.date || todayStr);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setSelectedDate(item.date || todayStr);
    }
  }, [isOpen, item, todayStr]);

  if (!isOpen || !item) return null;

  // Quick jump suggestions
  const getQuickSuggestions = () => {
    const list = [];
    const now = new Date();

    // Today
    list.push({ label: 'Today', date: todayStr });

    // Tomorrow
    const tom = new Date(now);
    tom.setDate(now.getDate() + 1);
    list.push({ label: 'Tomorrow', date: formatLocalDate(tom) });

    // In 3 days
    const in3 = new Date(now);
    in3.setDate(now.getDate() + 3);
    list.push({ label: 'In 3 days', date: formatLocalDate(in3) });

    // Next week (Monday)
    const currentDay = now.getDay();
    const daysUntilNextMon = currentDay === 0 ? 1 : 8 - currentDay;
    const nextMon = new Date(now);
    nextMon.setDate(now.getDate() + daysUntilNextMon);
    list.push({ label: 'Next Monday', date: formatLocalDate(nextMon) });

    return list;
  };

  const handleConfirm = async () => {
    if (!selectedDate) return;
    setIsSubmitting(true);
    try {
      await rescheduleCalendarItem(item, selectedDate);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const suggestions = getQuickSuggestions();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-date-title"
    >
      <div 
        className="bg-card-default border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col scale-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--raised)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[var(--accent)]" />
            <h3 id="move-date-title" className="font-heading text-sm font-bold text-text-primary">
              Move to Date…
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-[var(--border)]">
            <p className="text-xs font-semibold text-text-primary truncate">
              {item.title}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Current date: <span className="font-mono">{item.date}</span>
            </p>
          </div>

          {/* Quick Suggestions Chips */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
              Quick Suggestions
            </label>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map(s => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setSelectedDate(s.date)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    selectedDate === s.date
                      ? 'bg-[var(--accent)] text-[var(--btn-fg)] border-transparent font-semibold shadow-xs'
                      : 'border-[var(--border)] bg-[var(--paper)] text-text-primary hover:border-[var(--accent)]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker Input */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Select Specific Date
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || !selectedDate || selectedDate === item.date}
              className="px-4 py-1.5 rounded-xl bg-[var(--btn-bg)] text-[var(--btn-fg)] hover:opacity-90 disabled:opacity-50 text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              Move Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
