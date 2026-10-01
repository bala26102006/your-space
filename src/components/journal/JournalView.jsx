import React, { useMemo } from 'react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import { useUIStore } from '../../store/uiStore';
import { Plus, Flame, Calendar, Clock, Smile } from 'lucide-react';
import NoteCard from '../cards/NoteCard';

const prompts = [
  "What is on your mind today?",
  "What are you grateful for right now?",
  "How did you practice self-care today?",
  "Describe a small victory you had today.",
  "What is something you're looking forward to?",
  "Write about a difficult emotion you felt today.",
  "What did you read or listen to today that resonated?",
  "How can you make tomorrow better than today?",
  "Describe a conversation that impacted you.",
  "What is a goal you're currently working towards?",
  "Who did you help today, or who helped you?",
  "What made you laugh recently?",
  "Describe a moment of peace you experienced.",
  "What is a habit you want to build or break?",
  "Write about a memory that brings you joy.",
  "What are you prioritizing right now?",
  "How did you challenge yourself today?",
  "Describe your perfect day.",
  "What is something you need to let go of?",
  "Write a short letter to your future self.",
  "What inspired you today?",
  "How did you handle stress today?",
  "What is a skill you want to learn?",
  "Describe a place where you feel most comfortable.",
  "What are you proud of achieving recently?",
  "How are you feeling physically today?",
  "Write about someone you admire.",
  "What is a quote that speaks to you right now?",
  "How did you step out of your comfort zone?",
  "What are three things you love about yourself?"
];

