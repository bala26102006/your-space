import React, { useState, useEffect, useMemo } from 'react';
import { getYearMatrix, getTodayStr } from '../../lib/calendar/calendarUtils';
import { getYearInPixelsData } from '../../lib/calendar/calendarService';
import { Activity, BookOpen, Repeat } from 'lucide-react';

/**
 * YearView ("Year in pixels")
 * 12 months of miniature interactive day cells with a mode switch:
 * - Activity Density
 * - Journal Mood
 * - Routine Completion
 */
export default function YearView({
  year,
  onSelectDate,
  onOpenDayDetail,
}) {
  const [mode, setMode] = useState('density'); // 'density' | 'journal' | 'routines'
  const [pixelsData, setPixelsData] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const yearMatrix = useMemo(() => getYearMatrix(year), [year]);
  const todayStr = getTodayStr();

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    getYearInPixelsData(year)
      .then(data => {
        if (!isCancelled) {
          setPixelsData(data);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load year in pixels data:', err);
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [year]);

  // Color resolver for each cell based on selected mode
  const getCellColor = (dateStr) => {
    const d = pixelsData[dateStr];
    if (!d) return 'bg-black/[0.04] dark:bg-white/[0.05]';

    if (mode === 'density') {
      const count = d.totalCount;
      if (count === 0) return 'bg-black/[0.04] dark:bg-white/[0.05]';
      if (count <= 2) return 'bg-teal-500/30';
      if (count <= 4) return 'bg-teal-500/60';
      return 'bg-teal-600 dark:bg-teal-400';
    }

    if (mode === 'journal') {
      if (!d.moodColor) return 'bg-black/[0.04] dark:bg-white/[0.05]';
      return d.moodColor; // Uses exact hex/colorVar from mood config
    }

    if (mode === 'routines') {
      if (d.routineTotal === 0) return 'bg-black/[0.04] dark:bg-white/[0.05]';
      const pct = d.routineDone / d.routineTotal;
      if (pct === 1) return 'bg-emerald-500';
      if (pct > 0) return 'bg-amber-500';
      return 'bg-red-500/40';
    }

    return 'bg-black/[0.04] dark:bg-white/[0.05]';
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-card-default border border-[var(--border)] rounded-2xl shadow-card p-4 sm:p-6 select-none">
      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--border)] shrink-0">
        <div>
          <h2 className="font-heading text-lg font-bold text-text-primary">
            {year} Year in Pixels
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Click any pixel to open that day's lens.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border)] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('density')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === 'density'
                ? 'bg-card-default text-[var(--accent)] font-bold shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Activity Density</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('journal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === 'journal'
                ? 'bg-card-default text-[var(--panel-journal-accent)] font-bold shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Journal Mood</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('routines')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === 'routines'
                ? 'bg-card-default text-[var(--panel-routines-accent)] font-bold shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Routine Completion</span>
          </button>
        </div>
      </div>

      {/* 12 Months Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {yearMatrix.months.map((m) => (
          <div 
            key={m.monthNumber}
            className="p-3 rounded-xl border border-black/5 dark:border-white/5 bg-[var(--paper)] shadow-2xs flex flex-col"
          >
            <span className="text-xs font-bold text-text-primary mb-2">
              {m.monthName}
            </span>

            {/* Pixels Matrix for Month */}
            <div className="grid grid-cols-7 gap-1">
              {m.days.map((day) => {
                const colorStyle = getCellColor(day.dateStr);
                const isCustomHex = colorStyle.startsWith('#');
                const isToday = day.dateStr === todayStr;
                const d = pixelsData[day.dateStr];

                let title = `${day.dateStr}`;
                if (d) {
                  if (mode === 'density') title += `: ${d.totalCount} items`;
                  if (mode === 'journal' && d.mood) title += `: Mood ${d.mood}`;
                  if (mode === 'routines') title += `: ${d.routineDone}/${d.routineTotal} routines`;
                }

                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => {
                      onSelectDate(day.dateStr);
                      if (onOpenDayDetail) onOpenDayDetail(day.dateStr);
                    }}
                    title={title}
                    style={isCustomHex ? { backgroundColor: colorStyle } : undefined}
                    className={`w-full aspect-square rounded-xs transition-all hover:scale-125 hover:z-10 cursor-pointer ${
                      !isCustomHex ? colorStyle : ''
                    } ${
                      isToday ? 'ring-1.5 ring-amber-500 scale-110 z-5' : ''
                    }`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend Footer */}
      <div className="mt-6 pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between text-[11px] text-text-muted gap-2">
        <span>Click any day to open its Life Lens details.</span>

        <div className="flex items-center gap-4">
          {mode === 'density' && (
            <div className="flex items-center gap-1.5">
              <span>Less</span>
              <span className="w-2.5 h-2.5 rounded-xs bg-black/[0.04] dark:bg-white/[0.05]" />
              <span className="w-2.5 h-2.5 rounded-xs bg-teal-500/30" />
              <span className="w-2.5 h-2.5 rounded-xs bg-teal-500/60" />
              <span className="w-2.5 h-2.5 rounded-xs bg-teal-600 dark:bg-teal-400" />
              <span>More</span>
            </div>
          )}

          {mode === 'journal' && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#2D6B8C]" /> Calm
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#3B722C]" /> Grateful
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#9B5D0F]" /> Restless
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#624883]" /> Tired
              </span>
            </div>
          )}

          {mode === 'routines' && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> 100% Done
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Partial
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-red-500/40" /> Missed
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
