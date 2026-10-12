import React from 'react';
import { 
  Sun, 
  Flame, 
  CheckCircle, 
  CheckCircle2, 
  Circle, 
  Clock, 
  BookOpen, 
  FileText, 
  Sparkles, 
  ArrowRight, 
  PenTool, 
  Repeat, 
  Calendar,
  Gift,
  Smile,
  Plus
} from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useUIStore } from '../../store/uiStore';
import { db } from '../../lib/db';
import { 
  getTasksDueToday, 
  getRoutinesStatusForToday, 
  getRecentNotes,
  getMonthlyWishes,
  getStreakSummary,
  getTodayJournalInfo
} from '../../lib/queries/todayDashboard';
import { generateUUID } from '../../lib/uuid';
import { WidgetSkeleton } from '../shared/SkeletonLoader';

export default function TodayDashboard() {
  const { setSelectedNoteId, setActiveWorkspace } = useUIStore();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  // Queries
  const dueTasks = useLiveQuery(() => getTasksDueToday(), []) || [];
  const routineStatus = useLiveQuery(() => getRoutinesStatusForToday(), []) || {
    total: 0,
    completedCount: 0,
    pending: [],
    completed: []
  };
  const recentNotes = useLiveQuery(() => getRecentNotes(3), []) || [];
  const monthlyWishes = useLiveQuery(() => getMonthlyWishes(), []) || [];
  const streakInfo = useLiveQuery(() => getStreakSummary(), []) || {
    routineStreak: 0,
    journalStreak: 0,
    totalStreak: 0,
    wroteToday: false
  };
  const journalInfo = useLiveQuery(() => getTodayJournalInfo(), []) || {
    prompt: "What made you smile today?",
    hasEntry: false,
    entry: null
  };

  // 1. Toggle task completion
  const handleToggleTask = async (e, task) => {
    e.stopPropagation();
    await db.checklist_items.update(task.id, {
      is_completed: 1
    });
  };

  // 2. Tap to complete / uncomplete routine
  const handleToggleRoutine = async (e, routine, isDone) => {
    e.stopPropagation();
    try {
      const allEntries = await db.routine_entries.toArray().catch(() => []);
      const existing = allEntries.find(entry => entry.note_id === routine.id && entry.entry_date === todayStr);

      if (existing) {
        await db.routine_entries.update(existing.id, { is_completed: !isDone });
      } else {
        await db.routine_entries.add({
          id: generateUUID(),
          note_id: routine.id,
          entry_date: todayStr,
          is_completed: true,
          streak_count: 1,
          habit_note: ''
        });
      }
    } catch (err) {
      console.error('Failed to toggle routine:', err);
    }
  };

  // 3. Open or create today's journal entry
  const handleWriteJournal = async () => {
    try {
      if (journalInfo.entry) {
        setActiveWorkspace('journal');
        setSelectedNoteId(journalInfo.entry.id);
        return;
      }

      // Check if entry was just added
      const existing = await db.notes
        .where('workspace_id')
        .equals('journal')
        .filter(n => !n.is_archived && !n.is_deleted && n.entry_date === todayStr)
        .first();

      if (existing) {
        setActiveWorkspace('journal');
        setSelectedNoteId(existing.id);
        return;
      }

      const now = new Date().toISOString();
      const newId = generateUUID();
      await db.notes.add({
        id: newId,
        user_id: 'local_user',
        workspace_id: 'journal',
        subproject_id: null,
        note_type: 'journal',
        title: '',
        content: '',
        mood: null,
        entry_date: todayStr,
        is_pinned: false,
        is_archived: false,
        is_deleted: false,
        sort_order: Date.now(),
        created_at: now,
        updated_at: now,
      });

      setActiveWorkspace('journal');
      setSelectedNoteId(newId);
    } catch (err) {
      console.error('Failed to open journal entry:', err);
    }
  };

  // 4. Open Note
  const handleOpenNote = (note) => {
    setActiveWorkspace(note.workspace_id);
    setSelectedNoteId(note.id);
  };

  const routinePercent = routineStatus.total > 0
    ? Math.round((routineStatus.completedCount / routineStatus.total) * 100)
    : 0;

  return (
    <div className="flex-1 min-w-0 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-bg-primary text-text-primary no-scrollbar">
      {/* Top Welcome Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span className="text-xs font-semibold tracking-wider uppercase text-amber-500">
              {formattedDate}
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-text-primary leading-tight">
            {getGreeting()}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Here is your live focus summary for today.
          </p>
        </div>

        {/* Global Streak Banner */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-xs shrink-0">
          <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
          <div className="text-xs">
            <span className="font-bold">{streakInfo.totalStreak} day streak</span>
            <span className="text-[10px] text-text-muted block">
              {streakInfo.wroteToday ? 'Daily record active ✓' : 'Keep momentum going!'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: 6 Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* CARD 1: TODAY'S ROUTINES (Tap to complete) */}
        <div className="bg-card-default border border-black/5 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center">
                  <Repeat className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Today's Routines
                </h2>
              </div>
              <span className="text-[10px] font-mono text-text-muted font-medium">
                {routineStatus.completedCount}/{routineStatus.total} ({routinePercent}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${routinePercent}%` }}
              />
            </div>

            {/* Routines List */}
            {routineStatus.total === 0 ? (
              <div className="py-6 text-center text-text-muted">
                <Smile className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-blue-500" />
                <p className="text-xs font-medium">No habits scheduled yet</p>
                <p className="text-[10px] mt-0.5">Build daily momentum in Routines</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Pending */}
                {routineStatus.pending.map(routine => (
                  <div
                    key={routine.id}
                    onClick={() => {
                      setActiveWorkspace('routines');
                      setSelectedNoteId(routine.id);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <span className="text-xs text-text-primary truncate font-medium">
                      {routine.title || 'Untitled Routine'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleToggleRoutine(e, routine, false)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all shrink-0"
                    >
                      Done
                    </button>
                  </div>
                ))}

                {/* Completed */}
                {routineStatus.completed.map(routine => (
                  <div
                    key={routine.id}
                    onClick={() => {
                      setActiveWorkspace('routines');
                      setSelectedNoteId(routine.id);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 cursor-pointer"
                  >
                    <span className="text-xs text-text-muted line-through truncate font-medium">
                      {routine.title}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleToggleRoutine(e, routine, true)}
                      className="text-emerald-500 hover:opacity-75 transition-opacity"
                      title="Completed (tap to undo)"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveWorkspace('routines')}
            className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] font-medium text-text-muted hover:text-blue-500 transition-colors"
          >
            <span>Open Routines</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* CARD 2: UNCHECKED CHECKLIST ITEMS DUE TODAY */}
        <div className="bg-card-default border border-black/5 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Tasks Due Today
                </h2>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                {dueTasks.length} pending
              </span>
            </div>

            {dueTasks.length === 0 ? (
              <div className="py-6 text-center text-text-muted">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-emerald-500" />
                <p className="text-xs font-medium">All tasks cleared</p>
                <p className="text-[10px] mt-0.5">Nothing due today. Enjoy the calm!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {dueTasks.slice(0, 5).map(task => (
                  <div
                    key={task.id}
                    onClick={() => {
                      setActiveWorkspace('checklists');
                      setSelectedNoteId(task.note_id);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleTask(e, task)}
                        className="text-text-muted hover:text-emerald-500 transition-colors shrink-0"
                        title="Mark complete"
                      >
                        <Circle className="w-4 h-4 opacity-50 hover:opacity-100" />
                      </button>
                      <span className="text-xs text-text-primary truncate">
                        {task.text || 'Untitled task'}
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted shrink-0 truncate max-w-[80px]">
                      {task.checklistTitle}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveWorkspace('checklists')}
            className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] font-medium text-text-muted hover:text-emerald-500 transition-colors"
          >
            <span>Open Checklists</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* CARD 3: JOURNAL PROMPT WITH "WRITE" BUTTON */}
        <div className="bg-card-default border border-black/5 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Daily Prompt
                </h2>
              </div>
              <span className="text-[10px] font-mono text-indigo-500 font-medium">
                {journalInfo.hasEntry ? 'Entry Saved ✓' : 'Daily reflection'}
              </span>
            </div>

            {/* Prompt Quote Box */}
            <div className="p-3 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 mb-3">
              <p className="text-xs italic text-text-primary leading-relaxed">
                "{journalInfo.prompt}"
              </p>
            </div>

            <p className="text-[11px] text-text-muted">
              {journalInfo.hasEntry
                ? "You've recorded an entry for today. Keep journaling daily to grow your streak."
                : "Take 2 minutes to pause, reflect, and capture your day."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleWriteJournal}
            className="mt-3 py-2 px-3 rounded-xl bg-indigo-500 text-white font-semibold text-xs hover:bg-indigo-600 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>{journalInfo.hasEntry ? 'Continue Writing' : 'Write Entry'}</span>
          </button>
        </div>

        {/* CARD 4: 3 RECENT NOTES */}
        <div className="bg-card-default border border-black/5 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Recent Notes
                </h2>
              </div>
              <span className="text-[10px] text-text-muted">Last 3 edited</span>
            </div>

            {recentNotes.length === 0 ? (
              <div className="py-6 text-center text-text-muted">
                <FileText className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-amber-500" />
                <p className="text-xs font-medium">No notes created yet</p>
                <p className="text-[10px] mt-0.5">Quick Notes and Projects appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentNotes.map(note => (
                  <div
                    key={note.id}
                    onClick={() => handleOpenNote(note)}
                    className="p-2.5 rounded-xl border border-black/5 dark:border-white/5 hover:border-amber-500/30 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer group"
                  >
                    <div className="font-semibold text-xs text-text-primary truncate group-hover:text-amber-500 transition-colors">
                      {note.title || 'Untitled Note'}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted">
                      <span className="capitalize font-medium">
                        {note.workspace_id}
                      </span>
                      <span>
                        {note.updated_at ? new Date(note.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveWorkspace('quicknotes')}
            className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] font-medium text-text-muted hover:text-amber-500 transition-colors"
          >
            <span>View All Notes</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* CARD 5: WISHLIST MILESTONES THIS MONTH */}
        <div className="bg-card-default border border-black/5 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-500 flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Target This Month
                </h2>
              </div>
              <span className="text-[10px] font-mono text-violet-500 font-semibold">
                {monthlyWishes.length} wishes
              </span>
            </div>

            {monthlyWishes.length === 0 ? (
              <div className="py-6 text-center text-text-muted">
                <Gift className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-violet-500" />
                <p className="text-xs font-medium">No target wishes this month</p>
                <p className="text-[10px] mt-0.5">Plan target dates in your Wish List</p>
              </div>
            ) : (
              <div className="space-y-2">
                {monthlyWishes.slice(0, 4).map(wish => (
                  <div
                    key={wish.id}
                    onClick={() => {
                      setActiveWorkspace('wishlist');
                      setSelectedNoteId(wish.id);
                    }}
                    className="p-2.5 rounded-xl border border-black/5 dark:border-white/5 hover:border-violet-500/30 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-text-primary truncate">
                        {wish.title || 'Untitled Wish'}
                      </div>
                      <div className="text-[10px] text-text-muted flex items-center gap-1.5 mt-0.5">
                        {wish.category && <span className="text-violet-500">{wish.category}</span>}
                        <span>•</span>
                        <span>Due {new Date(wish.target_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    {wish.estimated_price && (
                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400 shrink-0">
                        ₹{wish.estimated_price}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveWorkspace('wishlist')}
            className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] font-medium text-text-muted hover:text-violet-500 transition-colors"
          >
            <span>Open Wish List</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* CARD 6: STREAK SUMMARY & DAILY FOCUS */}
        <div className="bg-card-default border border-black/5 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center">
                  <Flame className="w-4 h-4 fill-rose-500" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Streak Summary
                </h2>
              </div>
              <span className="text-[10px] font-mono text-rose-500 font-semibold">
                Habit Pulse
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 text-center">
                <div className="text-2xl font-extrabold text-text-primary font-mono">
                  {streakInfo.routineStreak}
                </div>
                <div className="text-[10px] text-text-muted uppercase font-semibold mt-0.5">
                  Habit Streak
                </div>
              </div>
              <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 text-center">
                <div className="text-2xl font-extrabold text-text-primary font-mono">
                  {streakInfo.journalStreak}
                </div>
                <div className="text-[10px] text-text-muted uppercase font-semibold mt-0.5">
                  Journal Streak
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 text-[11px] text-text-secondary">
              Consistency compounds. Complete your daily routines and write one reflection every day.
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] font-medium text-text-muted">
            <span>Overall: {streakInfo.totalStreak} days</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
