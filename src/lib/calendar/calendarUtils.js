/**
 * calendarUtils.js
 * 
 * Strict local-date utilities for the "Life Lens" Calendar.
 * RULE: NEVER use toISOString() for date keys to avoid UTC timezone shifts.
 * Always format YYYY-MM-DD in the user's local timezone.
 * Handles month boundaries, leap years, and DST.
 */

import { formatLocalDate, parseLocalDate, getTodayStr } from '../routines/routineUtils';

export { formatLocalDate, parseLocalDate, getTodayStr };

const WEEK_START_KEY = 'calendar_week_start';

/**
 * Returns user's week start preference ('monday' | 'sunday').
 * Default is 'monday'.
 */
export function getWeekStartSetting() {
  try {
    const val = localStorage.getItem(WEEK_START_KEY);
    return val === 'sunday' ? 'sunday' : 'monday';
  } catch (e) {
    return 'monday';
  }
}

/**
 * Saves week start preference.
 */
export function setWeekStartSetting(start) {
  try {
    localStorage.setItem(WEEK_START_KEY, start === 'sunday' ? 'sunday' : 'monday');
  } catch (e) {}
}

/**
 * Returns true if two date objects or YYYY-MM-DD strings represent the same calendar day.
 */
export function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  const s1 = typeof date1 === 'string' ? date1 : formatLocalDate(date1);
  const s2 = typeof date2 === 'string' ? date2 : formatLocalDate(date2);
  return s1 === s2;
}

/**
 * Returns relative human-readable label for a local date string (e.g. 'Today', 'Tomorrow', 'in 12 days', '3 days ago').
 */
export function getRelativeDateLabel(dateStr, todayStr = getTodayStr()) {
  if (!dateStr) return '';
  if (dateStr === todayStr) return 'Today';

  const d = parseLocalDate(dateStr);
  const today = parseLocalDate(todayStr);

  const diffMs = d.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  return '';
}

/**
 * Returns weekday headers based on week start preference.
 */
export function getWeekdayHeaders(weekStart = getWeekStartSetting()) {
  if (weekStart === 'sunday') {
    return [
      { key: 0, short: 'Sun', letter: 'S' },
      { key: 1, short: 'Mon', letter: 'M' },
      { key: 2, short: 'Tue', letter: 'T' },
      { key: 3, short: 'Wed', letter: 'W' },
      { key: 4, short: 'Thu', letter: 'T' },
      { key: 5, short: 'Fri', letter: 'F' },
      { key: 6, short: 'Sat', letter: 'S' },
    ];
  }
  return [
    { key: 1, short: 'Mon', letter: 'M' },
    { key: 2, short: 'Tue', letter: 'T' },
    { key: 3, short: 'Wed', letter: 'W' },
    { key: 4, short: 'Thu', letter: 'T' },
    { key: 5, short: 'Fri', letter: 'F' },
    { key: 6, short: 'Sat', letter: 'S' },
    { key: 0, short: 'Sun', letter: 'S' },
  ];
}

/**
 * Builds a robust 6x7 (42-cell) grid for a given year and month (1-12).
 * Strictly calculates local calendar dates to avoid UTC offset and DST shifts.
 */