export default function JournalView() {
  const { setSelectedNoteId, selectedNoteId } = useUIStore();

  const journalNotes = useLiveQuery(async () => {
    const all = await db.notes.where('workspace_id').equals('journal').toArray();
    return all.filter((n) => !n.is_archived && !n.is_deleted).sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
  }, []) || [];

  // Tags mapping for NoteCard
  const allTags = useLiveQuery(() => db.tags.toArray(), []) || [];
  const allNoteTags = useLiveQuery(() => db.note_tags.toArray(), []) || [];
  const noteTagsMap = useMemo(() => {
    const map = {};
    const tMap = {};
    allTags.forEach(t => tMap[t.id] = t);
    allNoteTags.forEach(nt => {
      if (!map[nt.note_id]) map[nt.note_id] = [];
      if (tMap[nt.tag_id]) map[nt.note_id].push(tMap[nt.tag_id]);
    });
    return map;
  }, [allTags, allNoteTags]);

  const today = new Date();
  // Adjust to local date string yyyy-mm-dd
  const offset = today.getTimezoneOffset()
  const todayStr = new Date(today.getTime() - (offset*60*1000)).toISOString().split('T')[0]
  const dayOfMonth = today.getDate();
  const currentPrompt = prompts[(dayOfMonth - 1) % prompts.length];

  // On This Day (Same MM-DD, different YYYY)
  const mmdd = todayStr.substring(5);
  const onThisDay = journalNotes.filter(n => n.entry_date?.substring(5) === mmdd && n.entry_date !== todayStr);

  // Streak logic
  const streak = useMemo(() => {
    if (journalNotes.length === 0) return 0;
    const dates = [...new Set(journalNotes.map(n => n.entry_date))].sort((a,b) => new Date(b) - new Date(a));
    let count = 0;
    let current = new Date(todayStr);
    const yesterdayStr = new Date(current.setDate(current.getDate() - 1)).toISOString().split('T')[0];
    
    // Allow missing today (streak is still active if they wrote yesterday)
    if (dates[0] === todayStr || dates[0] === yesterdayStr) {
       // Valid active streak
       let checkDate = new Date(dates[0]);
       for (const d of dates) {
         if (d === checkDate.toISOString().split('T')[0]) {
           count++;
           checkDate.setDate(checkDate.getDate() - 1);
         } else {
           break;
         }
       }
    }
    return count;
  }, [journalNotes, todayStr]);

  // Mood Heatmap (last 30 days)
  const heatmap = useMemo(() => {
    const days = [];
    const colorMap = { 'Calm': 'bg-blue-400', 'Restless': 'bg-yellow-400', 'Grateful': 'bg-green-400', 'Tired': 'bg-purple-400' };
    for(let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = new Date(d.getTime() - (offset*60*1000)).toISOString().split('T')[0];
      const entry = journalNotes.find(n => n.entry_date === dStr);
      days.push({
        date: dStr,
        hasEntry: !!entry,
        color: entry?.mood ? colorMap[entry.mood] : (entry ? 'bg-black/20 dark:bg-white/20' : 'bg-black/5 dark:bg-white/5')
      });
    }
    return days;
  }, [journalNotes, today, offset]);

  const handleCreateEntry = async () => {
    const newId = crypto.randomUUID();
    const newNote = {
      id: newId,
      user_id: 'local_user',
      workspace_id: 'journal',
      subproject_id: null,
      note_type: 'plain',
      title: 'Journal Entry',
      content: { type: 'doc', content: [] },
      color: 'default',
      is_pinned: false,
      mood: null,
      entry_date: todayStr,
      is_archived: false,
      is_deleted: false,
      deleted_at: null,
      sort_order: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.notes.add(newNote);
    setSelectedNoteId(newId);
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Column: Date Timeline */}
      <div className="w-1/2 h-full overflow-y-auto pr-6 border-r border-black/5 dark:border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold capitalize text-text-primary">Journal Timeline</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-semibold text-orange-500 bg-orange-500/10 px-2 py-1.5 rounded flex-shrink-0">
              <Flame className="w-3.5 h-3.5" />
              <span>{streak} Day Streak</span>
            </div>
            <button
              onClick={handleCreateEntry}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-text-primary text-bg-primary rounded text-xs font-medium hover:opacity-90 transition-opacity shadow-sm flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Write Today</span>
            </button>
          </div>
        </div>

        {journalNotes.length === 0 ? (
          <div className="text-center py-10 text-text-muted">No journal entries yet. Start writing!</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 pb-6">
            {journalNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                isSelected={selectedNoteId === note.id}
                tags={noteTagsMap[note.id] || []}
                onSelect={() => setSelectedNoteId(note.id)}
                onPinToggle={async (id) => await db.notes.update(id, { is_pinned: !note.is_pinned })}
                onArchive={async (id) => await db.notes.update(id, { is_archived: true })}
                onDelete={async (id) => {
                  await db.notes.update(id, { is_deleted: true, deleted_at: new Date().toISOString() });
                  if (selectedNoteId === id) setSelectedNoteId(null);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Column: Prompts & Insights */}
      <div className="w-1/2 h-full overflow-y-auto pl-6 pb-6 flex flex-col gap-6">
        {/* Daily Prompt */}
        <div className="p-5 bg-card-default border border-black/10 dark:border-white/10 rounded-card shadow-sm">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Daily Prompt
          </h3>
          <p className="text-lg font-medium text-text-primary italic">"{currentPrompt}"</p>
        </div>

        {/* Mood Heatmap */}
        <div className="p-5 bg-card-default border border-black/10 dark:border-white/10 rounded-card shadow-sm">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Smile className="w-4 h-4" /> Mood History (Last 30 Days)
          </h3>
          <div className="grid grid-cols-10 gap-2">
            {heatmap.map((day, i) => (
              <div 
                key={i} 
                title={day.date}
                className={`aspect-square rounded-sm ${day.color} transition-colors hover:opacity-80`}
              />
            ))}
          </div>
          <div className="flex gap-3 mt-4 text-[10px] text-text-muted font-medium justify-center flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400"></span> Calm</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400"></span> Restless</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400"></span> Grateful</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-400"></span> Tired</span>
          </div>
        </div>

        {/* On This Day */}
        <div className="p-5 bg-card-default border border-black/10 dark:border-white/10 rounded-card shadow-sm flex-1">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> On This Day
          </h3>
          {onThisDay.length === 0 ? (
            <p className="text-sm text-text-muted italic">No past entries for this date.</p>
          ) : (
            <div className="space-y-3">
              {onThisDay.map(note => (
                <div 
                  key={note.id} 
                  onClick={() => setSelectedNoteId(note.id)}
                  className="p-3 bg-bg-primary border border-black/5 dark:border-white/5 rounded cursor-pointer hover:border-black/20 dark:hover:border-white/20 transition-colors"
                >
                  <div className="text-xs text-text-muted mb-1">{note.entry_date.substring(0,4)}</div>
                  <div className="font-medium text-sm text-text-primary truncate">{note.title || 'Untitled'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
