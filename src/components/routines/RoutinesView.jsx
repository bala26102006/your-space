import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Repeat, 
  Clock, 
  CheckCircle2, 
  Circle, 
  MoreVertical, 
  Edit3, 
  Copy, 
  Archive, 
  Trash2,
  Sparkles,
  Flame
} from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useUIStore } from '../../store/uiStore';
import { db } from '../../lib/db';
import { getCardColorStyle, COLOR_OPTIONS } from '../shared/ColorPicker';
import RoutineEditModal from './RoutineEditModal';
import { generateUUID } from '../../lib/uuid';
import { GridSkeleton } from '../shared/SkeletonLoader';
import { softDeleteItem, archiveItem } from '../../lib/services/trashService';
import { useConfirmStore } from '../../store/confirmStore';

export default function RoutinesView() {
  const { selectedNoteId, setSelectedNoteId } = useUIStore();
  const { openSoftDelete } = useConfirmStore();
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineColor, setNewRoutineColor] = useState('default');
  const [newRoutineFrequency, setNewRoutineFrequency] = useState('daily');
  const [showNewRoutineForm, setShowNewRoutineForm] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingRoutine, setEditingRoutine] = useState(null);

  const menuRef = useRef(null);

  // Close card menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch routines (notes in 'routines' workspace)
  const rawRoutines = useLiveQuery(() => 
    db.notes.where('workspace_id').equals('routines')
      .filter(n => !n.is_archived && !n.is_deleted)
      .reverse().sortBy('created_at')
  , []);
  const routines = rawRoutines || [];
  const isLoading = rawRoutines === undefined;

  // Fetch all routine entries
  const allEntries = useLiveQuery(() => db.routine_entries.toArray(), []) || [];

  const handleCreateRoutine = async (e) => {
    e.preventDefault();
    if (!newRoutineTitle.trim()) return;

    const newId = generateUUID();
    await db.notes.add({
      id: newId,
      user_id: 'local_user',
      workspace_id: 'routines',
      subproject_id: null,
      note_type: 'routine',
      title: newRoutineTitle.trim(),
      color: newRoutineColor,
      content: { frequency: newRoutineFrequency, color: newRoutineColor },
      is_pinned: false,
      is_archived: false,
      is_deleted: false,
      sort_order: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setNewRoutineTitle('');
    setNewRoutineColor('default');
    setNewRoutineFrequency('daily');
    setShowNewRoutineForm(false);
    setSelectedNoteId(newId);
  };

  const handleDuplicate = async (routine, e) => {
    e?.stopPropagation();
    setOpenMenuId(null);
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

  const handleArchive = async (routineId, e) => {
    e?.stopPropagation();
    setOpenMenuId(null);
    const note = await db.notes.get(routineId);
    await archiveItem({
      id: routineId,
      type: 'note',
      title: note?.title || 'Untitled routine',
      workspace: 'routines',
    });
    if (selectedNoteId === routineId) setSelectedNoteId(null);
  };

  const handleDelete = (routineId, e) => {
    e?.stopPropagation();
    setOpenMenuId(null);
    db.notes.get(routineId).then((note) => {
      openSoftDelete({
        title: note?.title || 'Untitled routine',
        onConfirm: async () => {
          await softDeleteItem({
            id: routineId,
            type: 'note',
            title: note?.title || 'Untitled routine',
            workspace: 'routines',
          });
          if (selectedNoteId === routineId) setSelectedNoteId(null);
        },
      });
    });
  };

  const calculateStreak = (routineId) => {
    const entries = allEntries.filter(e => e.note_id === routineId);
    let streak = 0;
    let d = new Date();
    let dateStr = d.toISOString().split('T')[0];
    let entry = entries.find(e => e.entry_date === dateStr);
    
    if (!entry || (!entry.is_completed && !entry.is_freeze)) {
      d.setDate(d.getDate() - 1);
      dateStr = d.toISOString().split('T')[0];
      entry = entries.find(e => e.entry_date === dateStr);
    }

    while (entry && (entry.is_completed || entry.is_freeze)) {
      if (entry.is_completed) streak++;
      d.setDate(d.getDate() - 1);
      dateStr = d.toISOString().split('T')[0];
      entry = entries.find(e => e.entry_date === dateStr);
    }
    return streak;
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();
  const showReminder = hour >= 18;

  const renderCompletionGrid = (routineId) => {
    // Show last 7 days
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLetter = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
      days.push({ dateStr, dayLetter, isToday: i === 0 });
    }

    const entries = allEntries.filter(e => e.note_id === routineId);
    
    return (
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-black/5 dark:border-white/5">
        {days.map(({ dateStr, dayLetter, isToday }) => {
          const entry = entries.find(e => e.entry_date === dateStr);
          const isDone = entry?.is_completed;
          const isFreeze = entry?.is_freeze;
          
          let dotStyle = 'bg-black/5 dark:bg-white/10 text-text-muted';
          if (isDone) {
            dotStyle = 'bg-blue-500 text-white font-medium shadow-sm';
          } else if (isFreeze) {
            dotStyle = 'bg-sky-200 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700 border-dashed';
          }

          return (
            <div key={dateStr} className="relative group/day flex flex-col items-center gap-1">
              <span className={`text-[10px] font-medium ${isToday ? 'text-text-primary font-bold' : 'text-text-muted opacity-60'}`}>
                {dayLetter}
              </span>
              <div 
                className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-all ${dotStyle} ${isToday && !isDone && !isFreeze ? 'ring-1 ring-black/20 dark:ring-white/20' : ''}`}
              >
                {isDone ? '✓' : isFreeze ? '❄' : ''}
              </div>
              {/* Hover Tooltip */}
              {(isDone || isFreeze || entry?.habit_note) && (
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/day:flex flex-col items-center z-30 animate-in fade-in duration-100">
                  <div className="bg-[#2C2A28] dark:bg-[#1E1E1E] text-white text-[10px] font-medium px-2 py-0.5 rounded-lg shadow-lg border border-white/10 whitespace-nowrap text-center truncate max-w-[150px]">
                    {entry?.habit_note ? `"${entry.habit_note}"` : isDone ? 'Completed ✓' : 'Frozen ❄'}
                  </div>
                  <div className="w-1.5 h-1.5 bg-[#2C2A28] dark:bg-[#1E1E1E] rotate-45 -mt-0.5 border-r border-b border-white/10" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-full relative min-w-0 overflow-x-hidden">
      {/* Header Polish with 24px padding */}
      <div className="flex items-center justify-between pb-6 shrink-0 min-w-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--workspace-accent)] inline-block"></span>
            <span className="text-xs font-semibold tracking-wider uppercase text-[var(--workspace-accent)]">Routines Workspace</span>
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-bold capitalize text-text-primary tracking-tight leading-tight">Routines & Habits</h1>
          <p className="text-xs text-text-muted mt-1">Calm, sustainable tracking designed for mindful consistency.</p>
        </div>
        
        <button
          onClick={() => setShowNewRoutineForm(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--workspace-accent)] text-white rounded-button text-xs font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm shrink-0"
          aria-label="Create new routine"
        >
          <Plus className="w-4 h-4" />
          <span>New Routine</span>
        </button>
      </div>

      {showReminder && routines.length > 0 && (
        <div className="mb-6 p-3.5 bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-card flex items-center gap-3 text-xs text-blue-900 dark:text-blue-200">
          <Clock className="w-4 h-4 text-blue-500 opacity-80 shrink-0" />
          <p>Evening reminder: take a peaceful moment for your routines. Remember, there's no penalty or guilt if today didn't happen!</p>
        </div>
      )}

      {/* Routine Cards Grid with gap: 16px (gap-4) and smooth scrolling */}
      <div className="flex-1 pb-12 min-w-0">
        {isLoading ? (
          <GridSkeleton count={4} />
        ) : routines.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-2xl p-8 text-center bg-card-default max-w-md mx-auto my-12 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-text-primary">No routines yet</p>
            <p className="text-xs text-text-muted mt-1.5 max-w-xs leading-relaxed">
              Create a quiet habit like drinking water, daily journaling, or light reading. Click below to begin.
            </p>
            <button
              onClick={() => setShowNewRoutineForm(true)}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-[var(--workspace-accent)] text-white rounded-button text-xs font-medium hover:opacity-90 active:scale-95 transition-opacity shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Routine</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {routines.map(routine => {
              const todayEntry = allEntries.find(e => e.note_id === routine.id && e.entry_date === todayStr);
              const isDoneToday = todayEntry?.is_completed;
              const streak = calculateStreak(routine.id);
              const isMenuOpen = openMenuId === routine.id;
              const cardColor = routine.color || routine.content?.color || 'default';
              const frequency = routine.content?.frequency || 'daily';

              return (
                <div 
                  key={routine.id} 
                  onClick={() => setSelectedNoteId(routine.id)}
                  className={`group relative p-4 rounded-card cursor-pointer border transition-all duration-200 ease-out hover:scale-[1.02] flex flex-col justify-between bg-sky-500/5 hover:bg-sky-500/10 border-sky-500/20 dark:bg-sky-950/25 dark:border-sky-800/30 ${
                    selectedNoteId === routine.id 
                      ? 'border-sky-500 shadow-md ring-2 ring-sky-500/40' 
                      : 'hover:shadow-lg dark:hover:shadow-black/40 hover:border-sky-500/40'
                  }`}
                >
                  {/* Top line with title, streak & action menu */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 pr-1">
                        <h3 className="text-[18px] font-semibold text-text-primary tracking-tight truncate leading-tight">
                          {routine.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 min-w-0">
                          <span className="text-xs text-text-muted font-medium flex items-center gap-1 whitespace-nowrap shrink-0">
                            <Flame className={`w-3.5 h-3.5 ${streak > 0 ? 'text-amber-500' : 'text-text-muted opacity-40'} shrink-0`} />
                            <span className="whitespace-nowrap">{streak} {streak === 1 ? 'day' : 'days'} streak</span>
                          </span>
                          <span className="text-[10px] uppercase font-semibold text-text-muted/60 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                            {frequency}
                          </span>
                        </div>
                      </div>

                      {/* Right icons: Today's check & 3-dots menu button */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isDoneToday ? (
                          <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-text-muted opacity-30 shrink-0" />
                        )}

                        {/* Three-dots menu trigger */}
                        <div className="relative" ref={isMenuOpen ? menuRef : null}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(isMenuOpen ? null : routine.id);
                            }}
                            className={`p-1 rounded-md transition-all text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 ${
                              isMenuOpen ? 'opacity-100 bg-black/5 dark:bg-white/10 text-text-primary' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            title="Routine actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div 
                              className="absolute right-0 top-full mt-1 w-36 bg-bg-primary rounded-xl shadow-xl border border-black/10 dark:border-white/10 py-1.5 z-30 text-xs font-medium animate-in fade-in zoom-in-95 duration-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  setEditingRoutine(routine);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-text-muted" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleDuplicate(routine, e)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5 text-text-muted" />
                                <span>Duplicate</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleArchive(routine.id, e)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              >
                                <Archive className="w-3.5 h-3.5 text-text-muted" />
                                <span>Archive</span>
                              </button>

                              <div className="my-1 border-t border-black/5 dark:border-white/5" />

                              <button
                                type="button"
                                onClick={(e) => handleDelete(routine.id, e)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mini completion grid with clear dots */}
                  <div className="mt-3">
                    {renderCompletionGrid(routine.id)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Routine Modal */}
      {showNewRoutineForm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setShowNewRoutineForm(false)}
        >
          <form 
            onSubmit={handleCreateRoutine} 
            className="bg-bg-primary w-full max-w-sm rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 p-6 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-text-primary tracking-tight">Create Routine</h2>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Routine Name
              </label>
              <input 
                autoFocus
                type="text" 
                value={newRoutineTitle}
                onChange={e => setNewRoutineTitle(e.target.value)}
                className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-text-primary/20 transition-all placeholder:text-text-muted"
                placeholder="e.g. Morning Meditation"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Frequency
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'daily', label: 'Daily' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'monthly', label: 'Monthly' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNewRoutineFrequency(opt.id)}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                      newRoutineFrequency === opt.id
                        ? 'bg-bg-sidebar border-black/20 dark:border-white/20 text-text-primary shadow-sm font-semibold'
                        : 'border-transparent text-text-muted hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Card Color
              </label>
              <div className="flex items-center gap-3 py-1">
                {COLOR_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNewRoutineColor(opt.id)}
                    title={opt.label}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 relative border ${
                      newRoutineColor === opt.id ? 'ring-2 ring-offset-2 ring-text-primary scale-105' : 'border-black/10 dark:border-white/10'
                    }`}
                    style={{ backgroundColor: opt.bgLight, borderColor: opt.border }}
                  >
                    {newRoutineColor === opt.id && <span className="text-gray-800 text-xs font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
              <button 
                type="button" 
                onClick={() => setShowNewRoutineForm(false)} 
                className="px-4 py-2 text-xs font-medium text-text-muted hover:bg-black/5 dark:hover:bg-white/5 rounded-button transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-5 py-2 text-xs font-semibold bg-[var(--workspace-accent)] text-white rounded-button shadow-sm hover:opacity-90 active:scale-95 transition-all"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Routine Edit Modal */}
      {editingRoutine && (
        <RoutineEditModal
          routine={editingRoutine}
          isOpen={!!editingRoutine}
          onClose={() => setEditingRoutine(null)}
        />
      )}
    </div>
  );
}