export function getMonthGrid(year, month, weekStart = getWeekStartSetting()) {
  const todayStr = getTodayStr();

  // First day of current month (1-indexed month passed in, JS Date uses 0-indexed month)
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstDayOfWeek = firstOfMonth.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

  // Days in current month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Number of leading days from previous month
  let leadingDaysCount = 0;
  if (weekStart === 'monday') {
    // If first day is Monday (1), leading is 0. If Sunday (0), leading is 6.
    leadingDaysCount = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  } else {
    // If weekStart is Sunday, leading is firstDayOfWeek
    leadingDaysCount = firstDayOfWeek;
  }

  // Days in previous month
  const prevMonthDate = new Date(year, month - 1, 0);
  const daysInPrevMonth = prevMonthDate.getDate();
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth() + 1; // 1-12

  const cells = [];

  // 1. Leading days from previous month
  for (let i = leadingDaysCount - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateObj = new Date(prevYear, prevMonth - 1, dayNum);
    const dateStr = formatLocalDate(dateObj);
    cells.push({
      dateStr,
      year: prevYear,
      month: prevMonth,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isPrevMonth: true,
      isNextMonth: false,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      isFuture: dateStr > todayStr,
      dayOfWeek: dateObj.getDay(),
      isoDay: dateObj.getDay() === 0 ? 7 : dateObj.getDay(),
    });
  }

  // 2. Days of current month
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateObj = new Date(year, month - 1, dayNum);
    const dateStr = formatLocalDate(dateObj);
    cells.push({
      dateStr,
      year,
      month,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isPrevMonth: false,
      isNextMonth: false,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      isFuture: dateStr > todayStr,
      dayOfWeek: dateObj.getDay(),
      isoDay: dateObj.getDay() === 0 ? 7 : dateObj.getDay(),
    });
  }

  // 3. Trailing days from next month to fill exactly 42 cells (6 full weeks)
  const remainingCells = 42 - cells.length;
  const nextMonthDate = new Date(year, month, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth() + 1;

  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const dateObj = new Date(nextYear, nextMonth - 1, dayNum);
    const dateStr = formatLocalDate(dateObj);
    cells.push({
      dateStr,
      year: nextYear,
      month: nextMonth,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isPrevMonth: false,
      isNextMonth: true,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      isFuture: dateStr > todayStr,
      dayOfWeek: dateObj.getDay(),
      isoDay: dateObj.getDay() === 0 ? 7 : dateObj.getDay(),
    });
  }

  return {
    year,
    month,
    startDateStr: cells[0].dateStr,
    endDateStr: cells[cells.length - 1].dateStr,
    cells,
  };
}

/**
 * Returns month title e.g. "October 2026"
 */
export function formatMonthYearTitle(year, month) {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Returns formatted long date for selected day panel heading (e.g. "Monday, October 26, 2026").
 */
export function formatFullDayLabel(dateStr) {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Subscribes to midnight rollover to notify components when local day changes.
 */
export function subscribeToMidnightRollover(onRollover) {
  if (typeof window === 'undefined') return () => {};

  let timerId = null;

  function scheduleNextMidnight() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    timerId = setTimeout(() => {
      onRollover(getTodayStr());
      scheduleNextMidnight();
    }, Math.max(1000, msUntilMidnight));
  }

  scheduleNextMidnight();
  return () => {
    if (timerId) clearTimeout(timerId);
  };
}

/**
 * Returns array of 7 day objects for the week containing referenceDateStr.
 * Strictly respects user week start setting (Monday or Sunday).
 */
export function getWeekDays(referenceDateStr = getTodayStr(), weekStart = getWeekStartSetting()) {
  const ref = parseLocalDate(referenceDateStr);
  const currentDay = ref.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const todayStr = getTodayStr();

  let distanceToStart = 0;
  if (weekStart === 'monday') {
    distanceToStart = currentDay === 0 ? 6 : currentDay - 1;
  } else {
    distanceToStart = currentDay;
  }

  const startDate = new Date(ref);
  startDate.setDate(ref.getDate() - distanceToStart);

  const days = [];
  const weekdayNames = weekStart === 'sunday' 
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = formatLocalDate(d);

    days.push({
      dateStr,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      dayNumber: d.getDate(),
      shortLabel: weekdayNames[i],
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      isFuture: dateStr > todayStr,
      dayOfWeek: d.getDay(),
      isoDay: d.getDay() === 0 ? 7 : d.getDay(),
    });
  }

  return {
    startDateStr: days[0].dateStr,
    endDateStr: days[6].dateStr,
    days
  };
}

/**
 * Builds the full 12-month matrix for the "Year in pixels" view.
 */
