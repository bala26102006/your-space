import React, { useState } from 'react';
import { Plus, BookOpen, Calendar, Smile, Meh, Frown, Sparkles, CloudRain } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import NoteCard from '../cards/NoteCard';

export const MOOD_OPTIONS = [
  { id: 'great', label: 'Great', icon: Smile, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
  { id: 'energized', label: 'Energized', icon: Sparkles, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
  { id: 'okay', label: 'Okay', icon: Meh, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
  { id: 'reflective', label: 'Reflective', icon: BookOpen, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' },
  { id: 'low', label: 'Low', icon: CloudRain, color: 'text-gray-500 bg-gray-50 dark:bg-gray-950/30' },
];

export default function JournalView() {
  const { selectedNoteId, setSelectedNoteId } = useUIStore();
  const [selectedMood, setSelectedMood] = useState('great');

  // Fetch Journal notes
  const journalNotes = useLiveQuery(async () => {
    const all = await db.notes.where('workspace_id').equals('journal').toArray();
    return all
      .filter((n) => !n.is_archived && !n.is_deleted)
      .sort((a, b) => new Date(b.entry_date || b.created_at) - new Date(a.entry_date || a.created_at));
  }, []) || [];

  const handleCreateJournalEntry = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const formattedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const noteId = crypto.randomUUID();
    const newNote = {
      id: noteId,
      user_id: 'local_user',
      workspace_id: 'journal',
      subproject_id: null,
      note_type: 'journal',
      title: formattedDate,
      content: { type: 'doc', content: [] },
      color: 'default',
      is_pinned: false,
      mood: selectedMood,
      entry_date: todayStr,
      is_archived: false,
      is_deleted: false,
      deleted_at: null,
      sort_order: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.notes.add(newNote);
    setSelectedNoteId(noteId);
  };

  return (
    <div className="space-y-6">
      {/* Journal View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Journal</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Auto-dated daily reflection entries with mood tracking
          </p>
        </div>

        {/* Mood Selector + New Entry */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button">
            {MOOD_OPTIONS.map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMood === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMood(m.id)}
                  title={m.label}
                  className={`p-1.5 rounded-button transition-colors ${
                    isSelected ? 'bg-bg-primary text-text-primary shadow-sm font-semibold' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          <button
            onClick={handleCreateJournalEntry}
            className="flex items-center gap-1.5 px-3 py-2 bg-text-primary text-bg-primary rounded-button text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Daily Entry</span>
          </button>
        </div>
      </div>

      {/* Journal Entries Grid */}
      {journalNotes.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-card p-8 text-center">
          <BookOpen className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No journal entries yet</p>
          <p className="text-xs opacity-70 mt-1 max-w-xs">
            Click "+ New Daily Entry" to record today's thoughts and mood.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {journalNotes.map((note) => {
            const moodObj = MOOD_OPTIONS.find((m) => m.id === note.mood) || MOOD_OPTIONS[0];
            const MoodIcon = moodObj.icon;
            return (
              <div key={note.id} className="relative">
                <NoteCard
                  note={note}
                  isSelected={selectedNoteId === note.id}
                  tags={[]}
                  onSelect={() => setSelectedNoteId(note.id)}
                  onPinToggle={async (id) => {
                    await db.notes.update(id, { is_pinned: !note.is_pinned });
                  }}
                  onArchive={async (id) => {
                    await db.notes.update(id, { is_archived: true });
                  }}
                  onDelete={async (id) => {
                    await db.notes.update(id, { is_deleted: true, deleted_at: new Date().toISOString() });
                    if (selectedNoteId === id) setSelectedNoteId(null);
                  }}
                />

                {/* Mood Tag Badge */}
                <div className="absolute top-4 right-10">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${moodObj.color}`}>
                    <MoodIcon className="w-3 h-3" />
                    <span>{moodObj.label}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
