import React from 'react';
import { CheckCircle2, Square, Clock, Sparkles } from 'lucide-react';
import { getDueDateStatus, toggleChecklistItemCompletion } from '../../lib/checklists/checklistUtils';

export default function UpNextStrip({
  items = [],
  weeklyProgress = { completedThisWeek: 0, totalTasks: 0, percent: 0 },
  onSelectChecklist
}) {
  const { completedThisWeek, totalTasks, percent } = weeklyProgress;

  const handleTick = async (e, item) => {
    e.stopPropagation();
    await toggleChecklistItemCompletion(item.id, true);
  };

  return (
    <div className="rounded-3xl p-5 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-white to-emerald-500/10 dark:from-emerald-950/20 dark:via-bg-primary dark:to-emerald-900/10 shadow-xs transition-all">
      {/* Top Header: Title + Weekly Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Up Next
          </h2>
          <span className="text-[11px] font-medium text-text-muted">
            • Focus Tasks
          </span>
        </div>

        {/* Weekly Progress Bar & Label */}
        <div className="flex items-center gap-3 text-xs font-medium text-text-muted">
          <span>
            <strong className="text-text-primary font-bold">{completedThisWeek}</strong> of {totalTasks} items done this week
          </span>
          <div className="w-24 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Items List or Friendly Empty State */}
      <div className="pt-3">
        {items.length === 0 ? (
          <div className="py-4 flex items-center justify-center gap-3 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5 opacity-80" />
            <span className="text-xs font-semibold">
              You're all caught up! No urgent tasks waiting.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {items.map(item => {
              const due = getDueDateStatus(item.effectiveDueDate);
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectChecklist?.(item.note_id)}
                  className="group relative p-3 rounded-2xl bg-white/80 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-emerald-500/40 hover:shadow-sm transition-all cursor-pointer flex items-start gap-2.5"
                >
                  {/* Interactive Tick Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => handleTick(e, item)}
                    className="p-1 -ml-1 mt-0.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-text-muted hover:text-emerald-600 transition-colors"
                    title="Mark task completed"
                    aria-label={`Complete ${item.text || 'task'}`}
                  >
                    <Square className="w-4 h-4 stroke-[2]" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {item.text || 'Untitled task'}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* Source Checklist Pill */}
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-text-muted truncate max-w-[120px]">
                        {item.checklistTitle}
                      </span>

                      {/* Due Date Chip */}
                      {due && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${due.colorClass}`}>
                          {due.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
