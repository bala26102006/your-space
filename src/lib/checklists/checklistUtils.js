import { db } from '../db';
import { generateUUID } from '../uuid';

// -----------------------------------------------------------------
// 1. Local Date & Time Helpers (Zero UTC Shifts)
// -----------------------------------------------------------------
export function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLocalDateTime(date = new Date()) {
  const dStr = formatLocalDate(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${dStr} ${hours}:${minutes}:${seconds}`;
}

export function getTodayStr() {
  return formatLocalDate(new Date());
}

export function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Returns Monday to Sunday dates for the week containing referenceDateStr.
 */
export function getWeekDaysMondayStart(referenceDateStr = getTodayStr()) {
  const ref = parseLocalDate(referenceDateStr);
  const currentDay = ref.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;

  const monday = new Date(ref);
  monday.setDate(ref.getDate() - distanceToMonday);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(formatLocalDate(d));
  }
  return {
    mondayStr: days[0],
    sundayStr: days[6],
    days
  };
}

// -----------------------------------------------------------------
// 2. Shared Completion Helper (Boolean & 1/0 + completedAt)
// -----------------------------------------------------------------
export function isItemCompleted(item) {
  if (!item) return false;
  return item.is_completed === true || item.is_completed === 1;
}

export async function toggleChecklistItemCompletion(itemId, willBeDone) {
  if (!itemId) return;
  const updateData = {
    is_completed: willBeDone ? 1 : 0,
    completedAt: willBeDone ? formatLocalDateTime() : null
  };
  await db.checklist_items.update(itemId, updateData);
  return updateData;
}

// -----------------------------------------------------------------
// 3. Due Date Resolution & Badges
// -----------------------------------------------------------------
export function getDueDateStatus(dueDateStr, todayStr = getTodayStr()) {
  if (!dueDateStr) return null;

  const today = parseLocalDate(todayStr);
  const due = parseLocalDate(dueDateStr);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: 'Overdue',
      status: 'overdue',
      colorClass: 'text-red-600 bg-red-500/10 border-red-500/20 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800/30'
    };
  }
  if (diffDays === 0) {
    return {
      label: 'Today',
      status: 'today',
      colorClass: 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800/30'
    };
  }
  if (diffDays === 1) {
    return {
      label: 'Tomorrow',
      status: 'tomorrow',
      colorClass: 'text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800/30'
    };
  }
  if (diffDays <= 3) {
    return {
      label: `In ${diffDays} days`,
      status: 'soon',
      colorClass: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800/30'
    };
  }

  // Formatted date (e.g. Oct 24)
  const formatted = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return {
    label: formatted,
    status: 'future',
    colorClass: 'text-text-muted bg-black/5 border-black/5 dark:bg-white/5 dark:border-white/5'
  };
}

// -----------------------------------------------------------------
// 4. Folder Metadata in LocalStorage (Safe & Non-Destructive)
// -----------------------------------------------------------------
const FOLDER_META_PREFIX = 'your_space_checklist_folder_';
const EMPTY_FOLDERS_KEY = 'your_space_checklist_empty_folders';

export function getFolderMeta(folderName) {
  if (!folderName) return { color: 'emerald', icon: 'Folder' };
  try {
    const raw = localStorage.getItem(`${FOLDER_META_PREFIX}${folderName}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {}
  return { color: 'emerald', icon: 'Folder' };
}

export function setFolderMeta(folderName, meta) {
  if (!folderName) return;
  try {
    const existing = getFolderMeta(folderName);
    localStorage.setItem(
      `${FOLDER_META_PREFIX}${folderName}`,
      JSON.stringify({ ...existing, ...meta })
    );
  } catch (err) {}
}

export function renameFolderMeta(oldName, newName) {
  if (!oldName || !newName || oldName === newName) return;
  try {
    const meta = getFolderMeta(oldName);
    localStorage.removeItem(`${FOLDER_META_PREFIX}${oldName}`);
    localStorage.setItem(`${FOLDER_META_PREFIX}${newName}`, JSON.stringify(meta));

    // Also update in empty folders registry if present
    const emptyList = getKnownEmptyFolders();
    const updatedEmpty = emptyList.map(f => f === oldName ? newName : f);
    localStorage.setItem(EMPTY_FOLDERS_KEY, JSON.stringify(updatedEmpty));
  } catch (err) {}
}

export function getKnownEmptyFolders() {
  try {
    const raw = localStorage.getItem(EMPTY_FOLDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function addKnownEmptyFolder(folderName) {
  if (!folderName) return;
  try {
    const list = getKnownEmptyFolders();
    if (!list.includes(folderName)) {
      list.push(folderName);
      localStorage.setItem(EMPTY_FOLDERS_KEY, JSON.stringify(list));
    }
  } catch (err) {}
}

export function removeKnownEmptyFolder(folderName) {
  if (!folderName) return;
  try {
    const list = getKnownEmptyFolders().filter(f => f !== folderName);
    localStorage.setItem(EMPTY_FOLDERS_KEY, JSON.stringify(list));
    localStorage.removeItem(`${FOLDER_META_PREFIX}${folderName}`);
  } catch (err) {}
}

// -----------------------------------------------------------------
// 5. Folder Renaming Transaction
// -----------------------------------------------------------------
export async function renameFolderAcrossChecklists(oldName, newName) {
  if (!oldName || !newName || oldName.trim() === newName.trim()) return;
  const cleanNew = newName.trim();

  await db.transaction('rw', db.notes, async () => {
    const matching = await db.notes
      .where('workspace_id')
      .equals('checklists')
      .filter(n => n.category === oldName)
      .toArray();

    for (const note of matching) {
      await db.notes.update(note.id, {
        category: cleanNew,
        updated_at: new Date().toISOString()
      });
    }
  });

  renameFolderMeta(oldName, cleanNew);
}

// -----------------------------------------------------------------
// 6. Template & Duplication Helpers (Full Sub-item Parent ID Remap)
// -----------------------------------------------------------------
export async function duplicateChecklist(noteId, targetCategory = null) {
  const sourceNote = await db.notes.get(noteId);
  if (!sourceNote) return null;

  const newNoteId = generateUUID();
  const newNote = {
    ...sourceNote,
    id: newNoteId,
    title: `${sourceNote.title || 'Untitled'} (Copy)`,
    category: targetCategory !== null ? targetCategory : sourceNote.category || 'Uncategorized',
    is_pinned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content: {
      ...(sourceNote.content || {}),
      isTemplate: false,
      isStarterKit: false
    }
  };

  await db.notes.add(newNote);

  // Copy items & sub-items with parent_item_id remapping
  const items = await db.checklist_items.where('note_id').equals(noteId).toArray();
  if (items.length > 0) {
    const idMap = new Map();
    items.forEach(item => {
      idMap.set(item.id, generateUUID());
    });

    const newItems = items.map(item => ({
      ...item,
      id: idMap.get(item.id),
      note_id: newNoteId,
      parent_item_id: item.parent_item_id ? (idMap.get(item.parent_item_id) || null) : null,
      is_completed: 0,
      completedAt: null
    }));

    await db.checklist_items.bulkAdd(newItems);
  }

  return newNoteId;
}

export async function createChecklistFromTemplate(template, targetCategory = 'Uncategorized') {
  const newNoteId = generateUUID();
  const cleanTitle = template.title.replace(/^[^\w\s]+/, '').trim();

  const newNote = {
    id: newNoteId,
    user_id: 'local_user',
    workspace_id: 'checklists',
    subproject_id: null,
    note_type: 'plain',
    title: cleanTitle,
    category: targetCategory || 'Uncategorized',
    content: {
      isTemplate: false,
      isStarterKit: false,
      sourceTemplateId: template.id,
      icon: template.icon || 'CheckSquare'
    },
    color: 'default',
    is_pinned: false,
    is_archived: false,
    is_deleted: false,
    sort_order: Date.now(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db.notes.add(newNote);

  const itemsToAdd = (template.items || []).map((text, i) => ({
    id: generateUUID(),
    note_id: newNoteId,
    text,
    is_completed: 0,
    completedAt: null,
    due_date: null,
    parent_item_id: null,
    sort_order: i * 10,
    item_type: 'task'
  }));

  if (itemsToAdd.length > 0) {
    await db.checklist_items.bulkAdd(itemsToAdd);
  }

  return newNoteId;
}

// -----------------------------------------------------------------
// 7. Up Next Aggregator & Weekly Progress Calculation
// -----------------------------------------------------------------
export function getUpNextItems(activeNotes, itemsByNoteId, limit = 3) {
  const todayStr = getTodayStr();
  const noteMap = new Map(activeNotes.map(n => [n.id, n]));
  const candidates = [];

  activeNotes.forEach(note => {
    // Only real checklists (not templates, not starter kits, not archived/deleted)
    if (note.content?.isTemplate || note.content?.isStarterKit) return;
    const items = itemsByNoteId.get(note.id) || [];

    items.forEach(item => {
      // Only root open tasks
      if (item.parent_item_id) return;
      if (item.item_type && item.item_type !== 'task') return;
      if (isItemCompleted(item)) return;

      candidates.push({
        ...item,
        checklistTitle: note.title || 'Untitled Checklist',
        checklistColor: note.color || 'default',
        isPinned: Boolean(note.is_pinned),
        effectiveDueDate: item.due_date || note.content?.dueDate || null
      });
    });
  });

  // Sort: (1) Due date (overdue & today first), (2) Pinned checklist, (3) Sort order / creation
  candidates.sort((a, b) => {
    if (a.effectiveDueDate && b.effectiveDueDate) {
      if (a.effectiveDueDate !== b.effectiveDueDate) {
        return a.effectiveDueDate.localeCompare(b.effectiveDueDate);
      }
    } else if (a.effectiveDueDate && !b.effectiveDueDate) {
      return -1; // Due date items come first
    } else if (!a.effectiveDueDate && b.effectiveDueDate) {
      return 1;
    }

    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  return candidates.slice(0, limit);
}

export function calculateWeeklyProgress(activeNotes, itemsByNoteId) {
  const { mondayStr, sundayStr } = getWeekDaysMondayStart();
  const mondayStart = `${mondayStr} 00:00:00`;
  const sundayEnd = `${sundayStr} 23:59:59`;

  let completedThisWeek = 0;
  let totalTasks = 0;

  activeNotes.forEach(note => {
    if (note.content?.isTemplate || note.content?.isStarterKit) return;
    const items = itemsByNoteId.get(note.id) || [];

    items.forEach(item => {
      if (item.item_type && item.item_type !== 'task') return;
      totalTasks++;

      // Strict rule: Items completed before this feature have no completedAt and must NOT be counted
      if (item.completedAt && item.completedAt >= mondayStart && item.completedAt <= sundayEnd) {
        completedThisWeek++;
      }
    });
  });

  return {
    completedThisWeek,
    totalTasks,
    percent: totalTasks > 0 ? Math.round((completedThisWeek / totalTasks) * 100) : 0
  };
}

// -----------------------------------------------------------------
// 8. Enhanced Built-In Template Gallery Definitions
// -----------------------------------------------------------------
export const ENHANCED_TEMPLATES = [
  {
    id: 'starter-kit-travel',
    category: 'Travel',
    title: '✈️ Travel & Packing',
    icon: 'Plane',
    description: 'Essential gear, chargers, travel documents and toiletries.',
    items: ['Passport & Travel Visas', 'Phone & Laptop Chargers', 'Power Adapter', 'Toiletries & Medication', 'Comfortable Walking Shoes', 'Copies of Itinerary']
  },
  {
    id: 'starter-kit-shopping',
    category: 'Shopping',
    title: '🛒 Weekly Groceries',
    icon: 'ShoppingBag',
    description: 'Pantry staples, fresh produce, and household essentials.',
    items: ['Fresh Vegetables & Greens', 'Fresh Fruits', 'Milk / Plant-based Alternative', 'Eggs & Protein', 'Olive Oil & Condiments', 'Dish Soap & Paper Towels']
  },
  {
    id: 'starter-kit-home',
    category: 'Home',
    title: '🏠 Home & Life Admin',
    icon: 'Home',
    description: 'Monthly utility bills, chores, and maintenance checkpoints.',
    items: ['Pay Electricity & Internet Bills', 'Filter Air Purifier & Clean AC', 'Car Oil & Tire Pressure Check', 'Backup Laptop & Phone to Cloud', 'Deep Clean Kitchen Countertops']
  },
  {
    id: 'starter-kit-work',
    category: 'Work',
    title: '💼 Work & Project Launch',
    icon: 'Briefcase',
    description: 'Key deliverables, QA checks, meeting preparation and handoff.',
    items: ['Define Clear Goals & Success Metrics', 'Schedule Kickoff Meeting', 'Draft Architecture & Technical Docs', 'Complete Code Review & Tests', 'Deploy to Staging Environment', 'Send Stakeholder Summary']
  },
  {
    id: 'starter-kit-goals',
    category: 'Goals',
    title: '🎯 Quarter Focus Goals',
    icon: 'Target',
    description: 'Major personal milestones and learning objectives.',
    items: ['Finish Reading 3 Books', 'Complete Online Certification', 'Run 5km Without Stopping', 'Automate Monthly Savings Transfer']
  },
  {
    id: 'starter-kit-events',
    category: 'Events',
    title: '🎉 Event & Party Host',
    icon: 'PartyPopper',
    description: 'Invitations, catering, playlist, and party decor.',
    items: ['Finalize Guest List & Invitations', 'Plan Food Menu & Drinks', 'Order Ice & Tableware', 'Curate Background Music Playlist', 'Set Up Welcome Entrance']
  },
  {
    id: 'starter-kit-health',
    category: 'Health',
    title: '💪 Gym Bag & Fitness Prep',
    icon: 'HeartPulse',
    description: 'Workout gear, water bottle, straps, and post-workout recovery.',
    items: ['Gym Shoes & Clean Socks', 'Reusable Water Bottle', 'Lifting Straps / Gloves', 'Post-workout Protein Snack', 'Microfiber Sweat Towel']
  }
];
