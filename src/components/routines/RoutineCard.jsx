import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Flame, 
  Check, 
  MoreVertical, 
  Edit3, 
  Copy, 
  Archive, 
  Trash2, 
  Snowflake,
  Clock,
  Calendar,
  Undo2
} from 'lucide-react';
import { 
  resolveTonalPalette, 
  getWeekDaysMondayStart, 
  getTodayStr, 
  isScheduledOn, 
  isEntryComplete, 
  calculateScheduledStreak 
} from '../../lib/routines/routineUtils';

export default function RoutineCard({
  routine,
  entries = [],
  onToggleToday,
  onToggleDay,
  onFreezeToday,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onClick,
  isListView = false
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [rippleActive, setRippleActive] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const menuRef = useRef(null);

  const todayStr = getTodayStr();
  const palette = resolveTonalPalette(routine);
  const content = routine.content || {};

  // Close card menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  // Today entry state
  const todayEntry = entries.find(e => e.entry_date === todayStr);
  const isDoneToday = isEntryComplete(todayEntry, routine);
  const isFrozenToday = Boolean(todayEntry?.is_freeze);
  const isScheduledToday = isScheduledOn(routine, todayStr);

  // Compute streak
  const streak = useMemo(() => {
    return calculateScheduledStreak(routine.id, entries, routine);
  }, [routine.id, entries, routine]);

  // Weekly strip calculations (Mon to Sun)
  const weekDays = useMemo(() => {
    return getWeekDaysMondayStart(todayStr);
  }, [todayStr]);

  // Compute week completion count for progress footer
  const { weekCompletedCount, weekScheduledCount } = useMemo(() => {
    let completed = 0;
    let scheduled = 0;
    weekDays.forEach(day => {
      if (isScheduledOn(routine, day.dateStr)) {
        scheduled++;
        const entry = entries.find(e => e.entry_date === day.dateStr);
        if (isEntryComplete(entry, routine) || entry?.is_freeze) {
          completed++;
        }
      }
    });
    return { weekCompletedCount: completed, weekScheduledCount: scheduled };
  }, [weekDays, routine, entries]);

  // Schedule Label
  const getScheduleLabel = () => {
    const sType = content.scheduleType || content.frequency || 'daily';
    switch (sType) {
      case 'daily': return 'Daily';
      case 'weekdays': return 'Weekdays';
      case 'specific_days':
        if (Array.isArray(content.targetDays) && content.targetDays.length > 0) {
          const map = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
          return content.targetDays.map(d => map[d] || d).join(', ');
        }
        return 'Specific days';
      case 'times_per_week':
        return `${content.targetTimesPerWeek || 3}x / week`;
      case 'monthly':
        return 'Monthly';
      default:
        return 'Daily';
    }
  };

  // Time of Day Label
  const getTimeOfDayLabel = () => {
    const t = content.timeOfDay || 'anytime';
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  // Handle Big Check-in Click
  const handleCheckIn = (e) => {
    e.stopPropagation();
    // Trigger mobile haptic feedback if available
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch (err) {}

    setRippleActive(true);
    setTimeout(() => setRippleActive(false), 400);

    const willBeDone = !isDoneToday;
    onToggleToday?.(routine, willBeDone);

    if (!willBeDone) {
      setToastMessage('Marked uncompleted');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  // Handle Past Day Backfill or Toggle
  const handleDayClick = (e, day) => {
    e.stopPropagation();
    if (day.isFuture) return; // Disallow future backfill

    const entry = entries.find(e => e.entry_date === day.dateStr);
    const currentlyDone = isEntryComplete(entry, routine);
    onToggleDay?.(routine, day.dateStr, !currentlyDone);
  };

  // -------------------------------------------------------------
  // LIST VIEW LAYOUT (Compact Row)
  // -------------------------------------------------------------
  if (isListView) {
    return (
      <div
        onClick={() => onClick?.(routine)}
        className={`group relative p-3 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 bg-white dark:bg-bg-primary hover:shadow-md ${
          isDoneToday ? 'opacity-90' : ''
        }`}
        style={{
          borderColor: isDoneToday ? palette.borderLight : undefined
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-xs"
            style={{ backgroundColor: palette.containerLight }}
          >
            {content.icon || '💧'}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary truncate">
              {routine.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              <span>{getScheduleLabel()}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <Flame className={`w-3 h-3 ${streak > 0 ? 'text-amber-500 fill-amber-500' : 'opacity-40'}`} />
                {streak} {streak === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>
        </div>

        {/* 7-day Mini Dots */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0 px-3">
          {weekDays.map(day => {
            const entry = entries.find(e => e.entry_date === day.dateStr);
            const isDone = isEntryComplete(entry, routine);
            const isFrozen = Boolean(entry?.is_freeze);
            const scheduled = isScheduledOn(routine, day.dateStr);

            return (
              <div
                key={day.dateStr}
                onClick={(e) => handleDayClick(e, day)}
                title={`${day.fullDayName} (${day.dateStr}): ${isDone ? 'Done' : isFrozen ? 'Frozen' : 'Missed'}`}
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-semibold transition-all ${
                  day.isToday ? 'ring-2 ring-text-primary ring-offset-1' : ''
                } ${
                  isDone 
                    ? 'text-white shadow-2xs' 
                    : isFrozen 
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' 
                    : scheduled && day.isPast
                    ? 'bg-black/5 dark:bg-white/5 text-text-muted/60'
                    : 'opacity-30'
                }`}
                style={{
                  backgroundColor: isDone ? palette.accentLight : undefined
                }}
              >
                {isDone ? '✓' : isFrozen ? '❄' : day.shortLabel}
              </div>
            );
          })}
        </div>

        {/* Big Check Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCheckIn}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
              isDoneToday 
                ? 'text-white shadow-sm' 
                : 'border-2 border-dashed hover:border-solid hover:scale-105'
            }`}
            style={{
              backgroundColor: isDoneToday ? palette.accentLight : 'transparent',
              borderColor: palette.accentLight,
              color: isDoneToday ? '#FFFFFF' : palette.accentLight
            }}
            title={isDoneToday ? 'Completed! Tap to undo' : 'Mark as complete today'}
            aria-label={isDoneToday ? `Completed ${routine.title}` : `Complete ${routine.title}`}
          >
            <Check className={`w-5 h-5 transition-transform duration-200 ${isDoneToday ? 'scale-110 stroke-[2.8]' : 'scale-75 opacity-40'}`} />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // GRID CARD LAYOUT (Standard Material 3 / Google Habit Style)
  // -------------------------------------------------------------
  return (
    <div
      onClick={() => onClick?.(routine)}
      className={`group relative rounded-3xl p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-xl hover:-translate-y-0.5 ${
        isDoneToday ? 'opacity-95' : ''
      }`}
      style={{
        backgroundColor: palette.bgLight,
        borderColor: isDoneToday ? palette.borderLight : 'rgba(0, 0, 0, 0.08)'
      }}
    >
      {/* Toast Notification for Undo */}
      {toastMessage && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-stone-900 text-white text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-1.5">
          <Undo2 className="w-3 h-3" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div>
        {/* Top Header: Icon + Streak Badge + ⋯ Menu */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Icon Bubble */}
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-xs transition-transform group-hover:scale-105"
              style={{ backgroundColor: palette.containerLight }}
            >
              {content.icon || '💧'}
            </div>

            {/* Streak Flame Pill */}
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                streak > 0 ? 'shadow-2xs animate-pulse' : 'opacity-60'
              }`}
              style={{
                backgroundColor: streak > 0 ? palette.containerLight : 'rgba(0, 0, 0, 0.05)',
                color: streak > 0 ? palette.textLight : 'inherit'
              }}
            >
              <Flame className={`w-3.5 h-3.5 ${streak > 0 ? 'text-amber-500 fill-amber-500' : 'text-text-muted'}`} />
              <span>{streak} {streak === 1 ? 'day' : 'days'}</span>
            </div>
          </div>

          {/* Card Overflow ⋯ Menu */}
          <div className="relative shrink-0" ref={menuOpen ? menuRef : null}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors opacity-80 group-hover:opacity-100"
              title="More actions"
              aria-label="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-44 bg-bg-primary rounded-2xl shadow-xl border border-black/10 dark:border-white/10 py-1.5 z-40 text-xs font-medium animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit?.(routine);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-text-muted" />
                  <span>Edit Routine</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onFreezeToday?.(routine);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
                >
                  <Snowflake className="w-3.5 h-3.5 text-sky-500" />
                  <span>{isFrozenToday ? 'Unfreeze Today' : 'Freeze Today'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate?.(routine);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-text-muted" />
                  <span>Duplicate</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onArchive?.(routine);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Archive className="w-3.5 h-3.5 text-text-muted" />
                  <span>Archive</span>
                </button>

                <div className="my-1 border-t border-black/5 dark:border-white/5" />

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete?.(routine);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title (1 to 2 lines) */}
        <h3 className="text-lg font-bold text-text-primary tracking-tight line-clamp-2 leading-snug">
          {routine.title}
        </h3>

        {/* Chips Row: Schedule + Time of Day */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            style={{
              backgroundColor: palette.containerLight,
              color: palette.textLight
            }}
          >
            <Calendar className="w-3 h-3" />
            <span>{getScheduleLabel()}</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/5 text-text-muted">
            <Clock className="w-3 h-3 opacity-60" />
            <span>{getTimeOfDayLabel()}</span>
          </span>
        </div>
      </div>

      {/* Middle/Bottom Area: Big 48px Check Button + Weekly Strip */}
      <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/5 space-y-4">
        {/* Big Check-in Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-text-muted">
            {isDoneToday ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Done for today!
              </span>
            ) : isFrozenToday ? (
              <span className="font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                <Snowflake className="w-3.5 h-3.5" /> Streak frozen
              </span>
            ) : isScheduledToday ? (
              <span className="font-medium text-text-primary">Tap to complete</span>
            ) : (
              <span className="text-text-muted italic">Not scheduled today</span>
            )}
          </div>

          {/* 48px BIG Check-in Button */}
          <button
            type="button"
            onClick={handleCheckIn}
            onMouseDown={() => setIsPressing(true)}
            onMouseUp={() => setIsPressing(false)}
            onMouseLeave={() => setIsPressing(false)}
            className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-500/30 ${
              isPressing ? 'scale-90' : 'hover:scale-105'
            } ${
              isDoneToday 
                ? 'text-white' 
                : 'border-2 border-dashed hover:border-solid bg-white/70 dark:bg-white/5'
            }`}
            style={{
              backgroundColor: isDoneToday ? palette.accentLight : undefined,
              borderColor: palette.accentLight,
              color: isDoneToday ? '#FFFFFF' : palette.accentLight
            }}
            title={isDoneToday ? 'Done! Tap to undo' : 'Mark complete for today'}
            aria-label={isDoneToday ? `Completed ${routine.title}` : `Complete ${routine.title}`}
          >
            {/* Ripple ring */}
            {rippleActive && (
              <span className="absolute inset-0 rounded-full animate-ping opacity-30 bg-current pointer-events-none" />
            )}
            <Check 
              className={`w-6 h-6 transition-all duration-300 ${
                isDoneToday ? 'scale-110 stroke-[3]' : 'scale-75 opacity-40 group-hover:opacity-70'
              }`} 
            />
          </button>
        </div>

        {/* 7-Day Weekly Strip (Mon to Sun) */}
        <div>
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {weekDays.map(day => {
              const entry = entries.find(e => e.entry_date === day.dateStr);
              const isDone = isEntryComplete(entry, routine);
              const isFrozen = Boolean(entry?.is_freeze);
              const isScheduled = isScheduledOn(routine, day.dateStr);

              return (
                <div key={day.dateStr} className="flex flex-col items-center gap-1">
                  <span className={`text-[10px] font-semibold ${day.isToday ? 'text-text-primary font-bold' : 'text-text-muted opacity-60'}`}>
                    {day.shortLabel}
                  </span>
                  
                  <button
                    type="button"
                    disabled={day.isFuture}
                    onClick={(e) => handleDayClick(e, day)}
                    title={`${day.fullDayName} ${day.dayNumber} ${isDone ? '✓ Completed' : isFrozen ? '❄ Frozen' : isScheduled && day.isPast ? 'Missed' : ''}`}
                    className={`w-full aspect-square max-w-[34px] rounded-xl flex items-center justify-center text-[11px] font-bold transition-all ${
                      day.isToday ? 'ring-2 ring-text-primary ring-offset-2 ring-offset-bg-primary' : ''
                    } ${
                      isDone
                        ? 'text-white shadow-2xs'
                        : isFrozen
                        ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700 border-dashed'
                        : isScheduled && day.isPast
                        ? 'bg-black/5 dark:bg-white/5 text-text-muted/60 hover:bg-black/10'
                        : day.isFuture
                        ? 'opacity-25 cursor-default'
                        : 'opacity-40 hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: isDone ? palette.accentLight : undefined
                    }}
                  >
                    {isDone ? '✓' : isFrozen ? '❄' : day.dayNumber}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Weekly Progress Footer */}
          <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] font-medium text-text-muted">
            <span>{weekCompletedCount} / {weekScheduledCount} this week</span>
            <div className="w-24 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${weekScheduledCount > 0 ? (weekCompletedCount / weekScheduledCount) * 100 : 0}%`,
                  backgroundColor: palette.accentLight
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
