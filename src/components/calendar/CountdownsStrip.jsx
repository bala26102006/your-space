import React from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { getRelativeDateLabel, getTodayStr } from '../../lib/calendar/calendarUtils';

/**
 * CountdownsStrip (Upcoming Strip)
 * Slim row under the header that lists the next 3 events with "in 2 days" or "Today".
 * Hidden when there are no events.
 */
export default function CountdownsStrip({
  events = [],
  onSelectEvent,
}) {
  if (!events || events.length === 0) return null;

  const todayStr = getTodayStr();

  return (
    <div className="mb-2.5 shrink-0 px-3 py-1.5 rounded-xl bg-[var(--paper)] border border-[var(--border)] shadow-2xs flex items-center gap-2 select-none overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted shrink-0 mr-1">
        <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span className="text-[11px] uppercase tracking-wider font-bold text-text-primary">Upcoming</span>
      </div>

      <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
        {events.slice(0, 3).map((evt) => {
          const isToday = evt.date === todayStr;
          const relative = getRelativeDateLabel(evt.date, todayStr);

          return (
            <button
              key={evt.id}
              type="button"
              onClick={() => onSelectEvent && onSelectEvent(evt)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all text-xs cursor-pointer active:scale-95 shrink-0 ${
                isToday
                  ? 'bg-[var(--accent)] text-[var(--btn-fg)] border-transparent font-semibold shadow-xs'
                  : 'bg-[var(--raised)] border-[var(--border)] hover:border-[var(--accent)] text-text-primary'
              }`}
            >
              <span 
                style={{ backgroundColor: isToday ? 'currentColor' : (evt.color || '#0F766E') }}
                className="w-2 h-2 rounded-full shrink-0"
              />
              <span className="font-medium truncate max-w-[140px]">
                {evt.title}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                isToday
                  ? 'bg-black/20 text-[var(--btn-fg)] font-bold'
                  : 'bg-black/5 dark:bg-white/10 text-text-muted'
              }`}>
                {isToday ? 'Today' : relative}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
