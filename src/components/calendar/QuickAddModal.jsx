import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, CheckSquare, Sparkles, Plus, AlertCircle } from 'lucide-react';
import { db } from '../../lib/db';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { generateUUID } from '../../lib/uuid';
import { createCalendarEvent, calendarCache } from '../../lib/calendar/calendarService';
import { useToastStore } from '../../store/toastStore';

/**
 * QuickAddModal
 * Add an Event, a Task (into a selected checklist), or a Wish for a given date.
 */
export default function QuickAddModal({
  isOpen,
  onClose,
  targetDate,
}) {
  const { showToast } = useToastStore();

  const [type, setType] = useState('event'); // 'event' | 'task' | 'wish'
  const [title, setTitle] = useState('');
  const [selectedChecklistId, setSelectedChecklistId] = useState('');
  const [wishCategory, setWishCategory] = useState('Buy');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available checklists for task creation
  const checklists = useLiveQuery(() => {
    return db.notes
      .where('workspace_id')
      .equals('checklists')
      .filter(n => !n.is_archived && !n.is_deleted)
      .toArray();
  }, []) || [];

  // Default checklist id if none selected
  React.useEffect(() => {
    if (checklists.length > 0 && !selectedChecklistId) {
      setSelectedChecklistId(checklists[0].id);
    }
  }, [checklists, selectedChecklistId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !targetDate) return;

    setIsSubmitting(true);
    try {
      if (type === 'event') {
        await createCalendarEvent({
          title: title.trim(),
          date: targetDate,
          isAllDay: true,
          color: '#0F766E',
        });
        showToast({ message: `Created event "${title}" on ${targetDate}` });
      } else if (type === 'task') {
        if (!selectedChecklistId) {
          showToast({ message: 'Please select a checklist to add this task to.' });
          setIsSubmitting(false);
          return;
        }

        const itemId = generateUUID();
        await db.checklist_items.add({
          id: itemId,
          note_id: selectedChecklistId,
          text: title.trim(),
          item_type: 'task',
          due_date: targetDate,
          is_completed: 0,
          created_at: new Date().toISOString(),
        });
        calendarCache.clear();
        showToast({ message: `Added task "${title}" to checklist due ${targetDate}` });
      } else if (type === 'wish') {
        const wishId = generateUUID();
        const now = new Date().toISOString();
        await db.notes.add({
          id: wishId,
          user_id: 'local_user',
          workspace_id: 'wishlist',
          note_type: 'wishlist',
          title: title.trim(),
          content: {
            category: wishCategory,
            priority: 'Medium',
            status: 'Wishing',
            targetDate,
            price: 0,
            link: '',
            note: '',
          },
          target_date: targetDate,
          category: wishCategory,
          priority: 'Medium',
          status: 'Wishing',
          is_pinned: false,
          is_archived: false,
          is_deleted: false,
          sort_order: Date.now(),
          created_at: now,
          updated_at: now,
        });
        calendarCache.clear();
        showToast({ message: `Added wish "${title}" with target date ${targetDate}` });
      }

      onClose();
    } catch (err) {
      console.error('Failed to quick-add item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-title"
    >
      <div 
        className="bg-card-default border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col scale-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--raised)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[var(--accent)]" />
            <h3 id="quick-add-title" className="font-heading text-sm font-bold text-text-primary">
              Quick Add for {targetDate}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Segmented Type Picker */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border)] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setType('event')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                type === 'event'
                  ? 'bg-card-default text-[var(--panel-calendar-accent)] shadow-xs font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Event</span>
            </button>
            <button
              type="button"
              onClick={() => setType('task')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                type === 'task'
                  ? 'bg-card-default text-[var(--panel-checklists-accent)] shadow-xs font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Task</span>
            </button>
            <button
              type="button"
              onClick={() => setType('wish')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                type === 'wish'
                  ? 'bg-card-default text-[var(--panel-wishlist-accent)] shadow-xs font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Wish</span>
            </button>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
              {type === 'event' ? 'Event Title' : type === 'task' ? 'Task Description' : 'Wish Title'} *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'event'
                  ? 'e.g. Birthday dinner'
                  : type === 'task'
                  ? 'e.g. Submit project review'
                  : 'e.g. Noise cancelling headphones'
              }
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Task Sub-options: Choose Checklist */}
          {type === 'task' && (
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
                Target Checklist *
              </label>
              {checklists.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                  No checklists exist yet. Please create a checklist in the Checklists panel first.
                </div>
              ) : (
                <select
                  value={selectedChecklistId}
                  onChange={(e) => setSelectedChecklistId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  {checklists.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title || 'Untitled Checklist'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Wish Sub-options: Category */}
          {type === 'wish' && (
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
                Category
              </label>
              <div className="flex gap-2">
                {['Buy', 'Experience', 'Read', 'Travel'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setWishCategory(cat)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      wishCategory === cat
                        ? 'bg-[var(--panel-wishlist-accent-soft)] text-[var(--panel-wishlist-accent)] border-[var(--panel-wishlist-accent)]/30 font-bold'
                        : 'border-[var(--border)] text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || (type === 'task' && checklists.length === 0)}
              className="px-4 py-2 rounded-xl bg-[var(--btn-bg)] text-[var(--btn-fg)] hover:opacity-90 disabled:opacity-50 text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              Add to {targetDate}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
