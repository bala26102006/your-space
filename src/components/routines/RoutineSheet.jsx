import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Calendar, 
  Clock, 
  Sparkles, 
  Target, 
  Flame, 
  Heart,
  ChevronDown,
  Info
} from 'lucide-react';
import { 
  TONAL_PALETTES, 
  formatLocalDate, 
  getTodayStr,
  ROUTINE_TEMPLATES 
} from '../../lib/routines/routineUtils';

const EMOJI_OPTIONS = ['💧', '🏃', '📚', '🧘', '🌙', '⚡', '🌿', '✍️', '☕', '🍎', '🚴', '🎨', '💪', '🛌', '🚶', '🎯'];

export default function RoutineSheet({
  isOpen,
  onClose,
  onSave,
  routine = null,
  prefill = null
}) {
  const isEditing = Boolean(routine);

  // Form State
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('💧');
  const [tonalPalette, setTonalPalette] = useState('sky');
  const [scheduleType, setScheduleType] = useState('daily');
  const [targetDays, setTargetDays] = useState([1, 2, 3, 4, 5]); // default Mon-Fri if specific days
  const [targetTimesPerWeek, setTargetTimesPerWeek] = useState(3);
  const [timeOfDay, setTimeOfDay] = useState('morning');
  const [reminderTime, setReminderTime] = useState('');
  const [goalType, setGoalType] = useState('check');
  const [goalTarget, setGoalTarget] = useState(1);
  const [goalUnit, setGoalUnit] = useState('');
  const [whyNote, setWhyNote] = useState('');
  const [startDate, setStartDate] = useState(getTodayStr());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill or load existing routine
  useEffect(() => {
    if (!isOpen) return;

    if (routine) {
      const c = routine.content || {};
      setTitle(routine.title || '');
      setIcon(c.icon || '💧');
      setTonalPalette(c.tonalPalette || 'sky');
      setScheduleType(c.scheduleType || c.frequency || 'daily');
      setTargetDays(c.targetDays || [1, 2, 3, 4, 5]);
      setTargetTimesPerWeek(c.targetTimesPerWeek || 3);
      setTimeOfDay(c.timeOfDay || 'anytime');
      setReminderTime(c.reminderTime || '');
      setGoalType(c.goalType || 'check');
      setGoalTarget(c.goalTarget || 1);
      setGoalUnit(c.goalUnit || '');
      setWhyNote(c.whyNote || '');
      setStartDate(c.startDate || getTodayStr());
    } else if (prefill) {
      setTitle(prefill.title || '');
      setIcon(prefill.icon || '💧');
      setTonalPalette(prefill.tonalPalette || 'sky');
      setScheduleType(prefill.scheduleType || 'daily');
      setTargetDays(prefill.targetDays || [1, 2, 3, 4, 5]);
      setTargetTimesPerWeek(prefill.targetTimesPerWeek || 3);
      setTimeOfDay(prefill.timeOfDay || 'morning');
      setReminderTime(prefill.reminderTime || '');
      setGoalType(prefill.goalType || 'check');
      setGoalTarget(prefill.goalTarget || 1);
      setGoalUnit(prefill.goalUnit || '');
      setWhyNote(prefill.whyNote || '');
      setStartDate(getTodayStr());
    } else {
      // Clean new routine defaults
      setTitle('');
      setIcon('💧');
      setTonalPalette('sky');
      setScheduleType('daily');
      setTargetDays([1, 2, 3, 4, 5]);
      setTargetTimesPerWeek(3);
      setTimeOfDay('morning');
      setReminderTime('');
      setGoalType('check');
      setGoalTarget(1);
      setGoalUnit('');
      setWhyNote('');
      setStartDate(getTodayStr());
    }
  }, [isOpen, routine, prefill]);

  if (!isOpen) return null;

  const currentPalette = TONAL_PALETTES[tonalPalette] || TONAL_PALETTES.sky;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const routineData = {
        title: title.trim(),
        color: tonalPalette, // sync color string with tonalPalette
        content: {
          ...(routine?.content || {}),
          icon,
          tonalPalette,
          scheduleType,
          targetDays,
          targetTimesPerWeek: Number(targetTimesPerWeek) || 3,
          timeOfDay,
          reminderTime: reminderTime || null,
          goalType,
          goalTarget: Number(goalTarget) || 1,
          goalUnit: goalUnit.trim(),
          whyNote: whyNote.trim(),
          startDate,
          frequency: scheduleType === 'monthly' ? 'monthly' : scheduleType === 'times_per_week' ? 'weekly' : 'daily'
        }
      };

      await onSave(routineData);
      onClose();
    } catch (err) {
      console.error('Failed to save routine:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDay = (dayNum) => {
    setTargetDays(prev => {
      if (prev.includes(dayNum)) {
        if (prev.length === 1) return prev; // Keep at least 1 day
        return prev.filter(d => d !== dayNum);
      }
      return [...prev, dayNum].sort();
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-xl max-h-[92vh] bg-bg-primary rounded-t-3xl sm:rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10 shrink-0">
          <h2 className="text-lg font-bold text-text-primary tracking-tight">
            {isEditing ? 'Edit Routine' : 'Create Routine'}
          </h2>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. Live Preview Card */}
          <div>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Card Live Preview</span>
              <span className="text-[10px] font-normal lowercase opacity-75">Updates as you edit</span>
            </div>

            <div 
              className="p-4 rounded-2xl border shadow-xs transition-colors flex items-center justify-between gap-4"
              style={{
                backgroundColor: currentPalette.bgLight,
                borderColor: currentPalette.borderLight
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-2xs"
                  style={{ backgroundColor: currentPalette.containerLight }}
                >
                  {icon}
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-text-primary truncate">
                    {title.trim() || 'Routine Name'}
                  </h4>
                  <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: currentPalette.textLight }}>
                    <span className="capitalize font-semibold">{scheduleType.replace('_', ' ')}</span>
                    <span>•</span>
                    <span className="capitalize">{timeOfDay}</span>
                    {goalType !== 'check' && (
                      <>
                        <span>•</span>
                        <span>{goalTarget} {goalUnit || (goalType === 'minutes' ? 'mins' : 'units')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: currentPalette.accentLight }}
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* 2. Routine Name */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Routine Title *
            </label>
            <input
              autoFocus
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning Meditation, Drink 8 Glasses Water"
              className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all"
            />
          </div>

          {/* 3. Icon & Color Palette Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Emoji Selection */}
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Icon / Emoji
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-xl max-h-24 overflow-y-auto">
                {EMOJI_OPTIONS.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setIcon(em)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:scale-110 transition-transform ${
                      icon === em ? 'bg-white dark:bg-white/20 shadow-xs ring-2 ring-text-primary/40' : ''
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* 8 Tonal Color Palette Picker */}
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Tonal Palette
              </label>
              <div className="grid grid-cols-4 gap-2 py-1">
                {Object.values(TONAL_PALETTES).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTonalPalette(p.id)}
                    title={p.name}
                    className={`h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 border ${
                      tonalPalette === p.id ? 'ring-2 ring-offset-2 ring-text-primary font-bold' : 'border-black/10 dark:border-white/10'
                    }`}
                    style={{ backgroundColor: p.containerLight, color: p.textLight }}
                  >
                    {tonalPalette === p.id && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Schedule Type */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Frequency & Schedule
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'daily', label: 'Daily' },
                { id: 'weekdays', label: 'Weekdays' },
                { id: 'times_per_week', label: 'X / Week' },
                { id: 'specific_days', label: 'Specific Days' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScheduleType(opt.id)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    scheduleType === opt.id
                      ? 'bg-sky-500/15 border-sky-500 text-sky-700 dark:text-sky-300 shadow-2xs'
                      : 'border-black/10 dark:border-white/10 text-text-muted hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Sub-selector for Specific Days */}
            {scheduleType === 'specific_days' && (
              <div className="mt-3 flex gap-1.5">
                {[
                  { d: 1, label: 'Mon' },
                  { d: 2, label: 'Tue' },
                  { d: 3, label: 'Wed' },
                  { d: 4, label: 'Thu' },
                  { d: 5, label: 'Fri' },
                  { d: 6, label: 'Sat' },
                  { d: 7, label: 'Sun' },
                ].map(({ d, label }) => {
                  const isSelected = targetDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                          : 'border-black/10 dark:border-white/10 text-text-muted hover:bg-black/5'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sub-selector for Times Per Week */}
            {scheduleType === 'times_per_week' && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-text-muted font-medium">Goal per week:</span>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTargetTimesPerWeek(num)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${
                        targetTimesPerWeek === num
                          ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                          : 'border-black/10 dark:border-white/10 text-text-muted hover:bg-black/5'
                      }`}
                    >
                      {num}x
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. Time of Day (Sticky grouping) */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Time of Day
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'morning', label: 'Morning' },
                { id: 'afternoon', label: 'Afternoon' },
                { id: 'evening', label: 'Evening' },
                { id: 'anytime', label: 'Anytime' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeOfDay(t.id)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    timeOfDay === t.id
                      ? 'bg-sky-500/15 border-sky-500 text-sky-700 dark:text-sky-300 shadow-2xs'
                      : 'border-black/10 dark:border-white/10 text-text-muted hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Advanced Section Toggle (Anti-clutter: simple by default, advanced behind More) */}
          <div className="border-t border-black/5 dark:border-white/5 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
            >
              <span>{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Daily Goal, Why This Matters)'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Daily Target Goal */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Goal Type
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { id: 'check', label: 'Check-off Only' },
                    { id: 'count', label: 'Numeric Count' },
                    { id: 'minutes', label: 'Duration (Mins)' },
                  ].map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoalType(g.id)}
                      className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                        goalType === g.id
                          ? 'bg-sky-500/15 border-sky-500 text-sky-700 dark:text-sky-300'
                          : 'border-black/10 dark:border-white/10 text-text-muted hover:bg-black/5'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {goalType !== 'check' && (
                  <div className="flex gap-3">
                    <div className="w-1/2">
                      <label className="block text-[11px] text-text-muted mb-1 font-medium">Target Amount</label>
                      <input
                        type="number"
                        min="1"
                        value={goalTarget}
                        onChange={(e) => setGoalTarget(e.target.value)}
                        className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-text-primary"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-[11px] text-text-muted mb-1 font-medium">Unit (optional)</label>
                      <input
                        type="text"
                        placeholder={goalType === 'minutes' ? 'mins' : 'glasses, pages'}
                        value={goalUnit}
                        onChange={(e) => setGoalUnit(e.target.value)}
                        className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-text-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* "Why This Matters" Note */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Why This Matters (Motivation)
                </label>
                <textarea
                  rows={2}
                  value={whyNote}
                  onChange={(e) => setWhyNote(e.target.value)}
                  placeholder="e.g. Keeps my focus sharp and my energy steady all morning."
                  className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-xl p-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/10 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-text-muted hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-6 py-2.5 text-xs font-bold bg-sky-500 text-white rounded-xl shadow-sm hover:bg-sky-600 active:scale-95 transition-all disabled:opacity-50"
            >
              {isEditing ? 'Save Changes' : 'Create Routine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