export function getYearMatrix(year) {
  const todayStr = getTodayStr();
  const months = [];

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate();
    const days = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, m - 1, d);
      const dateStr = formatLocalDate(dateObj);

      days.push({
        dateStr,
        dayNumber: d,
        month: m,
        year,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        isFuture: dateStr > todayStr,
        dayOfWeek: dateObj.getDay(),
      });
    }

    months.push({
      monthNumber: m,
      monthName: monthNames[m - 1],
      daysInMonth,
      days
    });
  }

  return {
    year,
    months
  };
}

/**
 * Evaluates gentle daily capacity hints.
 * 0-2: calm, 3-5: balanced, 6+: heavy.
 * Never loud or scolding.
 */
export function getCapacityLevel(itemCount) {
  if (itemCount <= 2) {
    return {
      level: 'calm',
      label: 'Calm pace',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
      dotClass: 'bg-emerald-500',
      isHeavy: false,
    };
  }
  if (itemCount <= 5) {
    return {
      level: 'balanced',
      label: 'Balanced flow',
      badgeClass: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
      dotClass: 'bg-teal-500',
      isHeavy: false,
    };
  }
  return {
    level: 'heavy',
    label: 'Active day',
    hint: `${itemCount} items scheduled`,
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    dotClass: 'bg-amber-500',
    isHeavy: true,
  };
}

/**
 * Checks for fresh-start moments (e.g. Monday or start of month).
 */
export function getFreshStartInfo(todayStr = getTodayStr()) {
  const d = parseLocalDate(todayStr);
  const dayOfWeek = d.getDay(); // 1 = Monday
  const dayOfMonth = d.getDate(); // 1 = 1st of month
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const curMonthName = monthNames[d.getMonth()];

  const isMonday = dayOfWeek === 1;
  const isStartOfMonth = dayOfMonth <= 3;

  if (isStartOfMonth) {
    return {
      type: 'month',
      key: `fresh_start_month_${d.getFullYear()}_${d.getMonth() + 1}`,
      title: `Welcome to ${curMonthName}`,
      message: 'A clean slate for your month. Take a moment to align your intentions.',
    };
  }

  if (isMonday) {
    return {
      type: 'week',
      key: `fresh_start_week_${todayStr}`,
      title: 'New week, clear horizon',
      message: 'Design your week with calm focus. Remember: simple by default.',
    };
  }

  return null;
}

/**
 * Pure JS offline iCalendar (.ics) format builder.
 * Generates RFC 5545 compatible calendar data for export to Apple Calendar, Google Calendar, etc.
 */
export function generateICalendarData(items = [], calendarName = 'Your Space — Life Lens') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YourSpace//LifeLensCalendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName.replace(/,/g, '\\,')}`,
    'X-WR-TIMEZONE:UTC',
  ];

  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  items.forEach((item) => {
    // Only export events and tasks with due dates
    if (item.source !== 'events' && item.source !== 'checklists' && item.source !== 'wishlist') {
      return;
    }

    const cleanDate = (item.date || '').replace(/-/g, '');
    if (!cleanDate || cleanDate.length !== 8) return;

    const uid = `${item.id || item.key || Math.random().toString(36).substring(2)}@yourspace.local`;
    const summary = (item.title || 'Untitled').replace(/[\\;,]/g, match => '\\' + match);
    const description = (item.subtitle || '').replace(/[\\;,]/g, match => '\\' + match);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowStr}`);
    lines.push(`SUMMARY:${summary}`);

    if (item.source === 'events' && item.payload?.raw?.content?.startTime && !item.payload?.raw?.content?.isAllDay) {
      const timeClean = (item.payload.raw.content.startTime || '09:00').replace(':', '') + '00';
      lines.push(`DTSTART:${cleanDate}T${timeClean}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${cleanDate}`);
    }

    if (description) {
      lines.push(`DESCRIPTION:${description}`);
    }

    if (item.status === 'done') {
      lines.push('STATUS:COMPLETED');
    } else {
      lines.push('STATUS:CONFIRMED');
    }

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a browser download of an .ics file offline.
 */
export function downloadICalendarFile(filename, content) {
  try {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to trigger ics download:', err);
    return false;
  }
}

