import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  Sparkles, 
  Sun, 
  Sunset, 
  Moon, 
  Clock, 
  Flame,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useUIStore } from '../../store/uiStore';
import { db } from '../../lib/db';
import TodayHero from './TodayHero';
import RoutineCard from './RoutineCard';
import RoutineSheet from './RoutineSheet';
import { generateUUID } from '../../lib/uuid';
import { GridSkeleton } from '../shared/SkeletonLoader';
import { softDeleteItem, archiveItem } from '../../lib/services/trashService';
import { useConfirmStore } from '../../store/confirmStore';
import { 
  getTodayStr, 
  isScheduledOn, 
  isEntryComplete, 
  calculateScheduledStreak, 
  getWeekDaysMondayStart,
  ROUTINE_TEMPLATES 
} from '../../lib/routines/routineUtils';

export default function RoutinesView() {
  const { selectedNoteId, setSelectedNoteId, notesViewMode, toggleNotesViewMode } = useUIStore();
  const { openSoftDelete } = useConfirmStore();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'today' | 'done' | 'pending'
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [prefillTemplate, setPrefillTemplate] = useState(null);

  const todayStr = getTodayStr();

  // Fetch active routines
  const rawRoutines = useLiveQuery(() => 
    db.notes.where('workspace_id').equals('routines')
      .filter(n => !n.is_archived && !n.is_deleted)
      .reverse().sortBy('created_at')
  , []);
  const routines = rawRoutines || [];
  const isLoading = rawRoutines === undefined;

  // Fetch all routine entries
  const allEntries = useLiveQuery(() => db.routine_entries.toArray(), []) || [];

  // -------------------------------------------------------------
  // Calculations for TodayHero
  // -------------------------------------------------------------
  const { 
    scheduledTodayCount, 
    completedTodayCount, 
    bestOverallStreak, 
    weekCompletionRate 
  } = useMemo(() => {
    let scheduledToday = 0;
    let completedToday = 0;
    let maxStreak = 0;

    // Check routines scheduled today
    routines.forEach(routine => {
      const isSched = isScheduledOn(routine, todayStr);
      if (isSched) {
        scheduledToday++;
        const entry = allEntries.find(e => e.note_id === routine.id && e.entry_date === todayStr);
        if (isEntryComplete(entry, routine)) {
          completedToday++;
        }
      }

      const s = calculateScheduledStreak(routine.id, allEntries, routine);
      if (s > maxStreak) {
        maxStreak = s;
      }
    });

    // Compute weekly completion percentage
    const weekDays = getWeekDaysMondayStart(todayStr);
    let totalScheduledWeekSlots = 0;
    let totalDoneWeekSlots = 0;

    routines.forEach(routine => {
      weekDays.forEach(day => {
        if (isScheduledOn(routine, day.dateStr)) {
          totalScheduledWeekSlots++;
          const entry = allEntries.find(e => e.note_id === routine.id && e.entry_date === day.dateStr);
          if (isEntryComplete(entry, routine) || entry?.is_freeze) {
            totalDoneWeekSlots++;
          }
        }
      });
    });

    const rate = totalScheduledWeekSlots > 0 
      ? Math.round((totalDoneWeekSlots / totalScheduledWeekSlots) * 100) 
      : 0;

    return {
      scheduledTodayCount: scheduledToday,
      completedTodayCount: completedToday,
      bestOverallStreak: maxStreak,
      weekCompletionRate: rate
    };
  }, [routines, allEntries, todayStr]);

  // -------------------------------------------------------------
  // Filter & Search Evaluation
  // -------------------------------------------------------------
  const filteredRoutines = useMemo(() => {
    return routines.filter(routine => {
      const content = routine.content || {};
      const titleMatch = (routine.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      const whyMatch = (content.whyNote || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (searchQuery && !titleMatch && !whyMatch) {
        return false;
      }

      const isScheduledToday = isScheduledOn(routine, todayStr);
      const entry = allEntries.find(e => e.note_id === routine.id && e.entry_date === todayStr);
      const isDone = isEntryComplete(entry, routine);

      switch (activeFilter) {
        case 'today':
          return isScheduledToday;
        case 'done':
          return isScheduledToday && isDone;
        case 'pending':
          return isScheduledToday && !isDone;
        default:
          return true;
      }
    });
  }, [routines, allEntries, searchQuery, activeFilter, todayStr]);

  // Group routines by Time of Day
  const groupedSections = useMemo(() => {
    const sections = [
      { id: 'morning', label: 'Morning', icon: Sun, items: [] },
      { id: 'afternoon', label: 'Afternoon', icon: Sunset, items: [] },
      { id: 'evening', label: 'Evening', icon: Moon, items: [] },
      { id: 'anytime', label: 'Anytime', icon: Clock, items: [] },
    ];

    filteredRoutines.forEach(routine => {
      const time = routine.content?.timeOfDay || 'anytime';
      const targetSec = sections.find(s => s.id === time) || sections[3];
      targetSec.items.push(routine);
    });

    return sections.filter(s => s.items.length > 0);
  }, [filteredRoutines]);

  // -------------------------------------------------------------
  // Handlers for Routine Actions
  // -------------------------------------------------------------
  const handleToggleToday = async (routine, willBeDone) => {
    const existing = allEntries.find(e => e.note_id === routine.id && e.entry_date === todayStr);
    if (existing) {
      await db.routine_entries.update(existing.id, {
        is_completed: willBeDone,
        is_freeze: false // Unfreeze if toggled
      });
    } else {
      await db.routine_entries.add({
        id: generateUUID(),
        note_id: routine.id,
        period: 'daily',
        entry_date: todayStr,
        is_completed: willBeDone,
        is_freeze: false,
        streak_count: 1,
        habit_note: ''
      });
    }
  };

  const handleToggleDay = async (routine, dateStr, willBeDone) => {
    if (dateStr > todayStr) return; // Never allow future dates
    const existing = allEntries.find(e => e.note_id === routine.id && e.entry_date === dateStr);
    if (existing) {
      await db.routine_entries.update(existing.id, {
        is_completed: willBeDone,
        is_freeze: false
      });
    } else {
      await db.routine_entries.add({
        id: generateUUID(),
        note_id: routine.id,
        period: 'daily',
        entry_date: dateStr,
        is_completed: willBeDone,
        is_freeze: false,
        streak_count: 1,
        habit_note: ''
      });
    }
  };

  const handleFreezeToday = async (routine) => {
    const existing = allEntries.find(e => e.note_id === routine.id && e.entry_date === todayStr);
    if (existing) {
      const willFreeze = !existing.is_freeze;
      await db.routine_entries.update(existing.id, {
        is_freeze: willFreeze,
        is_completed: false
      });
    } else {
      await db.routine_entries.add({
        id: generateUUID(),
        note_id: routine.id,
        period: 'daily',
        entry_date: todayStr,
        is_completed: false,
        is_freeze: true,
        streak_count: 1,
        habit_note: ''
      });
    }
  };

  const handleDuplicate = async (routine) => {
    const newId = generateUUID();
    await db.notes.add({
      id: newId,
      user_id: 'local_user',
      workspace_id: 'routines',
      subproject_id: null,
      note_type: 'routine',
      title: `${routine.title} (Copy)`,
      color: routine.color || 'default',
      content: { ...(routine.content || {}) },
      is_pinned: false,
      is_archived: false,
      is_deleted: false,
      sort_order: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const handleArchive = async (routine) => {
    await archiveItem({
      id: routine.id,
      type: 'note',
      title: routine.title || 'Untitled routine',
      workspace: 'routines',
    });
    if (selectedNoteId === routine.id) setSelectedNoteId(null);
  };

  const handleDelete = (routine) => {
    openSoftDelete({
      title: routine.title || 'Untitled routine',
      onConfirm: async () => {
        await softDeleteItem({
          id: routine.id,
          type: 'note',
          title: routine.title || 'Untitled routine',
          workspace: 'routines',
        });
        if (selectedNoteId === routine.id) setSelectedNoteId(null);
      },
    });
  };

  const handleSaveRoutineSheet = async (routineData) => {
    if (editingRoutine) {
      await db.notes.update(editingRoutine.id, {
        title: routineData.title,
        color: routineData.color,
        content: {
          ...(editingRoutine.content || {}),
          ...(routineData.content || {}),
        },
        updated_at: new Date().toISOString()
      });
    } else {
      const newId = generateUUID();
      await db.notes.add({
        id: newId,
        user_id: 'local_user',
        workspace_id: 'routines',
        subproject_id: null,
        note_type: 'routine',
        title: routineData.title,
        color: routineData.color || 'sky',
        content: routineData.content,
        is_pinned: false,
        is_archived: false,
        is_deleted: false,
        sort_order: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setSelectedNoteId(newId);
    }
  };

  const openNewRoutineWithTemplate = (template) => {
    setPrefillTemplate(template);
    setEditingRoutine(null);
    setIsSheetOpen(true);
  };

  const openNewRoutineEmpty = () => {
    setPrefillTemplate(null);
    setEditingRoutine(null);
    setIsSheetOpen(true);
  };

  const openEditRoutine = (routine) => {
    setEditingRoutine(routine);
    setPrefillTemplate(null);
    setIsSheetOpen(true);
  };

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col min-h-full relative min-w-0 overflow-x-hidden space-y-6 pb-16">
      
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--workspace-accent)] inline-block animate-pulse"></span>
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--workspace-accent)]">
              Habits & Routines
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold text-text-primary tracking-tight leading-tight">
            Daily Habits
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Mindful consistency with zero guilt, built for sustainable momentum.
          </p>
        </div>

        {/* Top Action Buttons: Grid/List Toggle + New Routine */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <div className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={toggleNotesViewMode}
              title={notesViewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-colors"
            >
              {notesViewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="button"
            onClick={openNewRoutineEmpty}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow active:scale-95 transition-all"
            aria-label="Create new routine"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Routine</span>
          </button>
        </div>
      </div>

      {/* 2. Today Hero (Top of Page) */}
      <TodayHero
        completedCount={completedTodayCount}
        totalCount={scheduledTodayCount}
        bestStreak={bestOverallStreak}
        weekCompletionRate={weekCompletionRate}
        activeRoutinesCount={routines.length}
      />

      {/* 3. Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Habits', count: routines.length },
            { id: 'today', label: 'Today', count: scheduledTodayCount },
            { id: 'pending', label: 'Pending', count: Math.max(0, scheduledTodayCount - completedTodayCount) },
            { id: 'done', label: 'Done', count: completedTodayCount },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                activeFilter === f.id
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-black/5 dark:bg-white/5 text-text-muted hover:text-text-primary hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeFilter === f.id ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-text-secondary'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* In-page Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search routines..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all"
          />
        </div>
      </div>

      {/* 4. Routine Cards Content Area */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <GridSkeleton count={4} />
        ) : routines.length === 0 ? (
          /* 5. Friendly Empty State + 8 Starter Templates */
          <div className="rounded-3xl border border-dashed border-sky-500/30 dark:border-sky-500/20 bg-sky-50/30 dark:bg-sky-950/10 p-8 sm:p-12 text-center max-w-2xl mx-auto my-6">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-4 shadow-2xs">
              <Sparkles className="w-7 h-7" />
            </div>
            
            <h3 className="text-xl font-bold text-text-primary tracking-tight">
              Build your first routine
            </h3>
            
            <p className="text-xs text-text-muted mt-1.5 max-w-md mx-auto leading-relaxed">
              Start with a small, rewarding habit. Tap any template below to launch instantly, or design your own routine from scratch.
            </p>

            {/* Quick Template Chips */}
            <div className="mt-6">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">
                Quick-Start Templates
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-xl mx-auto">
                {ROUTINE_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.title}
                    type="button"
                    onClick={() => openNewRoutineWithTemplate(tpl)}
                    className="p-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-bg-primary hover:border-sky-500 hover:shadow-md transition-all text-left flex flex-col justify-between group active:scale-95"
                  >
                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform inline-block">
                      {tpl.icon}
                    </span>
                    <span className="text-xs font-bold text-text-primary line-clamp-1">
                      {tpl.title}
                    </span>
                    <span className="text-[10px] text-text-muted capitalize mt-0.5">
                      {tpl.timeOfDay}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={openNewRoutineEmpty}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Custom Routine</span>
            </button>
          </div>
        ) : filteredRoutines.length === 0 ? (
          /* Search / Filter Zero State */
          <div className="text-center py-16 text-text-muted">
            <Filter className="w-8 h-8 mx-auto opacity-30 mb-2" />
            <p className="text-sm font-semibold text-text-primary">No habits match your filter</p>
            <p className="text-xs text-text-muted mt-1">Try resetting the search or selecting "All Habits".</p>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
              className="mt-3 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Sticky Time-of-Day Sections with Responsive Grid */
          <div className="space-y-8">
            {groupedSections.map(section => {
              const SectionIcon = section.icon;
              return (
                <div key={section.id} className="space-y-3">
                  {/* Sticky Section Heading */}
                  <div className="sticky top-0 z-20 py-1.5 bg-bg-primary/95 backdrop-blur-xs flex items-center justify-between border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <SectionIcon className="w-4 h-4 text-sky-500" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        {section.label}
                      </h2>
                      <span className="text-[11px] font-semibold text-text-muted bg-black/5 dark:bg-white/5 px-2 py-0.2 rounded-full">
                        {section.items.length}
                      </span>
                    </div>
                  </div>

                  {/* Responsive Grid or List */}
                  <div className={
                    notesViewMode === 'list'
                      ? 'space-y-2.5'
                      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  }>
                    {section.items.map(routine => (
                      <RoutineCard
                        key={routine.id}
                        routine={routine}
                        entries={allEntries.filter(e => e.note_id === routine.id)}
                        onToggleToday={handleToggleToday}
                        onToggleDay={handleToggleDay}
                        onFreezeToday={handleFreezeToday}
                        onEdit={openEditRoutine}
                        onDuplicate={handleDuplicate}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        onClick={() => setSelectedNoteId(routine.id)}
                        isListView={notesViewMode === 'list'}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Routine Sheet Modal / Bottom Sheet */}
      <RoutineSheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setEditingRoutine(null);
          setPrefillTemplate(null);
        }}
        onSave={handleSaveRoutineSheet}
        routine={editingRoutine}
        prefill={prefillTemplate}
      />
    </div>
  );
}