import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, Circle, Calendar as CalendarIcon, Snowflake, Edit2 } from 'lucide-react';
import { db } from '../../lib/db';
import { useLiveQuery } from '../../hooks/useLiveQuery';

export default function RoutinesEditor({ note, onClose }) {
  const [viewMode, setViewMode] = useState('monthly'); // 'weekly' or 'monthly'
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  
  // Fetch entries for this routine
  const entries = useLiveQuery(() => 
    db.routine_entries.where('note_id').equals(note.id).toArray()
  , [note.id]) || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntry = entries.find(e => e.entry_date === todayStr);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Handle entry toggle
  const handleToggleEntry = async (dateStr, isFreeze = false) => {
    const existing = entries.find(e => e.entry_date === dateStr);
    
    // Calculate new streak (simplified: just fetch previous day's streak and add 1)
    // For a real app we'd recursively recalculate, but for this constraint we'll just store basic completion
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
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        note_id: note.id,
        entry_date: dateStr,
        is_completed: !isFreeze,
        is_freeze: isFreeze,
        streak_count: 1, // Simplified
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
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        note_id: note.id,
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
    // Check today first, if not done, check yesterday
    let dateStr = d.toISOString().split('T')[0];
    let entry = entries.find(e => e.entry_date === dateStr);
    
    if (!entry || (!entry.is_completed && !entry.is_freeze)) {
      // Not done today, let's start checking from yesterday
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
      
      let bgColor = 'bg-black/5 dark:bg-white/5 text-text-primary hover:bg-black/10 dark:hover:bg-white/10';
      if (entry?.is_completed) bgColor = 'bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/50';
      else if (entry?.is_freeze) bgColor = 'bg-blue-100 dark:bg-blue-900/40 text-blue-500 border border-blue-200 dark:border-blue-800 border-dashed';

      if (dateStr > todayStr) {
        bgColor = 'bg-transparent text-text-muted opacity-30 cursor-default';
      }

      return (
        <button 
          key={dateStr}
          disabled={dateStr > todayStr}
          onClick={() => setSelectedDateStr(dateStr)}
          onDoubleClick={() => handleToggleEntry(dateStr, false)}
          className={`h-10 rounded-lg flex items-center justify-center text-sm transition-colors ${bgColor} ${selectedDateStr === dateStr ? 'ring-2 ring-text-primary' : ''}`}
        >
          {d}
        </button>
      );
    });

    return (
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-text-muted mb-2">{day}</div>
        ))}
        {blanks}
        {days}
      </div>
    );
  };

  const renderWeekly = () => {
    // Show just the last 7 days including today
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    return (
      <div className="flex gap-2 mb-4">
        {days.map(dateStr => {
          const dObj = new Date(dateStr);
          const dayName = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dObj.getDay()];
          const entry = entries.find(e => e.entry_date === dateStr);
          
          let bgColor = 'bg-black/5 dark:bg-white/5 text-text-primary hover:bg-black/10 dark:hover:bg-white/10';
          if (entry?.is_completed) bgColor = 'bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/50';
          else if (entry?.is_freeze) bgColor = 'bg-blue-100 dark:bg-blue-900/40 text-blue-500 border border-blue-200 dark:border-blue-800 border-dashed';

          return (
            <button 
              key={dateStr}
              onClick={() => setSelectedDateStr(dateStr)}
              onDoubleClick={() => handleToggleEntry(dateStr, false)}
              className={`flex-1 aspect-square rounded-lg flex flex-col items-center justify-center transition-colors ${bgColor} ${selectedDateStr === dateStr ? 'ring-2 ring-text-primary' : ''}`}
            >
              <span className="text-[10px] uppercase opacity-70 mb-1">{dayName}</span>
              <span className="text-lg">{dObj.getDate()}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const selectedEntry = entries.find(e => e.entry_date === selectedDateStr);

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5 shrink-0">
        <h2 className="font-semibold text-text-primary text-lg flex items-center gap-2">
          {note.title}
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        
        {/* Streak Stats */}
        <div className="flex items-center justify-between bg-card-default border border-black/5 dark:border-white/10 rounded-card p-6 mb-8 shadow-sm">
          <div>
            <p className="text-sm font-medium text-text-muted mb-1">Current Streak</p>
            <div className="text-4xl font-bold text-text-primary tracking-tight">
              {currentStreak} <span className="text-xl font-normal text-text-muted opacity-70">days</span>
            </div>
          </div>
          
          <div className="text-right">
            <button 
              onClick={() => handleToggleEntry(todayStr, false)}
              className={`flex items-center gap-2 px-6 py-3 rounded-button font-medium transition-all ${
                todayEntry?.is_completed 
                  ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' 
                  : 'bg-text-primary text-bg-primary shadow-sm hover:opacity-90'
              }`}
            >
              {todayEntry?.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 opacity-50" />}
              {todayEntry?.is_completed ? 'Completed Today' : 'Mark Complete'}
            </button>
          </div>
        </div>

        {/* Visual Calendar */}
        <div className="bg-card-default border border-black/5 dark:border-white/10 rounded-card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-text-muted" />
              Progress
            </h3>
            <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'weekly' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-muted'}`}
              >
                Weekly
              </button>
              <button 
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'monthly' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-muted'}`}
              >
                Monthly
              </button>
            </div>
          </div>
          
          <p className="text-xs text-text-muted mb-4 opacity-70">Double-click a day to quick-toggle completion.</p>

          {viewMode === 'monthly' ? renderCalendar() : renderWeekly()}

          <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5 mt-4">
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500/20 border border-blue-500/50"></div> Done</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 border-dashed"></div> Frozen</div>
            </div>
            
            <button 
              onClick={() => handleToggleEntry(todayStr, true)}
              disabled={!canFreeze && !todayEntry?.is_freeze}
              title={canFreeze ? "Use your 1 monthly freeze to save your streak if you can't do it today." : "No freezes left this month."}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-button transition-colors ${
                todayEntry?.is_freeze 
                  ? 'bg-blue-100 text-blue-600 border border-blue-200' 
                  : canFreeze 
                    ? 'hover:bg-black/5 dark:hover:bg-white/10 text-text-primary' 
                    : 'opacity-50 cursor-not-allowed text-text-muted'
              }`}
            >
              <Snowflake className="w-3.5 h-3.5" />
              {todayEntry?.is_freeze ? 'Streak Frozen' : 'Freeze Streak'}
            </button>
          </div>
        </div>

        {/* Selected Date Details */}
        <div className="bg-card-default border border-black/5 dark:border-white/10 rounded-card p-6">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2 text-sm">
            <Edit2 className="w-4 h-4 text-text-muted" />
            Notes for {selectedDateStr === todayStr ? 'Today' : new Date(selectedDateStr).toLocaleDateString()}
          </h3>
          
          <textarea
            value={selectedEntry?.habit_note || ''}
            onChange={(e) => handleUpdateNote(selectedDateStr, e.target.value)}
            placeholder="Add a small note about today's progress..."
            className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-card p-4 text-sm text-text-primary focus:outline-none focus:border-blue-500 resize-y min-h-[100px]"
          />
        </div>

      </div>
    </div>
  );
}