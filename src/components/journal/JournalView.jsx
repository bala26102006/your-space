import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Smile, 
  Sparkles, 
  BookOpen, 
  Flame, 
  Shuffle, 
  PenTool, 
  Clock, 
  Pin, 
  Archive, 
  Trash2,
  Palette
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import TagPill from '../shared/TagPill';
import { generateUUID } from '../../lib/uuid';
import { TimelineSkeleton } from '../shared/SkeletonLoader';
import { softDeleteItem, archiveItem, unarchiveItem, restoreItem } from '../../lib/services/trashService';
import { useConfirmStore } from '../../store/confirmStore';
import { useToastStore } from '../../store/toastStore';
import { COLOR_OPTIONS } from '../shared/ColorPicker';

const PROMPTS = [
  "What made you smile today?",
  "What is something you learned this week?",
  "Describe a challenge you faced and how you overcame it.",
  "What are three things you are grateful for right now?",
  "If today was a chapter in your book, what would it be called?",
  "What is one intention you have for tomorrow?",
  "Who inspired you recently, and why?",
  "Write about a small moment of peace you experienced today.",
  "What is something you want to let go of?",
  "How did you take care of yourself today?",
  "What is a dream you've been thinking about lately?",
  "What drained your energy today? What restored it?",
  "What is a conversation you remember from this week?",
  "Describe your surroundings right now in detail.",
  "What would you tell yourself one year ago?",
  "What are you looking forward to this month?",
  "How did you show kindness to someone recently?",
  "What is a decision you made that you feel good about?",
  "Write about an emotion you felt strongly today.",
  "What is something beautiful you noticed today?",
  "What boundary did you protect or need to set?",
  "If you had an extra hour today, how would you spend it?",
  "What is a song that matches your mood today?",
  "Describe a place where you feel most comfortable.",
  "What are you proud of achieving recently?",
  "How are you feeling physically today?",
  "Write about someone you admire.",
  "What is a quote that speaks to you right now?",
  "How did you step out of your comfort zone?",
  "What are three things you love about yourself?"
];

