/**
 * ===================================================================
 * JOURNAL DOMAIN UTILITIES ("WARM SANCTUARY")
 * Strictly uses local dates (never toISOString for day keys).
 * Provides gentle streak logic (1 grace day / week), deterministic
 * shared prompts, mood configuration, and heatmap math.
 * ===================================================================
 */

// --- 1. LOCAL DATE HELPERS ---

/**
 * Returns today's date in local 'YYYY-MM-DD' format.
 */
export function getTodayLocalDateStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts any Date object to local 'YYYY-MM-DD'.
 */
export function toLocalDateStr(date) {
  if (!date || isNaN(new Date(date).getTime())) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses 'YYYY-MM-DD' into an integer day number using Date.UTC.
 * This guarantees exact whole-day math across leap years and DST.
 */
export function dateStrToDayNumber(dStr) {
  if (!dStr || typeof dStr !== 'string') return null;
  const parts = dStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/**
 * Converts an ISO created_at string to local 'YYYY-MM-DD' strictly
 * as a fallback when entry_date is missing on legacy entries.
 */
export function extractLocalDateFromCreated(createdAt) {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return null;
  return toLocalDateStr(d);
}

/**
 * Formats an entry date string into human-readable label.
 */
export function formatEntryDate(dateStr) {
  if (!dateStr) return 'Recent';
  const todayStr = getTodayLocalDateStr();

  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterdayStr = toLocalDateStr(d);

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  try {
    const [y, m, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, day);
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Formats a date string into a sticky Month heading (e.g. "October 2026").
 */
export function formatMonthHeading(dateStr) {
  if (!dateStr) return 'Earlier';
  try {
    const [y, m] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, 1);
    return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch (e) {
    return 'Earlier';
  }
}

// --- 2. MOOD CONFIGURATION & FALLBACKS ---

export const MOOD_CONFIG = {
  Calm: {
    id: 'Calm',
    label: 'Calm',
    emoji: '😌',
    colorVar: 'var(--mood-calm)',
    bgVar: 'var(--mood-calm-bg)',
    borderVar: 'var(--mood-calm-border)',
    textVar: 'var(--mood-calm-text)',
    dotColor: '#2D6B8C',
  },
  Grateful: {
    id: 'Grateful',
    label: 'Grateful',
    emoji: '🙏',
    colorVar: 'var(--mood-grateful)',
    bgVar: 'var(--mood-grateful-bg)',
    borderVar: 'var(--mood-grateful-border)',
    textVar: 'var(--mood-grateful-text)',
    dotColor: '#3B722C',
  },
  Restless: {
    id: 'Restless',
    label: 'Restless',
    emoji: '🏃',
    colorVar: 'var(--mood-restless)',
    bgVar: 'var(--mood-restless-bg)',
    borderVar: 'var(--mood-restless-border)',
    textVar: 'var(--mood-restless-text)',
    dotColor: '#9B5D0F',
  },
  Tired: {
    id: 'Tired',
    label: 'Tired',
    emoji: '😴',
    colorVar: 'var(--mood-tired)',
    bgVar: 'var(--mood-tired-bg)',
    borderVar: 'var(--mood-tired-border)',
    textVar: 'var(--mood-tired-text)',
    dotColor: '#624883',
  },
};

export const NEUTRAL_MOOD_CONFIG = {
  id: 'Neutral',
  label: 'Neutral',
  emoji: '✨',
  colorVar: 'var(--mood-neutral)',
  bgVar: 'var(--mood-neutral-bg)',
  borderVar: 'var(--mood-neutral-border)',
  textVar: 'var(--mood-neutral-text)',
  dotColor: '#B88944',
};

/**
 * Returns the mood configuration object safely. Never returns null/undefined.
 */
export function getMoodConfig(moodId) {
  if (!moodId) return NEUTRAL_MOOD_CONFIG;
  return MOOD_CONFIG[moodId] || {
    id: moodId,
    label: moodId,
    emoji: '✨',
    colorVar: 'var(--mood-neutral)',
    bgVar: 'var(--mood-neutral-bg)',
    borderVar: 'var(--mood-neutral-border)',
    textVar: 'var(--mood-neutral-text)',
    dotColor: '#B88944',
  };
}

// --- 3. SHARED PROMPT PACKS & DETERMINISTIC PICKER ---

export const PROMPT_PACKS = [
  {
    id: 'reflection',
    label: 'Reflection',
    icon: 'BookOpen',
    prompts: [
      "If today was a chapter in your book, what would it be called?",
      "What is something you learned about yourself this week?",
      "Describe a challenge you faced recently and how you responded.",
      "What drained your energy today? What restored it?",
      "What is a decision you made that you feel good about?",
      "What boundary did you protect or need to set?",
      "What would you tell yourself from one year ago?",
      "Describe your immediate surroundings right now in detail.",
      "What is an emotion you felt strongly today and why?",
      "What is a question you don't yet have the answer to?",
    ],
  },
  {
    id: 'gratitude',
    label: 'Gratitude',
    icon: 'Sparkles',
    prompts: [
      "What are three small things that made you smile today?",
      "Write about a person who brought light or warmth to your day.",
      "What is a simple everyday comfort you often take for granted?",
      "What is something beautiful you noticed in the world today?",
      "How did someone show you kindness recently?",
      "What is a memory that always brings a gentle smile to your face?",
      "What is something you appreciate about your body or mind today?",
      "Write about a meal, sound, or scent that felt deeply comforting.",
    ],
  },
  {
    id: 'braindump',
    label: 'Brain Dump',
    icon: 'Wind',
    prompts: [
      "What thought is currently taking up the most space in your head?",
      "List everything feeling unfinished right now, then let it rest here.",
      "What worries are within your control today, and which belong to tomorrow?",
      "What is something you need to give yourself permission to let go of?",
      "Write down the raw, unfiltered truth of how you are feeling right now.",
    ],
  },
  {
    id: 'morning',
    label: 'Morning Intention',
    icon: 'Sun',
    prompts: [
      "What is one gentle intention you have for today?",
      "How do you want to feel when your head hits the pillow tonight?",
      "What is one kind thing you can do for yourself before midday?",
      "If you only accomplish one meaningful thing today, what should it be?",
      "What energy or posture do you choose to bring to your work today?",
    ],
  },
  {
    id: 'evening',
    label: 'Evening Wind-down',
    icon: 'Moon',
    prompts: [
      "What was the most peaceful moment of your day?",
      "What can you forgive yourself for before sleeping tonight?",
      "What was a small victory or effort worth acknowledging today?",
      "What are you ready to close the book on as this day ends?",
      "What are you quietly looking forward to tomorrow?",
    ],
  },
  {
    id: 'advice_friend',
    label: 'Advice to a Friend',
    icon: 'Heart',
    prompts: [
      "If a dear friend were in your current situation, what loving counsel would you offer them?",
      "What would someone who loves you deeply notice about your efforts lately?",
      "Where are you being too hard on yourself, and how can you soften that judgment?",
      "What truth have you been avoiding telling yourself with gentleness?",
    ],
  },
];

// Flat list of all prompts for deterministic index resolution
export const ALL_PACK_PROMPTS = PROMPT_PACKS.flatMap(p => p.prompts);

/**
 * Returns a deterministic daily prompt based on the local calendar date.
 * Both JournalView and TodayDashboard call this so they always agree.
 */
export function getDailyPrompt(packId = 'all', targetDate = new Date()) {
  const d = new Date(targetDate);
  const startOfYear = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.max(1, Math.floor(diff / oneDay));

  let candidatePrompts = ALL_PACK_PROMPTS;
  let packCategory = 'Daily Reflection';

  if (packId && packId !== 'all') {
    const foundPack = PROMPT_PACKS.find(p => p.id === packId);
    if (foundPack) {
      candidatePrompts = foundPack.prompts;
      packCategory = foundPack.label;
    }
  }

  const promptIndex = dayOfYear % candidatePrompts.length;
  const promptText = candidatePrompts[promptIndex];

  return {
    text: promptText,
    category: packCategory,
    packId: packId || 'reflection',
    index: promptIndex,
  };
}

/**
 * Shuffles to another prompt strictly within the selected pack.
 */
export function shufflePrompt(packId = 'all', currentPromptText = '') {
  let candidatePrompts = ALL_PACK_PROMPTS;
  let packCategory = 'Daily Reflection';

  if (packId && packId !== 'all') {
    const foundPack = PROMPT_PACKS.find(p => p.id === packId);
    if (foundPack) {
      candidatePrompts = foundPack.prompts;
      packCategory = foundPack.label;
    }
  }

  const filtered = candidatePrompts.filter(p => p !== currentPromptText);
  if (filtered.length === 0) return { text: currentPromptText, category: packCategory, packId };

  const randomIdx = Math.floor(Math.random() * filtered.length);
  return {
    text: filtered[randomIdx],
    category: packCategory,
    packId: packId || 'all',
  };
}

// --- 4. GENTLE STREAK & CALENDAR CALCULATIONS ---

/**
 * Calculates streak and monthly writing stats.
 * Uses whole-day numbers with Date.UTC(y, m-1, d).
 * Allows 1 grace day per week (never penalizes broken streaks abruptly).
 * Guarantees existing users will NOT see their current streak drop!
 */
export function calculateJournalStreak(journalNotes = []) {
  const todayStr = getTodayLocalDateStr();
  const todayDayNum = dateStrToDayNumber(todayStr);

  if (!Array.isArray(journalNotes) || journalNotes.length === 0 || todayDayNum === null) {
    return {
      currentStreak: 0,
      monthWritingDays: 0,
      wroteToday: false,
      isLit: false,
      statusText: "A quiet place for your thoughts",
    };
  }

  // 1. Gather all unique valid writing day numbers
  const validDayNumbers = new Set();
  const currentMonthPrefix = todayStr.substring(0, 7); // 'YYYY-MM'
  let monthWritingDaysCount = 0;
  const monthDaysSeen = new Set();

  journalNotes.forEach((note) => {
    if (note.is_archived || note.is_deleted) return;
    const dateKey = note.entry_date || extractLocalDateFromCreated(note.created_at);
    if (!dateKey || typeof dateKey !== 'string') return;

    const dayNum = dateStrToDayNumber(dateKey);
    if (dayNum !== null) {
      validDayNumbers.add(dayNum);
      if (dateKey.startsWith(currentMonthPrefix) && !monthDaysSeen.has(dateKey)) {
        monthDaysSeen.add(dateKey);
        monthWritingDaysCount++;
      }
    }
  });

  const wroteToday = validDayNumbers.has(todayDayNum);
  const isLit = wroteToday;

  // 2. Determine anchor day for streak
  // Streak is considered active if written today or yesterday
  const yesterdayDayNum = todayDayNum - 1;
  const anchorDay = wroteToday ? todayDayNum : validDayNumbers.has(yesterdayDayNum) ? yesterdayDayNum : null;

  if (anchorDay === null) {
    return {
      currentStreak: 0,
      monthWritingDays: monthWritingDaysCount,
      wroteToday: false,
      isLit: false,
      statusText: "Welcome back · Light the candle with an entry",
    };
  }

  // 3. Gentle streak calculation with 1 grace day allowed per 7-day rolling window
  let streak = 0;
  let checkDay = anchorDay;
  let graceAvailable = 1;
  let daysSinceGrace = 0;

  while (true) {
    if (validDayNumbers.has(checkDay)) {
      streak++;
      daysSinceGrace++;
      if (daysSinceGrace >= 7) {
        graceAvailable = 1; // restore grace allowance after 7 consecutive days
      }
      checkDay--;
    } else {
      // Missing day encountered: can we use a grace day?
      if (graceAvailable > 0 && validDayNumbers.has(checkDay - 1)) {
        // Use grace day and continue
        graceAvailable = 0;
        daysSinceGrace = 0;
        checkDay--; // skip the missed day
      } else {
        break;
      }
    }
  }

  // Calculate strict streak as baseline to guarantee no drop
  let strictStreak = 0;
  let sCheck = anchorDay;
  while (validDayNumbers.has(sCheck)) {
    strictStreak++;
    sCheck--;
  }

  const finalStreak = Math.max(streak, strictStreak);

  let statusText = "Keep your writing rhythm going";
  if (wroteToday) {
    statusText = "Candle is lit · Thought captured for today";
  } else if (finalStreak > 0) {
    statusText = "Write today to keep your streak glowing";
  }

  return {
    currentStreak: finalStreak,
    monthWritingDays: monthWritingDaysCount,
    wroteToday,
    isLit,
    statusText,
  };
}

// --- 5. 35-DAY HEATMAP CALCULATOR ---

/**
 * Builds the 7-column x 5-row compact heatmap dataset.
 * - Matches strictly on entry_date (with created_at fallback only if missing).
 * - Multi-entry days show the mood of the most recent entry with a mood.
 * - Entries with no mood use neutral gold dot (not blue).
 */
export function buildMoodHeatmap(journalNotes = []) {
  const todayStr = getTodayLocalDateStr();
  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const todayDateObj = new Date(tY, tM - 1, tD);

  // Group notes by local date
  const dateToEntriesMap = new Map();
  (journalNotes || []).forEach(note => {
    if (note.is_archived || note.is_deleted) return;
    const dateKey = note.entry_date || extractLocalDateFromCreated(note.created_at);
    if (!dateKey) return;

    if (!dateToEntriesMap.has(dateKey)) {
      dateToEntriesMap.set(dateKey, []);
    }
    dateToEntriesMap.get(dateKey).push(note);
  });

  const days = [];
  const moodCountsLast7Days = {};

  for (let i = 34; i >= 0; i--) {
    const cur = new Date(todayDateObj);
    cur.setDate(cur.getDate() - i);
    const dateStr = toLocalDateStr(cur);
    const entries = dateToEntriesMap.get(dateStr) || [];
    const hasEntry = entries.length > 0;

    // Pick mood from most recent entry that has a mood
    let chosenMood = null;
    let chosenTitle = null;

    if (hasEntry) {
      // Sort entries by created_at descending if available
      const sorted = [...entries].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      const entryWithMood = sorted.find(e => Boolean(e.mood));
      chosenMood = entryWithMood ? entryWithMood.mood : null;
      chosenTitle = sorted[0].title || 'Daily Reflection';

      if (i < 7 && chosenMood) {
        moodCountsLast7Days[chosenMood] = (moodCountsLast7Days[chosenMood] || 0) + 1;
      }
    }

    const moodConfig = chosenMood ? getMoodConfig(chosenMood) : (hasEntry ? NEUTRAL_MOOD_CONFIG : null);

    days.push({
      date: dateStr,
      dayOfWeek: cur.getDay(), // 0 = Sun, 1 = Mon ...
      formattedDate: cur.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      hasEntry,
      entriesCount: entries.length,
      entryTitle: chosenTitle,
      mood: chosenMood,
      moodConfig,
      isToday: dateStr === todayStr,
    });
  }

  // Break into 5 rows x 7 cols
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Determine predominant mood of the week
  let topMoodThisWeek = null;
  let topMoodCount = 0;
  Object.entries(moodCountsLast7Days).forEach(([mood, count]) => {
    if (count > topMoodCount) {
      topMoodCount = count;
      topMoodThisWeek = mood;
    }
  });

  return {
    allDays: days,
    weeks,
    topMoodThisWeek: topMoodThisWeek ? getMoodConfig(topMoodThisWeek) : null,
  };
}

// --- 6. TEXT PREVIEW & EMPTY ENTRY DETECTOR ---

/**
 * Extracts plain text from a TipTap document node.
 */
export function extractTextPreview(content) {
  if (!content) return '';
  if (typeof content === 'string') return content.trim();

  const extract = (node) => {
    if (!node) return '';
    if (node.text) return node.text;
    if (Array.isArray(node.content)) {
      return node.content.map(extract).join(' ');
    }
    return '';
  };

  return extract(content).trim();
}

/**
 * Checks if a journal note has no meaningful user content.
 * An entry that only contains an inserted prompt quote or blank default title
 * is recognized as empty and safely cleaned up when leaving.
 */
export function isJournalEntryEmptyWithPrompt(note) {
  if (!note) return true;
  const rawTitle = (note.title || '').trim();
  const rawPreview = extractTextPreview(note.content);

  // Check if title is default or matches a known prompt
  const isDefaultTitle = !rawTitle || 
    rawTitle === 'Journal Entry' || 
    rawTitle === 'Daily Reflection' || 
    ALL_PACK_PROMPTS.includes(rawTitle);

  // Check if content matches the inserted prompt quote
  const isDefaultContent = !rawPreview || 
    ALL_PACK_PROMPTS.some(p => rawPreview === p || rawPreview === `"${p}"` || rawPreview === `“${p}”`);

  return isDefaultTitle && isDefaultContent;
}
