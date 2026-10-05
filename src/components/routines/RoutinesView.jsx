import React, { useState } from 'react';
import { Plus, Repeat, Clock, CheckCircle2, Circle } from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useUIStore } from '../../store/uiStore';
import { db } from '../../lib/db';

export default function RoutinesView() {
  const { selectedNoteId, setSelectedNoteId } = useUIStore();
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [showNewRoutineForm, setShowNewRoutineForm] = useState(false);

  // Fetch routines (notes in 'routines' workspace)
  const routines = useLiveQuery(() => 
    db.notes.where('workspace_id').equals('routines')
      .filter(n => !n.is_archived && !n.is_deleted)
      .reverse().sortBy('created_at')
  , []) || [];

  // Fetch all routine entries
  const allEntries = useLiveQuery(() => db.routine_entries.toArray(), []) || [];

  const handleCreateRoutine = async (e) => {
    e.preventDefault();
    if (!newRoutineTitle.trim()) return;

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    await db.notes.add({
      id: newId,
      user_id: 'local_user',
      workspace_id: 'routines',
      subproject_id: null,
      note_type: 'routine',
      title: newRoutineTitle.trim(),
      content: { frequency: 'daily', color: 'blue' },
      is_pinned: false,
      is_archived: false,
      is_deleted: false,
      sort_order: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setNewRoutineTitle('');
    setShowNewRoutineForm(false);
    setSelectedNoteId(newId);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();
  const showReminder = hour >= 18; // 75% of day = 6 PM

  const renderCompletionGrid = (routineId) => {
    // Show last 7 days
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push(dateStr);
    }

    const entries = allEntries.filter(e => e.note_id === routineId);
    
    return (
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-black/5 dark:border-white/5">
        {days.map(dateStr => {
          const entry = entries.find(e => e.entry_date === dateStr);
          const isDone = entry?.is_completed;
          const isFreeze = entry?.is_freeze;
          
          let bgColor = 'bg-black/5 dark:bg-white/5';
          if (isDone) bgColor = 'bg-blue-500/80';
          else if (isFreeze) bgColor = 'bg-blue-200 dark:bg-blue-900/50';

          return (
            <div 
              key={dateStr}
              title={dateStr + (isDone ? ' (Done)' : isFreeze ? ' (Frozen)' : '')}
              className={`w-4 h-4 rounded-sm ${bgColor} transition-colors`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold capitalize text-text-primary">Routines & Habits</h1>
          <p className="text-xs text-text-muted mt-0.5">Build consistency without the pressure.</p>
        </div>
        
        <button
          onClick={() => setShowNewRoutineForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-text-primary text-bg-primary rounded-button text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Routine</span>
        </button>
      </div>

      {showReminder && routines.length > 0 && (
        <div className="mb-6 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-card flex items-center gap-3 text-sm text-blue-800 dark:text-blue-200">
          <Clock className="w-5 h-5 text-blue-500 opacity-70" />
          <p>The day is winding down. Don't forget to take a moment for your routines if you haven't yet. No pressure if today didn't go as planned!</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-2 pb-6">
        {routines.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-card p-8 text-center bg-card-default">
            <Repeat className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No routines yet</p>
            <p className="text-xs opacity-70 mt-1 max-w-xs">Click "New Routine" to start building a habit.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {routines.map(routine => {
              const todayEntry = allEntries.find(e => e.note_id === routine.id && e.entry_date === todayStr);
              const isDoneToday = todayEntry?.is_completed;
              
              return (
                <div 
                  key={routine.id} 
                  onClick={() => setSelectedNoteId(routine.id)}
                  className={`p-4 bg-card-default border ${selectedNoteId === routine.id ? 'border-blue-500/50 shadow-sm' : 'border-black/5 dark:border-white/10'} rounded-card cursor-pointer hover:shadow-card-hover dark:hover:shadow-card-hover-dark transition-all flex flex-col`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-text-primary line-clamp-2">{routine.title}</h3>
                    {isDoneToday ? (
                      <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-text-muted opacity-30 shrink-0" />
                    )}
                  </div>
                  
                  <div className="mt-auto">
                    {renderCompletionGrid(routine.id)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showNewRoutineForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateRoutine} className="bg-bg-primary w-full max-w-sm rounded-xl shadow-2xl border border-black/10 dark:border-white/10 p-6">
            <h2 className="text-lg font-bold text-text-primary mb-4">Create Routine</h2>
            <div className="mb-4">
              <label className="block text-xs font-medium text-text-muted mb-1">Routine Name</label>
              <input 
                autoFocus
                type="text" 
                value={newRoutineTitle}
                onChange={e => setNewRoutineTitle(e.target.value)}
                className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500"
                placeholder="e.g. Drink 2L Water"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewRoutineForm(false)} className="px-4 py-2 text-sm font-medium text-text-muted hover:bg-black/5 dark:hover:bg-white/5 rounded-button">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium bg-text-primary text-bg-primary rounded-button shadow-sm">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}