const MOOD_CONFIG = {
  'Calm': { label: 'Calm', emoji: '😌', color: '#3B82F6', bgClass: 'bg-blue-500', textClass: 'text-blue-500 dark:text-blue-400', badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  'Restless': { label: 'Restless', emoji: '🏃', color: '#F59E0B', bgClass: 'bg-amber-500', textClass: 'text-amber-500 dark:text-amber-400', badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  'Grateful': { label: 'Grateful', emoji: '🙏', color: '#10B981', bgClass: 'bg-emerald-500', textClass: 'text-emerald-500 dark:text-emerald-400', badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  'Tired': { label: 'Tired', emoji: '😴', color: '#8B5CF6', bgClass: 'bg-purple-500', textClass: 'text-purple-500 dark:text-purple-400', badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
};

function formatEntryDate(dateStr) {
  if (!dateStr) return 'Recent';
  const today = new Date().toISOString().split('T')[0];
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().split('T')[0];

  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';

  try {
    const [y, m, day] = dateStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(day));
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

function extractTextPreview(content) {
  if (!content) return '';
  if (typeof content === 'string') return content.trim();

  const extract = (node) => {
    if (!node) return '';
    if (node.text) return node.text;
    if (Array.isArray(node.content)) {
      return node.content.map(extract).join(' ');
    }
    return '';
  };

  return extract(content).trim();
}

function getColorClasses(color) {
  switch (color) {
    case 'yellow':
      return 'bg-card-yellow border-yellow-200/50 dark:border-yellow-900/30';
    case 'red':
      return 'bg-card-red border-red-200/50 dark:border-red-900/30';
    case 'blue':
      return 'bg-card-blue border-blue-200/50 dark:border-blue-900/30';
    case 'green':
      return 'bg-card-green border-green-200/50 dark:border-green-900/30';
    case 'purple':
      return 'bg-card-purple border-purple-200/50 dark:border-purple-900/30';
    default:
      return 'bg-card-default border-black/5 dark:border-white/10';
  }
}

export default function JournalView() {
  const { setSelectedNoteId, selectedNoteId } = useUIStore();
  const { openSoftDelete } = useConfirmStore();
  const { showToast } = useToastStore();
  const [activeColorNoteId, setActiveColorNoteId] = useState(null);

  const today = new Date();
  const offset = today.getTimezoneOffset();
  const todayStr = new Date(today.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

  // Daily prompt state with shuffle
  const [promptIndex, setPromptIndex] = useState(() => (today.getDate() - 1) % PROMPTS.length);
  const currentPrompt = PROMPTS[promptIndex % PROMPTS.length];

  const handleShufflePrompt = (e) => {
    e.stopPropagation();
    setPromptIndex((prev) => (prev + Math.floor(Math.random() * 5) + 1) % PROMPTS.length);
  };

  // Live Query: Journal notes
  const rawJournalNotes = useLiveQuery(async () => {
    const all = await db.notes.where('workspace_id').equals('journal').toArray();
    return all
      .filter((n) => !n.is_archived && !n.is_deleted)
      .sort((a, b) => new Date(b.entry_date || b.created_at) - new Date(a.entry_date || a.created_at));
  }, []);
  const journalNotes = rawJournalNotes || [];
  const isLoading = rawJournalNotes === undefined;

  // Tags mapping for cards
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

  // On This Day (Same MM-DD, different YYYY)
  const mmdd = todayStr.substring(5);
  const onThisDay = useMemo(() => {
    return journalNotes.filter(n => n.entry_date?.substring(5) === mmdd && n.entry_date !== todayStr);
  }, [journalNotes, mmdd, todayStr]);

  // Streak logic (accurate consecutive days written)
  const streak = useMemo(() => {
    if (!journalNotes || journalNotes.length === 0) return 0;
    const validDates = journalNotes
      .map(n => n.entry_date)
      .filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d));

    if (validDates.length === 0) return 0;

    const toDayNumber = (dStr) => {
      const [y, m, d] = dStr.split('-').map(Number);
      return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
    };

    const uniqueDays = Array.from(new Set(validDates.map(toDayNumber))).sort((a, b) => b - a);
    const todayNum = toDayNumber(todayStr);
    const latestDay = uniqueDays[0];

    // Streak is active if written today or yesterday
    if (latestDay !== todayNum && latestDay !== todayNum - 1) {
      return 0;
    }

    let count = 0;
    let expected = latestDay;
    for (const day of uniqueDays) {
      if (day === expected) {
        count++;
        expected--;
      } else if (day < expected) {
        break;
      }
    }
    return count;
  }, [journalNotes, todayStr]);

  // GitHub-style Mood Heatmap (last 35 days, 5 weeks x 7 days)
  const heatmapWeeks = useMemo(() => {
    const days = [];
    for (let i = 34; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
      const entry = journalNotes.find(n => n.entry_date === dStr || (n.created_at && n.created_at.startsWith(dStr)));
      const moodConfig = entry?.mood ? MOOD_CONFIG[entry.mood] : null;

      days.push({
        date: dStr,
        dayOfWeek: d.getDay(),
        formattedDate: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
        hasEntry: !!entry,
        entryTitle: entry?.title || (entry ? 'Journal Entry' : null),
        mood: entry?.mood || null,
        moodConfig,
        isToday: dStr === todayStr
      });
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [journalNotes, today, offset, todayStr]);

  // Create new journal entry with blank title so placeholder shows
  const handleCreateEntry = async (promptTitle = null) => {
    const newId = generateUUID();
    const newNote = {
      id: newId,
      user_id: 'local_user',
      workspace_id: 'journal',
      subproject_id: null,
      note_type: 'plain',
      title: promptTitle || '',
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
    <div className="space-y-6 pb-16 min-w-0 w-full">
      {/* 1. Page Header: flex with flex-wrap gap-3. Below 900px, buttons wrap cleanly. */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 min-w-0 w-full">
        {/* Left: title + badge */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-text-primary capitalize leading-tight">
              Journal
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] border border-[var(--workspace-accent)]/20 uppercase tracking-wider">
              Workspace
            </span>
          </div>
          <div className="h-0.5 w-8 rounded-full bg-[var(--workspace-accent)] mt-1.5" />
        </div>

        {/* Right: streak + Write Today. Below 900px, wraps to a clean row */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0 max-[900px]:w-full max-[900px]:justify-start">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 shrink-0 whitespace-nowrap">
            <Flame className="w-3.5 h-3.5 fill-rose-500/20 text-rose-500" />
            <span>{streak} Day Streak</span>
          </div>
          <button
            onClick={() => handleCreateEntry()}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-[var(--workspace-accent)] text-white rounded-button text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm shrink-0 whitespace-nowrap"
            aria-label="Write today's journal entry"
          >
            <Plus className="w-4 h-4" />
            <span>Write Today</span>
          </button>
        </div>
      </div>

      {/* 2. Layout: 2 columns on desktop (>=1024px), 1 column below 1024px. Right column min-width 320px */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] xl:grid-cols-[minmax(0,1fr)_380px] gap-6 min-w-0">
        
        {/* Left Column (Timeline of Entries) */}
        <div className="flex flex-col min-w-0 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-text-muted uppercase tracking-wider px-1">
            <span>Timeline</span>
            <span>{isLoading ? 'Loading...' : `${journalNotes.length} ${journalNotes.length === 1 ? 'entry' : 'entries'}`}</span>
          </div>

          {isLoading ? (
            <TimelineSkeleton count={4} />
          ) : journalNotes.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-card-default border border-dashed border-black/10 dark:border-white/10 rounded-2xl min-w-0 shadow-2xs">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500/20 via-amber-500/15 to-rose-500/10 text-rose-500 flex items-center justify-center mb-4 shadow-sm border border-rose-500/20 ring-4 ring-rose-500/5">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-text-primary">
                Your journal is waiting for its first thought
              </h3>
              <p className="text-xs text-text-muted mt-1.5 max-w-sm leading-relaxed">
                A mindful space to capture reflections, track your emotional patterns, and write freely.
              </p>
              <button
                onClick={() => handleCreateEntry()}
                className="mt-5 flex items-center gap-2 px-6 py-2.5 bg-[var(--workspace-accent)] text-white rounded-button text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Write your first entry</span>
              </button>
            </div>
          ) : (
            /* Entry Cards: Date chip placed inside card with proper padding, never absolutely positioned over border */
            <div className="space-y-3.5 min-w-0">
              {journalNotes.map((note) => {
                const isSelected = selectedNoteId === note.id;
                const moodObj = note.mood ? MOOD_CONFIG[note.mood] : null;
                const preview = extractTextPreview(note.content);
                const tags = noteTagsMap[note.id] || [];

                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`group relative border rounded-2xl p-5 sm:p-5.5 cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-lg dark:hover:shadow-black/40 min-w-0 ${getColorClasses(
                      note.color
                    )} ${
                      isSelected
                        ? 'border-[var(--workspace-accent)] ring-2 ring-[var(--workspace-accent)] shadow-card-hover'
                        : 'border-black/5 dark:border-white/10'
                    }`}
                  >
                    {/* Top Row: Date chip + Mood Emoji Badge + Actions */}
                    <div className="flex items-center justify-between gap-2 min-w-0 mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {/* Date chip: placed inside card with proper padding */}
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 text-text-muted shrink-0">
                          <CalendarIcon className="w-3 h-3 opacity-60" />
                          <span>{formatEntryDate(note.entry_date)}</span>
                        </div>

                        {/* Mood Emoji Badge */}
                        {moodObj && (
                          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border shrink-0 ${moodObj.badgeBg}`}>
                            <span>{moodObj.emoji}</span>
                            <span>{moodObj.label}</span>
                          </div>
                        )}

                        {note.is_pinned && (
                          <span className="p-0.5 text-amber-500">
                            <Pin className="w-3.5 h-3.5 fill-amber-500 transform rotate-45" />
                          </span>
                        )}
                      </div>

                      {/* Card Actions Menu: Always visible on touch, hover on desktop, min 32px hit area */}
                      <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        {/* Color Picker Button & Popover */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveColorNoteId(activeColorNoteId === note.id ? null : note.id);
                            }}
                            title="Change color"
                            aria-label="Change journal entry color"
                            className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                          >
                            <Palette className="w-3.5 h-3.5" />
                          </button>

                          {activeColorNoteId === note.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-9 z-30 p-2 bg-bg-primary rounded-xl shadow-xl border border-black/10 dark:border-white/10 flex items-center gap-1.5"
                            >
                              {COLOR_OPTIONS.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await db.notes.update(note.id, {
                                      color: c.id,
                                      updated_at: new Date().toISOString(),
                                    });
                                    setActiveColorNoteId(null);
                                    showToast({ message: `Color changed to ${c.label}` });
                                  }}
                                  title={c.label}
                                  aria-label={`Select ${c.label} color`}
                                  className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${
                                    (note.color || 'default') === c.id ? 'ring-2 ring-[var(--workspace-accent)] ring-offset-1 scale-105' : ''
                                  }`}
                                  style={{ backgroundColor: c.border }}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Pin Button */}
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const nextPin = !note.is_pinned;
                            await db.notes.update(note.id, {
                              is_pinned: nextPin,
                              updated_at: new Date().toISOString(),
                            });
                            showToast({ message: nextPin ? 'Pinned journal entry' : 'Unpinned journal entry' });
                          }}
                          className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                          title={note.is_pinned ? 'Unpin entry' : 'Pin entry'}
                          aria-label={note.is_pinned ? 'Unpin entry' : 'Pin entry'}
                        >
                          <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'fill-current text-amber-500' : ''}`} />
                        </button>

                        {/* Archive Button */}
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await archiveItem({
                              id: note.id,
                              type: 'note',
                              title: note.title || 'Journal Entry',
                              workspace: 'journal',
                            });
                            if (selectedNoteId === note.id) setSelectedNoteId(null);
                            showToast({
                              message: `Archived "${note.title || 'Journal Entry'}"`,
                              action: {
                                label: 'Undo',
                                onClick: async () => {
                                  await unarchiveItem({
                                    id: note.id,
                                    type: 'note',
                                    title: note.title || 'Journal Entry',
                                    workspace: 'journal',
                                  });
                                },
                              },
                            });
                          }}
                          className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                          title="Archive entry"
                          aria-label="Archive journal entry"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSoftDelete({
                              title: note.title || 'Journal Entry',
                              count: 1,
                              onConfirm: async () => {
                                await softDeleteItem({
                                  id: note.id,
                                  type: 'note',
                                  title: note.title || 'Journal Entry',
                                  workspace: 'journal',
                                });
                                if (selectedNoteId === note.id) setSelectedNoteId(null);
                                showToast({
                                  message: `Moved "${note.title || 'Journal Entry'}" to Trash`,
                                  action: {
                                    label: 'Undo',
                                    onClick: async () => {
                                      await restoreItem({
                                        id: note.id,
                                        type: 'note',
                                        title: note.title || 'Journal Entry',
                                        workspace: 'journal',
                                      });
                                    },
                                  },
                                });
                              },
                            });
                          }}
                          className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Delete entry"
                          aria-label="Delete journal entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold text-text-primary truncate">
                      {note.title || 'Untitled reflection'}
                    </h3>

                    {/* 2-line preview */}
                    <p className="text-xs text-text-muted line-clamp-2 leading-relaxed mt-1">
                      {preview || 'Empty reflection...'}
                    </p>

                    {/* Tags Footer */}
                    {tags.length > 0 && (
                      <div className="mt-3 pt-2.5 flex flex-wrap gap-1 border-t border-black/5 dark:border-white/5">
                        {tags.map((tag) => (
                          <TagPill key={tag.id} label={tag.label} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (Daily Prompt + Mood History + On This Day) */}
        <div className="flex flex-col gap-6 min-w-0 lg:min-w-[320px]">

          {/* 3. Daily Prompt Card: Text wraps normally without break-all or narrow fixed width */}
          <div className="bg-card-default border border-black/10 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-rose-500">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Daily Prompt
                </span>
              </div>
              <button
                onClick={handleShufflePrompt}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Shuffle prompt"
                aria-label="Shuffle prompt"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle</span>
              </button>
            </div>

            <p className="text-base sm:text-lg font-medium text-text-primary italic leading-relaxed my-3 break-words normal-case">
              &ldquo;{currentPrompt}&rdquo;
            </p>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleCreateEntry(currentPrompt)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-95 rounded-lg text-xs font-semibold transition-all shadow-2xs"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Use this prompt</span>
              </button>
            </div>
          </div>

          {/* Mood History Heatmap: Real GitHub-style */}
          <div className="bg-card-default border border-black/10 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Smile className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Mood History (Last 35 Days)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-text-muted">GitHub style</span>
            </div>

            {/* Heatmap Grid */}
            <div className="p-3 bg-bg-primary/50 rounded-xl border border-black/5 dark:border-white/5 overflow-visible min-w-0">
              <div className="flex gap-2 justify-center">
                {heatmapWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-2">
                    {week.map((day, dIdx) => {
                      const bgStyle = day.moodConfig
                        ? day.moodConfig.bgClass
                        : day.hasEntry
                        ? 'bg-blue-400'
                        : 'bg-black/5 dark:bg-white/10';

                      return (
                        <div key={dIdx} className="relative group/cell">
                          <div
                            className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-md ${bgStyle} ${
                              day.isToday ? 'ring-2 ring-rose-500 ring-offset-1 ring-offset-card-default' : ''
                            } transition-transform duration-100 hover:scale-125 cursor-pointer`}
                          />

                          {/* Hover Tooltip - opens downward */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover/cell:flex flex-col items-center z-50 pointer-events-none whitespace-nowrap">
                            <div className="w-2 h-2 bg-card-default border-t border-l border-black/10 dark:border-[var(--border-color)] rotate-45 -mb-1" />
                            <div className="bg-card-default text-text-primary border border-black/10 dark:border-[var(--border-color)] px-2.5 py-1.5 rounded-lg shadow-xl text-[11px] leading-tight flex flex-col gap-0.5">
                              <span className="font-semibold">{day.formattedDate}</span>
                              <span className="text-text-muted">
                                {day.mood ? `${day.moodConfig.emoji} ${day.mood}` : day.hasEntry ? '📝 Entry recorded' : 'No entry'}
                              </span>
                              {day.entryTitle && (
                                <span className="text-[10px] text-text-muted/80 truncate max-w-[140px]">
                                  {day.entryTitle}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="flex gap-3.5 mt-3.5 text-[11px] text-text-muted font-medium justify-center flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span>
                <span>Calm 😌</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block"></span>
                <span>Restless 🏃</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
                <span>Grateful 🙏</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block"></span>
                <span>Tired 😴</span>
              </span>
            </div>
          </div>

          {/* On This Day Card */}
          <div className="bg-card-default border border-black/10 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                On This Day
              </h3>
            </div>
            {onThisDay.length === 0 ? (
              <p className="text-xs text-text-muted italic">
                No past memories for this date from previous years yet.
              </p>
            ) : (
              <div className="space-y-2">
                {onThisDay.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className="p-3 bg-bg-primary border border-black/5 dark:border-white/5 rounded-xl cursor-pointer hover:border-[var(--workspace-accent)] transition-colors"
                  >
                    <div className="text-[10px] font-mono text-text-muted mb-0.5">
                      {note.entry_date?.substring(0, 4)}
                    </div>
                    <div className="font-semibold text-xs text-text-primary truncate">
                      {note.title || 'Untitled reflection'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
