import React, { useState } from 'react';
import { Sparkles, Calendar, ArrowRight, X } from 'lucide-react';
import { smartBatchRescheduleOverdue } from '../../lib/calendar/calendarService';

/**
 * SmartRescheduleCard
 * Calm, encouraging prompt when overdue items exist.
 * Never scolding: offers "Move all to Today" or "Spread across the week".
 */
export default function SmartRescheduleCard({
  overdueItems = [],
  onDismiss,
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!overdueItems || overdueItems.length === 0) return null;

  const count = overdueItems.length;

  const handleAction = async (mode) => {
    setIsProcessing(true);
    try {
      await smartBatchRescheduleOverdue(overdueItems, mode);
      if (onDismiss) onDismiss();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 select-none transition-all">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 fill-amber-500/20" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Fresh Focus
            </h4>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
              {count} {count === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Life gets busy. Realign your overdue tasks with a single calm click.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => handleAction('today')}
          className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--paper)] text-text-primary hover:border-[var(--accent)] text-xs font-semibold shadow-2xs transition-all active:scale-95 disabled:opacity-50"
        >
          Move to Today
        </button>

        <button
          type="button"
          disabled={isProcessing}
          onClick={() => handleAction('spread')}
          className="px-3 py-1.5 rounded-xl bg-[var(--btn-bg)] text-[var(--btn-fg)] hover:opacity-90 text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50"
        >
          Spread across week
        </button>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss prompt"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
