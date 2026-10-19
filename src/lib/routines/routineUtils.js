/**
 * Local Date and Routine Calculation Utilities
 * 
 * CRITICAL RULE: Never use toISOString() for date strings to prevent UTC timezone shifts.
 * Always format YYYY-MM-DD in the user's local timezone.
 */

// 1. Local Date Helpers
export function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getTodayStr() {
  return formatLocalDate(new Date());
}

/**
 * Returns array of 7 day strings (Monday to Sunday) for the week containing referenceDateStr.
 */
export function getWeekDaysMondayStart(referenceDateStr = getTodayStr()) {
  const ref = parseLocalDate(referenceDateStr);
  // getDay(): 0 = Sun, 1 = Mon ... 6 = Sat
  const currentDay = ref.getDay();
  // Distance from Monday (1). If Sunday (0), distance is 6.
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;

  const monday = new Date(ref);
  monday.setDate(ref.getDate() - distanceToMonday);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = formatLocalDate(d);
    const dayOfWeek = d.getDay(); // 0-6
    // ISO day: 1 = Mon, 7 = Sun
    const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    const shortLabel = ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i];
    const fullDayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];

    days.push({
      dateStr,
      isoDay,
      shortLabel,
      fullDayName,
      dayNumber: d.getDate(),
      isToday: dateStr === getTodayStr(),
      isPast: dateStr < getTodayStr(),
      isFuture: dateStr > getTodayStr()
    });
  }
  return days;
}

// 2. Fixed Tonal Palette System (8 Curated Tonal Colors + Legacy Mapping)
export const TONAL_PALETTES = {
  sky: {
    id: 'sky',
    name: 'Sky Blue',
    bgLight: '#F0F9FF',
    borderLight: '#BAE6FD',
    accentLight: '#0284C7',
    textLight: '#0369A1',
    containerLight: '#E0F2FE',
    bgDark: 'rgba(14, 165, 233, 0.12)',
    borderDark: 'rgba(56, 189, 248, 0.3)',
    accentDark: '#38BDF8',
    textDark: '#BAE6FD',
    containerDark: 'rgba(14, 165, 233, 0.22)',
    flame: '#0284C7'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    bgLight: '#ECFDF5',
    borderLight: '#A7F3D0',
    accentLight: '#059669',
    textLight: '#047857',
    containerLight: '#D1FAE5',
    bgDark: 'rgba(16, 185, 129, 0.12)',
    borderDark: 'rgba(52, 211, 153, 0.3)',
    accentDark: '#34D399',
    textDark: '#A7F3D0',
    containerDark: 'rgba(16, 185, 129, 0.22)',
    flame: '#059669'
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    accentLight: '#D97706',
    textLight: '#B45309',
    containerLight: '#FEF3C7',
    bgDark: 'rgba(245, 158, 11, 0.12)',
    borderDark: 'rgba(251, 191, 36, 0.3)',
    accentDark: '#FBBF24',
    textDark: '#FDE68A',
    containerDark: 'rgba(245, 158, 11, 0.22)',
    flame: '#F59E0B'
  },
  coral: {
    id: 'coral',
    name: 'Coral',
    bgLight: '#FFF7ED',
    borderLight: '#FED7AA',
    accentLight: '#EA580C',
    textLight: '#C2410C',
    containerLight: '#FFEDD5',
    bgDark: 'rgba(249, 115, 22, 0.12)',
    borderDark: 'rgba(251, 146, 60, 0.3)',
    accentDark: '#FB923C',
    textDark: '#FED7AA',
    containerDark: 'rgba(249, 115, 22, 0.22)',
    flame: '#EA580C'
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo',
    bgLight: '#EEF2FF',
    borderLight: '#C7D2FE',
    accentLight: '#4F46E5',
    textLight: '#4338CA',
    containerLight: '#E0E7FF',
    bgDark: 'rgba(99, 102, 241, 0.12)',
    borderDark: 'rgba(129, 140, 248, 0.3)',
    accentDark: '#818CF8',
    textDark: '#C7D2FE',
    containerDark: 'rgba(99, 102, 241, 0.22)',
    flame: '#6366F1'
  },
  violet: {
    id: 'violet',
    name: 'Violet',
    bgLight: '#F5F3FF',
    borderLight: '#DDD6FE',
    accentLight: '#7C3AED',
    textLight: '#6D28D9',
    containerLight: '#EDE9FE',
    bgDark: 'rgba(139, 92, 246, 0.12)',
    borderDark: 'rgba(167, 139, 250, 0.3)',
    accentDark: '#A78BFA',
    textDark: '#DDD6FE',
    containerDark: 'rgba(139, 92, 246, 0.22)',
    flame: '#8B5CF6'
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    accentLight: '#E11D48',
    textLight: '#BE123C',
    containerLight: '#FFE4E6',
    bgDark: 'rgba(244, 63, 94, 0.12)',
    borderDark: 'rgba(251, 113, 133, 0.3)',
    accentDark: '#FB7185',
    textDark: '#FECDD3',
    containerDark: 'rgba(244, 63, 94, 0.22)',
    flame: '#F43F5E'
  },
  teal: {
    id: 'teal',
    name: 'Teal',
    bgLight: '#F0FDFA',
    borderLight: '#99F6E4',
    accentLight: '#0D9488',
    textLight: '#0F766E',
    containerLight: '#CCFBF1',
    bgDark: 'rgba(20, 184, 166, 0.12)',
    borderDark: 'rgba(45, 212, 191, 0.3)',
    accentDark: '#2DD4BF',
    textDark: '#99F6E4',
    containerDark: 'rgba(20, 184, 166, 0.22)',
    flame: '#0D9488'
  }
};

