import React from 'react';
import { Sun, CheckCircle, Clock, FileText, CheckCircle2, Circle, ArrowRight, Repeat } from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useUIStore } from '../../store/uiStore';
import { db } from '../../lib/db';
import { getTasksDueToday, getRoutinesStatusForToday, getRecentNotes } from '../../lib/queries/todayDashboard';

export default function TodayDashboard() {
  const { setSelectedNoteId, setActiveWorkspace } = useUIStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Fetch tasks due today from Dexie
  const dueTasks = useLiveQuery(() => getTasksDueToday(), []) || [];

  // 2. Fetch routines status for today from Dexie
  const routineStatus = useLiveQuery(() => getRoutinesStatusForToday(), []) || {
    total: 0,
    completedCount: 0,
    pending: [],
    completed: []
  };

  // 3. Most recently edited notes
  const recentNotes = useLiveQuery(() => getRecentNotes(4), []) || [];

  const handleOpenNote = (note) => {
    setActiveWorkspace(note.workspace_id);
    setSelectedNoteId(note.id);
  };

  const handleToggleTask = async (e, task) => {
    e.stopPropagation();
    await db.checklist_items.update(task.id, {
      is_completed: 1,
    });
  };

  const handleCompleteRoutine = async (e, routine) => {
    e.stopPropagation();
    const existing = await db.routine_entries
      .where('note_id')
      .equals(routine.id)
      .filter(entry => entry.entry_date === todayStr)
      .first();

    if (existing) {
      await db.routine_entries.update(existing.id, { is_completed: true });
    } else {
      await db.routine_entries.add({
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        note_id: routine.id,
        entry_date: todayStr,
        is_completed: true,
        streak_count: 1,
        habit_note: ''
      });
    }
  };

  const routinePercent = routineStatus.total > 0
    ? Math.round((routineStatus.completedCount / routineStatus.total) * 100)
    : 0;

  const hasContent = dueTasks.length > 0 || routineStatus.total > 0 || recentNotes.length > 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 bg-bg-primary text-text-primary">
      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-bold mb-1 tracking-tight">{getGreeting()}</h1>
        <p className="text-xs text-text-muted">Here is your live daily overview.</p>
      </div>

      {!hasContent ? (
        <div className="flex flex-col items-center justify-center flex-1 text-text-muted opacity-60">
          <Sun className="w-12 h-12 mb-4" />
          <p className="text-sm font-medium">Your day is clear. Enjoy the calm.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tasks Due Today */}
          {dueTasks.length > 0 && (
            <div className="bg-card-default border border-black/5 dark:border-white/10 rounded-card p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 text-text-primary">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <h2 className="font-semibold text-xs uppercase tracking-wider">Tasks Due Today</h2>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                  {dueTasks.length} pending
                </span>
              </div>
              <div className="space-y-2">
                {dueTasks.slice(0, 5).map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => {
                      setActiveWorkspace('checklists');
                      setSelectedNoteId(task.note_id);
                    }}
                    className="group flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={(e) => handleToggleTask(e, task)}
                        className="text-text-muted hover:text-emerald-500 transition-colors shrink-0"
                        title="Mark task complete"
                      >
                        <Circle className="w-4 h-4 opacity-50 hover:opacity-100" />
                      </button>
                      <span className="text-xs text-text-primary truncate">
                        {task.text || 'Untitled task'}
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted shrink-0 opacity-70 group-hover:opacity-100 truncate max-w-[100px]">
                      {task.checklistTitle}
                    </span>
                  </div>
                ))}
                {dueTasks.length > 5 && (
                  <div className="text-[11px] text-text-muted italic px-2 pt-1">
                    + {dueTasks.length - 5} more due today
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Routines Summary */}
          {routineStatus.total > 0 && (
            <div className="bg-card-default border border-black/5 dark:border-white/10 rounded-card p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2 text-text-primary">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <h2 className="font-semibold text-xs uppercase tracking-wider">Today's Routines</h2>
                </div>
                <span className="text-[10px] font-mono text-text-muted font-medium">
                  {routineStatus.completedCount}/{routineStatus.total} ({routinePercent}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mb-3">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                  style={{ width: `${routinePercent}%` }} 
                />
              </div>

              {routineStatus.pending.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-text-muted mb-1">To Complete:</div>
                  {routineStatus.pending.slice(0, 4).map(routine => (
                    <div
                      key={routine.id}
                      onClick={() => {
                        setActiveWorkspace('routines');
                        setSelectedNoteId(routine.id);
                      }}
                      className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer group"
                    >
                      <span className="text-xs text-text-primary truncate font-medium">
                        {routine.title}
                      </span>
                      <button
                        onClick={(e) => handleCompleteRoutine(e, routine)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all shrink-0"
                      >
                        Done
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> All routines completed for today!
                </p>
              )}
            </div>
          )}

          {/* Recent Notes */}
          {recentNotes.length > 0 && (
            <div>
              <h2 className="font-semibold text-xs mb-3 flex items-center gap-2 text-text-muted uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" /> Recently Edited
              </h2>
              <div className="space-y-2">
                {recentNotes.map(note => (
                  <div 
                    key={note.id}
                    onClick={() => handleOpenNote(note)}
                    className="p-3 bg-card-default border border-black/5 dark:border-white/5 rounded-card cursor-pointer hover:scale-[1.01] hover:shadow-md dark:hover:shadow-black/30 transition-all duration-150"
                  >
                    <div className="font-medium text-xs text-text-primary line-clamp-1">{note.title || 'Untitled Note'}</div>
                    <div className="text-[10px] text-text-muted mt-1.5 flex items-center justify-between">
                      <span className="capitalize px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 font-medium">
                        {note.workspace_id}
                      </span>
                      <span>
                        {note.updated_at ? new Date(note.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
