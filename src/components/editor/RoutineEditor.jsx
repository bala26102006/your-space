import React, { useState } from 'react';
import { Flame, CheckCircle2, Circle, Calendar, Repeat } from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';

export default function RoutineEditor({ noteId }) {
  const [period, setPeriod] = useState('weekly');

  // Fetch routine entries for this note
  const entries = useLiveQuery(async () => {
    if (!noteId) return [];
    return await db.routine_entries.where('note_id').equals(noteId).toArray();
  }, [noteId]) || [];

  // Generate last 7 days dates YYYY-MM-DD
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const daysList = getLast7Days();

  // Compute Streak
  const computeStreak = () => {
    if (entries.length === 0) return 0;
    const completedDates = new Set(entries.filter((e) => e.is_completed).map((e) => e.entry_date));

    let streak = 0;
    let checkDate = new Date();

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (completedDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Allow streak to continue if today is not completed yet but yesterday was
        const isToday = dateStr === new Date().toISOString().split('T')[0];
        if (isToday) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayStr = checkDate.toISOString().split('T')[0];
          if (completedDates.has(yesterdayStr)) {
            continue;
          }
        }
        break;
      }
    }
    return streak;
  };

  const currentStreak = computeStreak();

  const handleToggleDate = async (dateStr) => {
    const existing = entries.find((e) => e.entry_date === dateStr);
    if (existing) {
      await db.routine_entries.update(existing.id, {
        is_completed: !existing.is_completed,
      });
    } else {
      await db.routine_entries.add({
        id: crypto.randomUUID(),
        note_id: noteId,
        period,
        entry_date: dateStr,
        is_completed: true,
        streak_count: currentStreak + 1,
      });
    }
  };

  return (
    <div className="space-y-4 my-2">
      {/* Streak Header */}
      <div className="flex items-center justify-between p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 rounded-button">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
          <span className="font-semibold text-sm">
            {currentStreak} Day Streak
          </span>
        </div>
        <span className="text-xs text-amber-600/80 dark:text-amber-400/80 font-medium">
          {currentStreak > 0 ? 'Keep it up!' : 'Start building your streak'}
        </span>
      </div>

      {/* Routine Tracker Grid */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-text-muted flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>Last 7 Days</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {daysList.map((dateStr) => {
            const entry = entries.find((e) => e.entry_date === dateStr);
            const isCompleted = entry?.is_completed || false;
            const dateObj = new Date(dateStr);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = dateObj.getDate();

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleToggleDate(dateStr)}
                className={`flex flex-col items-center justify-center p-2 rounded-button border transition-all duration-150 ${
                  isCompleted
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                    : 'bg-bg-primary border-black/10 dark:border-white/10 text-text-muted hover:text-text-primary'
                }`}
              >
                <span className="text-[10px] uppercase font-semibold">{dayName}</span>
                <span className="text-sm font-bold my-0.5">{dayNum}</span>
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Circle className="w-3.5 h-3.5 opacity-40" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
