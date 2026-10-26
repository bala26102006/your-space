import React from 'react';
import { Sparkles, Calendar as CalendarIcon, Clock, ChevronRight } from 'lucide-react';
import { getRelativeDateLabel, getTodayStr } from '../../lib/calendar/calendarUtils';

/**
 * CountdownsStrip
 * Displays up to 3 upcoming countdown events (Exams, Birthdays, Trips).
 */
export default function CountdownsStrip({
  events = [],
  onSelectEvent,
}) {
  if (!events || events.length === 0) return null;

  const todayStr = getTodayStr();

  return (
    <div className="mb-3 shrink-0 p-2.5 sm:p-3 rounded-2xl bg-card-default border border-[var(--border)] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 select-none">
      <div className="flex items-center gap-2 text-xs font-bold text-text-primary shrink-0 px-1">
        <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span className="uppercase tracking-wider text-[11px]">Countdowns</span>
      </div>

      <div className="flex-1 flex flex-wrap items-center gap-2">
        {events.map((evt) => {
          const isToday = evt.date === todayStr;
          const relative = getRelativeDateLabel(evt.date, todayStr);

          return (
            <button
              key={evt.id}
              type="button"
              onClick={() => onSelectEvent(evt)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs cursor-pointer group active:scale-95 text-left ${
                isToday
                  ? 'bg-[var(--accent)] text-[var(--btn-fg)] border-transparent font-bold shadow-xs'
                  : 'bg-[var(--paper)] border-[var(--border)] hover:border-[var(--accent)] text-text-primary'
              }`}
            >
              <div 
                style={{ backgroundColor: isToday ? 'currentColor' : evt.color }}
                className={`w-2 h-2 rounded-full shrink-0 ${isToday ? 'animate-pulse' : ''}`}
              />
              <span className="font-semibold truncate max-w-[130px] sm:max-w-[160px]">
                {evt.title}
              </span>
              <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded-full font-mono ${
                isToday
                  ? 'bg-black/20 text-[var(--btn-fg)]'
                  : 'bg-black/5 dark:bg-white/10 text-[var(--accent-text)]'
              }`}>
                {isToday ? 'Today!' : relative}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
