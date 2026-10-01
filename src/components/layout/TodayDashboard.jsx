import React from 'react';
import { Sun, CheckCircle, Clock, FileText } from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useUIStore } from '../../store/uiStore';
import { getTasksDueToday, getRoutinesForToday, getRecentNotes } from '../../lib/queries/todayDashboard';

export default function TodayDashboard() {
  const { setSelectedNoteId, setActiveWorkspace } = useUIStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Fetch tasks due today
  const dueTasks = useLiveQuery(() => getTasksDueToday(), []) || [];

  // 2. Fetch routines for today
  const routinesDone = useLiveQuery(() => getRoutinesForToday(), []) || [];

  // 3. 3 most recently edited notes
  const recentNotes = useLiveQuery(() => getRecentNotes(3), []) || [];

  const handleOpenNote = (note) => {
    setActiveWorkspace(note.workspace_id);
    setSelectedNoteId(note.id);
  };

  const hasContent = dueTasks.length > 0 || routinesDone.length > 0 || recentNotes.length > 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 bg-bg-primary text-text-primary">
      <div className="mb-8 mt-4">
        <h1 className="text-2xl font-bold mb-1">{getGreeting()}</h1>
        <p className="text-sm text-text-muted">Here is an overview of your day.</p>
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
            <div className="bg-card-default border border-black/5 dark:border-white/10 rounded-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-text-primary">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <h2 className="font-semibold text-sm">Tasks Due Today</h2>
                <span className="ml-auto text-xs font-medium bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full">{dueTasks.length} pending</span>
              </div>
              <div className="space-y-2">
                {dueTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="text-xs text-text-muted flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                    <span className="line-clamp-1">{task.text || 'Untitled task'}</span>
                  </div>
                ))}
                {dueTasks.length > 5 && (
                  <div className="text-xs text-text-muted italic ml-3.5">+ {dueTasks.length - 5} more</div>
                )}
              </div>
            </div>
          )}

          {/* Routines Summary */}
          <div className="bg-card-blue border border-blue-200/50 dark:border-blue-900/30 rounded-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-text-primary">
              <Clock className="w-4 h-4 text-blue-500" />
              <h2 className="font-semibold text-sm">Routines</h2>
            </div>
            <p className="text-xs text-text-muted">
              {routinesDone.length > 0 
                ? `You have completed ${routinesDone.length} routine item${routinesDone.length > 1 ? 's' : ''} today.` 
                : 'No routines completed yet today.'}
            </p>
          </div>

          {/* Recent Notes */}
          {recentNotes.length > 0 && (
            <div>
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2 text-text-muted uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" /> Recently Edited
              </h2>
              <div className="space-y-2">
                {recentNotes.map(note => (
                  <div 
                    key={note.id}
                    onClick={() => handleOpenNote(note)}
                    className="p-3 bg-card-default border border-black/5 dark:border-white/5 rounded-button cursor-pointer hover:shadow-card-hover dark:hover:shadow-card-hover-dark transition-all"
                  >
                    <div className="font-medium text-sm text-text-primary line-clamp-1">{note.title || 'Untitled'}</div>
                    <div className="text-xs text-text-muted mt-1 flex items-center justify-between">
                      <span className="capitalize">{note.workspace_id}</span>
                      <span>{new Date(note.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
