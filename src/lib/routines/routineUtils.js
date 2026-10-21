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
    cardBg: 'var(--palette-sky-card-bg)',
    container: 'var(--palette-sky-container)',
    onContainer: 'var(--palette-sky-on-container)',
    accent: 'var(--palette-sky-accent)',
    accentText: 'var(--palette-sky-accent-text)',
    border: 'var(--palette-sky-border)',
    chipBg: 'var(--palette-sky-chip-bg)',
    glow: 'var(--palette-sky-glow)',
    bgLight: '#F0F9FF',
    borderLight: '#BAE6FD',
    accentLight: '#0284C7',
    textLight: '#0369A1',
    containerLight: '#E0F2FE',
    bgDark: '#1A2733',
    borderDark: '#1E4357',
    accentDark: '#38BDF8',
    textDark: '#BAE6FD',
    containerDark: '#1A313F',
    flame: 'var(--palette-sky-accent)'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    cardBg: 'var(--palette-emerald-card-bg)',
    container: 'var(--palette-emerald-container)',
    onContainer: 'var(--palette-emerald-on-container)',
    accent: 'var(--palette-emerald-accent)',
    accentText: 'var(--palette-emerald-accent-text)',
    border: 'var(--palette-emerald-border)',
    chipBg: 'var(--palette-emerald-chip-bg)',
    glow: 'var(--palette-emerald-glow)',
    bgLight: '#ECFDF5',
    borderLight: '#A7F3D0',
    accentLight: '#059669',
    textLight: '#047857',
    containerLight: '#D1FAE5',
    bgDark: '#182A2B',
    borderDark: '#1D483F',
    accentDark: '#34D399',
    textDark: '#A7F3D0',
    containerDark: '#193432',
    flame: 'var(--palette-emerald-accent)'
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    cardBg: 'var(--palette-amber-card-bg)',
    container: 'var(--palette-amber-container)',
    onContainer: 'var(--palette-amber-on-container)',
    accent: 'var(--palette-amber-accent)',
    accentText: 'var(--palette-amber-accent-text)',
    border: 'var(--palette-amber-border)',
    chipBg: 'var(--palette-amber-chip-bg)',
    glow: 'var(--palette-amber-glow)',
    bgLight: '#FFFBEB',
    borderLight: '#FDE68A',
    accentLight: '#D97706',
    textLight: '#92400E',
    containerLight: '#FEF3C7',
    bgDark: '#29281E',
    borderDark: '#4F4322',
    accentDark: '#FBBF24',
    textDark: '#FDE68A',
    containerDark: '#353121',
    flame: 'var(--palette-amber-accent)'
  },
  coral: {
    id: 'coral',
    name: 'Coral',
    cardBg: 'var(--palette-coral-card-bg)',
    container: 'var(--palette-coral-container)',
    onContainer: 'var(--palette-coral-on-container)',
    accent: 'var(--palette-coral-accent)',
    accentText: 'var(--palette-coral-accent-text)',
    border: 'var(--palette-coral-border)',
    chipBg: 'var(--palette-coral-chip-bg)',
    glow: 'var(--palette-coral-glow)',
    bgLight: '#FFF7ED',
    borderLight: '#FED7AA',
    accentLight: '#EA580C',
    textLight: '#9A3412',
    containerLight: '#FFEDD5',
    bgDark: '#2A2325',
    borderDark: '#503636',
    accentDark: '#FF8A75',
    textDark: '#FFD5CC',
    containerDark: '#362A2D',
    flame: 'var(--palette-coral-accent)'
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo',
    cardBg: 'var(--palette-indigo-card-bg)',
    container: 'var(--palette-indigo-container)',
    onContainer: 'var(--palette-indigo-on-container)',
    accent: 'var(--palette-indigo-accent)',
    accentText: 'var(--palette-indigo-accent-text)',
    border: 'var(--palette-indigo-border)',
    chipBg: 'var(--palette-indigo-chip-bg)',
    glow: 'var(--palette-indigo-glow)',
    bgLight: '#EEF2FF',
    borderLight: '#C7D2FE',
    accentLight: '#4F46E5',
    textLight: '#3730A3',
    containerLight: '#E0E7FF',
    bgDark: '#1E2333',
    borderDark: '#303757',
    accentDark: '#818CF8',
    textDark: '#C7D2FE',
    containerDark: '#242A3F',
    flame: 'var(--palette-indigo-accent)'
  },
  violet: {
    id: 'violet',
    name: 'Violet',
    cardBg: 'var(--palette-violet-card-bg)',
    container: 'var(--palette-violet-container)',
    onContainer: 'var(--palette-violet-on-container)',
    accent: 'var(--palette-violet-accent)',
    accentText: 'var(--palette-violet-accent-text)',
    border: 'var(--palette-violet-border)',
    chipBg: 'var(--palette-violet-chip-bg)',
    glow: 'var(--palette-violet-glow)',
    bgLight: '#F5F3FF',
    borderLight: '#DDD6FE',
    accentLight: '#7C3AED',
    textLight: '#5B21B6',
    containerLight: '#EDE9FE',
    bgDark: '#212333',
    borderDark: '#3A3657',
    accentDark: '#A78BFA',
    textDark: '#DDD6FE',
    containerDark: '#292A3F',
    flame: 'var(--palette-violet-accent)'
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    cardBg: 'var(--palette-rose-card-bg)',
    container: 'var(--palette-rose-container)',
    onContainer: 'var(--palette-rose-on-container)',
    accent: 'var(--palette-rose-accent)',
    accentText: 'var(--palette-rose-accent-text)',
    border: 'var(--palette-rose-border)',
    chipBg: 'var(--palette-rose-chip-bg)',
    glow: 'var(--palette-rose-glow)',
    bgLight: '#FFF1F2',
    borderLight: '#FECDD3',
    accentLight: '#E11D48',
    textLight: '#9F1239',
    containerLight: '#FFE4E6',
    bgDark: '#292127',
    borderDark: '#4F303A',
    accentDark: '#FB7185',
    textDark: '#FECDD3',
    containerDark: '#35262F',
    flame: 'var(--palette-rose-accent)'
  },
  teal: {
    id: 'teal',
    name: 'Teal',
    cardBg: 'var(--palette-teal-card-bg)',
    container: 'var(--palette-teal-container)',
    onContainer: 'var(--palette-teal-on-container)',
    accent: 'var(--palette-teal-accent)',
    accentText: 'var(--palette-teal-accent-text)',
    border: 'var(--palette-teal-border)',
    chipBg: 'var(--palette-teal-chip-bg)',
    glow: 'var(--palette-teal-glow)',
    bgLight: '#F0FDFA',
    borderLight: '#99F6E4',
    accentLight: '#0D9488',
    textLight: '#115E59',
    containerLight: '#CCFBF1',
    bgDark: '#172A2E',
    borderDark: '#1B4949',
    accentDark: '#2DD4BF',
    textDark: '#99F6E4',
    containerDark: '#183437',
    flame: 'var(--palette-teal-accent)'
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
  if (TONAL_PALETTES[legacyColor]) {
    return TONAL_PALETTES[legacyColor];
  }
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
