import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  Circle, 
  Calendar as CalendarIcon, 
  Snowflake, 
  Edit3, 
  Flame,
  FileText
} from 'lucide-react';
import { db } from '../../lib/db';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import RoutineEditModal from './RoutineEditModal';

export default function RoutinesEditor({ note, onClose }) {
  const [viewMode, setViewMode] = useState('monthly'); // 'weekly' or 'monthly'
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Fetch entries for this routine
  const entries = useLiveQuery(() => 
    db.routine_entries.where('note_id').equals(note.id).toArray()
  , [note.id]) || [];

  // Live query for current note data (in case title/color/frequency updated)
  const currentNote = useLiveQuery(() => db.notes.get(note.id), [note.id]) || note;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntry = entries.find(e => e.entry_date === todayStr);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Handle entry toggle
  const handleToggleEntry = async (dateStr, isFreeze = false) => {
    const existing = entries.find(e => e.entry_date === dateStr);
    
    if (existing) {
      if (existing.is_completed && !isFreeze) {
        // Toggle off
        await db.routine_entries.delete(existing.id);
      } else {
        // Update
        await db.routine_entries.update(existing.id, {
          is_completed: !isFreeze,
          is_freeze: isFreeze
        });
      }
    } else {
      await db.routine_entries.add({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        note_id: currentNote.id,
        period: viewMode, // weekly/monthly
        entry_date: dateStr,
        is_completed: !isFreeze,
        is_freeze: isFreeze,
        streak_count: 1,
        habit_note: ''
      });
    }
  };

  const handleUpdateNote = async (dateStr, text) => {
    const existing = entries.find(e => e.entry_date === dateStr);
    if (existing) {
      await db.routine_entries.update(existing.id, { habit_note: text });
    } else {
      await db.routine_entries.add({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        note_id: currentNote.id,
        period: viewMode,
        entry_date: dateStr,
        is_completed: false,
        is_freeze: false,
        streak_count: 0,
        habit_note: text
      });
    }
  };

  // Compute Streak
  const currentStreak = useMemo(() => {
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
  }, [entries]);

  // Compute Monthly Freezes
  const freezesThisMonth = entries.filter(e => {
    if (!e.is_freeze) return false;
    const d = new Date(e.entry_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const canFreeze = freezesThisMonth < 1;

  // Calendar Grid
  const renderCalendar = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    
    const blanks = Array.from({ length: firstDay }).map((_, i) => <div key={`blank-${i}`} className="h-10" />);
    
    const days = Array.from({ length: daysInMonth }).map((_, i) => {
      const d = i + 1;
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entry = entries.find(e => e.entry_date === dateStr);
      
      let bgStyle = 'bg-black/5 dark:bg-white/5 text-text-primary hover:bg-black/10 dark:hover:bg-white/10';
      if (entry?.is_completed) {
        bgStyle = 'bg-blue-500 text-white font-semibold shadow-sm';
      } else if (entry?.is_freeze) {
        bgStyle = 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700 border-dashed';
      }

      if (dateStr > todayStr) {
        bgStyle = 'bg-transparent text-text-muted opacity-30 cursor-default hover:bg-transparent';
      }

      const isSelected = selectedDateStr === dateStr;

      return (
        <div key={dateStr} className="relative group/day flex items-center justify-center">
          <button 
            disabled={dateStr > todayStr}
            onClick={() => setSelectedDateStr(dateStr)}
            onDoubleClick={() => handleToggleEntry(dateStr, false)}
            className={`w-full h-10 rounded-xl flex items-center justify-center text-xs transition-all ${bgStyle} ${
              isSelected ? 'ring-2 ring-text-primary ring-offset-2 ring-offset-bg-primary font-bold' : ''
            }`}
          >
            {d}
          </button>
          {/* Hover Tooltip when completed or has habit note */}
          {(entry?.is_completed || entry?.habit_note) && (
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/day:flex flex-col items-center z-30 animate-in fade-in duration-150">
              <div className="bg-[#2C2A28] dark:bg-[#1E1E1E] text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg border border-white/10 whitespace-nowrap max-w-[200px] text-center truncate">
                {entry.habit_note ? `"${entry.habit_note}"` : 'Completed ✓'}
              </div>
              <div className="w-1.5 h-1.5 bg-[#2C2A28] dark:bg-[#1E1E1E] rotate-45 -mt-0.5 border-r border-b border-white/10" />
            </div>
          )}
        </div>
      );
    });

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-[11px] font-semibold text-text-muted opacity-60 mb-1">{day}</div>
        ))}
        {blanks}
        {days}
      </div>
    );
  };

  const renderWeekly = () => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    return (
      <div className="flex gap-2">
        {days.map(dateStr => {
          const dObj = new Date(dateStr);
          const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dObj.getDay()];
          const entry = entries.find(e => e.entry_date === dateStr);
          
          let bgStyle = 'bg-black/5 dark:bg-white/5 text-text-primary hover:bg-black/10 dark:hover:bg-white/10';
          if (entry?.is_completed) {
            bgStyle = 'bg-blue-500 text-white font-semibold shadow-sm';
          } else if (entry?.is_freeze) {
            bgStyle = 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700 border-dashed';
          }

          const isSelected = selectedDateStr === dateStr;

          return (
            <div key={dateStr} className="relative group/day flex-1 flex flex-col items-center">
              <button 
                onClick={() => setSelectedDateStr(dateStr)}
                onDoubleClick={() => handleToggleEntry(dateStr, false)}
                className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${bgStyle} ${
                  isSelected ? 'ring-2 ring-text-primary ring-offset-2 ring-offset-bg-primary' : ''
                }`}
              >
                <span className="text-[10px] uppercase opacity-75 mb-1 font-semibold">{dayName}</span>
                <span className="text-base font-bold">{dObj.getDate()}</span>
              </button>
              {/* Hover Tooltip */}
              {(entry?.is_completed || entry?.habit_note) && (
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/day:flex flex-col items-center z-30 animate-in fade-in duration-150">
                  <div className="bg-[#2C2A28] dark:bg-[#1E1E1E] text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg border border-white/10 whitespace-nowrap max-w-[200px] text-center truncate">
                    {entry.habit_note ? `"${entry.habit_note}"` : 'Completed ✓'}
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

  const selectedEntry = entries.find(e => e.entry_date === selectedDateStr);
  const frequency = currentNote.content?.frequency || 'daily';

  return (
    <div className="h-full flex flex-col bg-bg-primary overflow-hidden">
      {/* Top bar with Edit button & Close button */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="font-semibold text-text-primary text-lg tracking-tight truncate">
            {currentNote.title}
          </h2>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full shrink-0">
            {frequency}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Edit Routine"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-text-primary"
            title="Close editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Content Area: Centered, max-w-[720px], padding: 32px (p-8), de-cluttered */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto w-full p-8 flex flex-col gap-8">
          
          {/* Calm Streak Overview & Completion */}
          <div className="bg-card-default border border-black/5 dark:border-white/10 rounded-2xl p-6 shadow-sm flex items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Flame className={`w-4 h-4 ${currentStreak > 0 ? 'text-amber-500' : 'text-text-muted opacity-40'}`} />
                Current Streak
              </p>
              <div className="text-3xl font-bold text-text-primary tracking-tight">
                {currentStreak} <span className="text-sm font-normal text-text-muted">consecutive {currentStreak === 1 ? 'day' : 'days'}</span>
              </div>
            </div>
            
            <div>
              <button 
                type="button"
                onClick={() => handleToggleEntry(todayStr, false)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-button text-xs font-semibold transition-all ${
                  todayEntry?.is_completed 
                    ? 'bg-blue-500 text-white shadow-sm hover:opacity-95' 
                    : 'bg-text-primary text-bg-primary shadow-sm hover:opacity-90'
                }`}
              >
                {todayEntry?.is_completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 opacity-50" />}
                <span>{todayEntry?.is_completed ? 'Completed Today' : 'Mark Complete'}</span>
              </button>
            </div>
          </div>

          {/* Progress Calendar */}
          <div className="bg-card-default border border-black/5 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-text-muted" />
                Progress
              </h3>

              {/* Weekly / Monthly Toggle with clean soft shadow on active state */}
              <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => setViewMode('weekly')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    viewMode === 'weekly' 
                      ? 'bg-bg-primary text-text-primary shadow-sm font-semibold' 
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Weekly
                </button>
                <button 
                  type="button"
                  onClick={() => setViewMode('monthly')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    viewMode === 'monthly' 
                      ? 'bg-bg-primary text-text-primary shadow-sm font-semibold' 
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Interactive Grid */}
            <div>
              {viewMode === 'monthly' ? renderCalendar() : renderWeekly()}
            </div>

            {/* Sub-bar with legend & Freeze Streak action */}
            <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5 text-xs">
              <div className="flex items-center gap-4 text-text-muted">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-md bg-blue-500"></div>
                  <span>Done</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-md bg-sky-100 dark:bg-sky-950/50 border border-sky-300 dark:border-sky-700 border-dashed"></div>
                  <span>Frozen</span>
                </div>
              </div>
              
              {/* Soft, muted Freeze Streak button */}
              <button 
                type="button"
                onClick={() => handleToggleEntry(todayStr, true)}
                disabled={!canFreeze && !todayEntry?.is_freeze}
                title={canFreeze ? "Use your 1 monthly streak freeze to keep consistency if today wasn't possible." : "1 monthly freeze already used."}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium transition-all ${
                  todayEntry?.is_freeze 
                    ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700' 
                    : canFreeze 
                      ? 'bg-sky-50/80 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/40 hover:bg-sky-100 dark:hover:bg-sky-900/50' 
                      : 'opacity-40 cursor-not-allowed text-text-muted border border-black/5 dark:border-white/5'
                }`}
              >
                <Snowflake className="w-3.5 h-3.5" />
                <span>{todayEntry?.is_freeze ? 'Streak Frozen' : 'Freeze Streak'}</span>
              </button>
            </div>
          </div>

          {/* Notes for Today Section */}
          <div className="bg-card-default border border-black/5 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <FileText className="w-4 h-4 text-text-muted" />
              Notes for {selectedDateStr === todayStr ? 'Today' : new Date(selectedDateStr).toLocaleDateString()}
            </h3>
            
            <textarea
              value={selectedEntry?.habit_note || ''}
              onChange={(e) => handleUpdateNote(selectedDateStr, e.target.value)}
              placeholder="Reflect on today's habit, write a thought or intention..."
              className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-xl p-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-text-primary/20 transition-all resize-y min-h-[110px]"
            />
          </div>

        </div>
      </div>

      {/* Routine Edit Modal */}
      {isEditModalOpen && (
        <RoutineEditModal
          routine={currentNote}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
}