/**
 * Fixed legacy color to tonal palette mapping (without altering stored data).
 */
export function resolveTonalPalette(routine) {
  const explicit = routine?.content?.tonalPalette;
  if (explicit && TONAL_PALETTES[explicit]) {
    return TONAL_PALETTES[explicit];
  }

  const legacyColor = routine?.color || routine?.content?.color || 'default';
  switch (legacyColor) {
    case 'yellow': return TONAL_PALETTES.amber;
    case 'blue': return TONAL_PALETTES.sky;
    case 'green': return TONAL_PALETTES.emerald;
    case 'purple': return TONAL_PALETTES.violet;
    case 'red': return TONAL_PALETTES.rose;
    default: return TONAL_PALETTES.sky;
  }
}

// 3. Schedule Resolution & Evaluation
export function isScheduledOn(routine, dateStr) {
  if (!routine || routine.is_archived || routine.is_deleted) return false;
  if (routine.content?.isPaused) return false;

  const content = routine.content || {};
  const scheduleType = content.scheduleType || content.frequency || 'daily';
  const targetDate = parseLocalDate(dateStr);
  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 1 = Mon .. 7 = Sun

  switch (scheduleType) {
    case 'daily':
      return true;
    case 'weekdays':
      return isoDay >= 1 && isoDay <= 5;
    case 'specific_days':
      if (Array.isArray(content.targetDays) && content.targetDays.length > 0) {
        return content.targetDays.includes(isoDay);
      }
      return true;
    case 'times_per_week':
      // X times per week is active all week until target met
      return true;
    case 'monthly':
      // Scheduled on the day of month matching routine creation, or 1st of month
      const startDay = content.startDate ? parseLocalDate(content.startDate).getDate() : 1;
      return targetDate.getDate() === startDay;
    case 'weekly':
      // Legacy weekly: defaults to active
      return true;
    default:
      return true;
  }
}

/**
 * Evaluates whether an entry counts as completed according to routine goal settings.
 */
export function isEntryComplete(entry, routine) {
  if (!entry) return false;
  if (entry.is_completed) {
    const goalType = routine?.content?.goalType || 'check';
    const goalTarget = routine?.content?.goalTarget || 1;
    if (goalType === 'count' || goalType === 'minutes') {
      // If legacy entry has no value, but is_completed is true, it counts as complete
      if (entry.value !== undefined) {
        return entry.value >= goalTarget;
      }
    }
    return true;
  }
  return false;
}

/**
 * Computes accurate streak counting ONLY scheduled days from entry history.
 */
