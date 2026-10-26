import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, Trash2, Tag, AlertCircle } from 'lucide-react';
import { createCalendarEvent, updateCalendarEvent } from '../../lib/calendar/calendarService';
import { softDeleteItem } from '../../lib/services/trashService';
import { useConfirmStore } from '../../store/confirmStore';
import { getTodayStr } from '../../lib/calendar/calendarUtils';

const EVENT_COLORS = [
  { id: '#0F766E', name: 'Teal (Default)' },
  { id: '#2563EB', name: 'Blue' },
  { id: '#7C3AED', name: 'Purple' },
  { id: '#D97706', name: 'Amber' },
  { id: '#DC2626', name: 'Coral' },
  { id: '#059669', name: 'Emerald' },
  { id: '#DB2777', name: 'Rose' },
];

/**
 * EventModal
 * Small, clean dialog to create or edit lightweight calendar events.
 */
export default function EventModal({
  isOpen,
  onClose,
  initialDate = getTodayStr(),
  existingEvent = null,
}) {
  const { openSoftDelete } = useConfirmStore();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate);
  const [endDate, setEndDate] = useState('');
  const [isAllDay, setIsAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [color, setColor] = useState('#0F766E');
  const [note, setNote] = useState('');
  const [showCountdown, setShowCountdown] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (existingEvent) {
        const c = existingEvent.content || {};
        setTitle(existingEvent.title || '');
        setDate(c.date || existingEvent.date || initialDate);
        setEndDate(c.endDate || '');
        setIsAllDay(c.isAllDay !== false);
        setStartTime(c.startTime || '09:00');
        setColor(c.color || '#0F766E');
        setNote(c.note || '');
        setShowCountdown(c.showCountdown !== false);
      } else {
        setTitle('');
        setDate(initialDate || getTodayStr());
        setEndDate('');
        setIsAllDay(true);
        setStartTime('09:00');
        setColor('#0F766E');
        setNote('');
        setShowCountdown(true);
      }
    }
  }, [isOpen, existingEvent, initialDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setIsSubmitting(true);
    try {
      if (existingEvent) {
        await updateCalendarEvent(existingEvent.id, {
          title: title.trim(),
          date,
          endDate: endDate || null,
          isAllDay,
          startTime: isAllDay ? '' : startTime,
          color,
          note,
          showCountdown,
        });
      } else {
        await createCalendarEvent({
          title: title.trim(),
          date,
          endDate: endDate || null,
          isAllDay,
          startTime: isAllDay ? '' : startTime,
          color,
          note,
          showCountdown,
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save event:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!existingEvent) return;
    openSoftDelete({
      title: existingEvent.title || 'Untitled Event',
      onConfirm: async () => {
        await softDeleteItem({
          id: existingEvent.id,
          type: 'note',
          title: existingEvent.title || 'Untitled Event',
          workspace: 'calendar',
        });
        onClose();
      },
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-dialog-title"
    >
      <div 
        className="bg-card-default border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col scale-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--raised)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              style={{ backgroundColor: color }}
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
            />
            <h3 id="event-dialog-title" className="font-heading text-base font-bold text-text-primary">
              {existingEvent ? 'Edit Event' : 'New Calendar Event'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
              Event Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Trip to Kyoto, Exam, Doctor appointment"
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Date & All Day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                min={date}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>

          {/* Time & All-Day Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-[var(--border)]">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-text-primary">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] w-4 h-4"
              />
              <span>All Day Event</span>
            </label>

            {!isAllDay && (
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--paper)] text-xs text-text-primary"
              />
            )}
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider">
              Accent Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {EVENT_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  style={{ backgroundColor: c.id }}
                  title={c.name}
                  className={`w-6 h-6 rounded-full transition-transform active:scale-90 ${
                    color === c.id ? 'ring-2 ring-offset-2 ring-[var(--accent)] scale-110 shadow-xs' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Note / Description */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
              Optional Note
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Location, tickets, notes..."
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
            />
          </div>

          {/* Countdown Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-text-muted hover:text-text-primary">
            <input
              type="checkbox"
              checked={showCountdown}
              onChange={(e) => setShowCountdown(e.target.checked)}
              className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] w-4 h-4"
            />
            <span>Show in Countdown strip (Exams, Birthdays, Trips)</span>
          </label>

          {/* Actions */}
          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
            {existingEvent ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors min-h-[38px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold text-text-primary transition-colors min-h-[38px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-4 py-2 rounded-xl bg-[var(--btn-bg)] text-[var(--btn-fg)] hover:opacity-90 disabled:opacity-50 text-xs font-semibold shadow-sm transition-all active:scale-95 min-h-[38px]"
              >
                {existingEvent ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