export function calculateScheduledStreak(routineId, allEntries, routine) {
  const entries = (allEntries || []).filter(e => e.note_id === routineId);
  const entryMap = new Map(entries.map(e => [e.entry_date, e]));

  const todayStr = getTodayStr();
  let checkDate = parseLocalDate(todayStr);

  // Check if today is scheduled
  const isScheduledToday = isScheduledOn(routine, todayStr);
  const todayEntry = entryMap.get(todayStr);
  const isTodayDone = isEntryComplete(todayEntry, routine);
  const isTodayFrozen = Boolean(todayEntry?.is_freeze);

  let streak = 0;

  // If today is scheduled and not done/frozen, start checking from yesterday so current streak doesn't drop prematurely today
  if (isScheduledToday && !isTodayDone && !isTodayFrozen) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Iterate backwards day by day for up to 365 days
  let safetyCounter = 0;
  while (safetyCounter < 365) {
    safetyCounter++;
    const dateStr = formatLocalDate(checkDate);

    // Only inspect if scheduled on this day
    const scheduled = isScheduledOn(routine, dateStr);
    if (scheduled) {
      const entry = entryMap.get(dateStr);
      const done = isEntryComplete(entry, routine);
      const frozen = Boolean(entry?.is_freeze);

      if (done) {
        streak++;
      } else if (frozen) {
        // Freeze protects streak without adding
      } else {
        // Streak broken
        break;
      }
    }

    // Move 1 day back
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

/**
 * 8 Google-Level Quick-Start Templates
 */
export const ROUTINE_TEMPLATES = [
  {
    title: 'Drink Water',
    icon: '💧',
    tonalPalette: 'sky',
    scheduleType: 'daily',
    timeOfDay: 'anytime',
    goalType: 'count',
    goalTarget: 8,
    goalUnit: 'glasses',
    whyNote: 'Stay hydrated, boost energy, and keep clear focus throughout the day.'
  },
  {
    title: 'Workout Session',
    icon: '🏃',
    tonalPalette: 'coral',
    scheduleType: 'times_per_week',
    targetTimesPerWeek: 4,
    timeOfDay: 'morning',
    goalType: 'minutes',
    goalTarget: 30,
    goalUnit: 'mins',
    whyNote: 'Build sustainable physical strength and mental resilience.'
  },
  {
    title: 'Read 10 Minutes',
    icon: '📚',
    tonalPalette: 'indigo',
    scheduleType: 'daily',
    timeOfDay: 'evening',
    goalType: 'minutes',
    goalTarget: 10,
    goalUnit: 'mins',
    whyNote: 'Calm the mind with continuous learning before bedtime.'
  },
  {
    title: 'Morning Meditation',
    icon: '🧘',
    tonalPalette: 'teal',
    scheduleType: 'daily',
    timeOfDay: 'morning',
    goalType: 'minutes',
    goalTarget: 10,
    goalUnit: 'mins',
    whyNote: 'Start every morning grounded in breath and stillness.'
  },
  {
    title: 'Sleep by 11 PM',
    icon: '🌙',
    tonalPalette: 'violet',
    scheduleType: 'daily',
    timeOfDay: 'evening',
    goalType: 'check',
    whyNote: 'Consistent circadian rhythm for refreshed morning energy.'
  },
  {
    title: 'Deep Study Session',
    icon: '⚡',
    tonalPalette: 'amber',
    scheduleType: 'weekdays',
    timeOfDay: 'afternoon',
    goalType: 'minutes',
    goalTarget: 45,
    goalUnit: 'mins',
    whyNote: 'Focused uninterrupted deep work block with zero distractions.'
  },
  {
    title: 'Morning Walk',
    icon: '🌿',
    tonalPalette: 'emerald',
    scheduleType: 'daily',
    timeOfDay: 'morning',
    goalType: 'minutes',
    goalTarget: 20,
    goalUnit: 'mins',
    whyNote: 'Morning sunlight and fresh air to activate cortisol naturally.'
  },
  {
    title: 'Daily Journaling',
    icon: '✍️',
    tonalPalette: 'rose',
    scheduleType: 'daily',
    timeOfDay: 'evening',
    goalType: 'check',
    whyNote: 'Unload racing thoughts and capture grateful memories from today.'
  }
];
