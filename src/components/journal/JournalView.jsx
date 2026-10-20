import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Shuffle, 
  PenTool, 
  Clock, 
  Pin, 
  Archive, 
  Trash2,
  Palette,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Flame,
  ChevronDown
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

import {
  getTodayLocalDateStr,
  formatEntryDate,
  formatMonthHeading,
  getMoodConfig,
  MOOD_CONFIG,
  PROMPT_PACKS,
  getDailyPrompt,
  shufflePrompt,
  calculateJournalStreak,
  buildMoodHeatmap,
  extractTextPreview,
} from '../../lib/journal/journalUtils';

export default function JournalView() {
  const { setSelectedNoteId, selectedNoteId } = useUIStore();
  const { openSoftDelete } = useConfirmStore();
  const { showToast } = useToastStore();

  const [activeColorNoteId, setActiveColorNoteId] = useState(null);
  const [selectedPackId, setSelectedPackId] = useState('all');

  const todayStr = useMemo(() => getTodayLocalDateStr(), []);

  // Shared deterministic daily prompt initialized for today
  const [currentPrompt, setCurrentPrompt] = useState(() => getDailyPrompt('all', new Date()));

  // Live Query: Fetch all journal notes (sorted by entry_date descending)
  const rawJournalNotes = useLiveQuery(async () => {
    const all = await db.notes.where('workspace_id').equals('journal').toArray();
    return all
      .filter((n) => !n.is_archived && !n.is_deleted)
      .sort((a, b) => {
        const dateA = a.entry_date || a.created_at || '';
        const dateB = b.entry_date || b.created_at || '';
        return dateB.localeCompare(dateA);
      });
  }, []);

  const journalNotes = rawJournalNotes || [];
  const isLoading = rawJournalNotes === undefined;

  // Tags mapping for cards
  const allTags = useLiveQuery(() => db.tags.toArray(), []) || [];
  const allNoteTags = useLiveQuery(() => db.note_tags.toArray(), []) || [];
  const noteTagsMap = useMemo(() => {
    const map = {};
    const tMap = {};
    allTags.forEach((t) => (tMap[t.id] = t));
    allNoteTags.forEach((nt) => {
      if (!map[nt.note_id]) map[nt.note_id] = [];
      if (tMap[nt.tag_id]) map[nt.note_id].push(tMap[nt.tag_id]);
    });
    return map;
  }, [allTags, allNoteTags]);

  // Check if an entry for today already exists
  const todayEntry = useMemo(() => {
    return journalNotes.find((n) => n.entry_date === todayStr);
  }, [journalNotes, todayStr]);

  // On This Day: same month-day from previous years
  const mmdd = todayStr.substring(5);
  const onThisDay = useMemo(() => {
    return journalNotes.filter(
      (n) => n.entry_date && n.entry_date.substring(5) === mmdd && n.entry_date !== todayStr
    );
  }, [journalNotes, mmdd, todayStr]);

  // Streak & monthly stats (gentle streak with 1 grace day per week)
  const streakStats = useMemo(() => {
    return calculateJournalStreak(journalNotes);
  }, [journalNotes]);

  // 35-day Mood Heatmap (5 weeks x 7 days)
  const heatmap = useMemo(() => {
    return buildMoodHeatmap(journalNotes);
  }, [journalNotes]);

  // Group timeline entries by Month
  const entriesByMonth = useMemo(() => {
    const groups = [];
    let currentHeading = null;
    let currentList = [];

    journalNotes.forEach((note) => {
      const heading = formatMonthHeading(note.entry_date || note.created_at);
      if (heading !== currentHeading) {
        if (currentList.length > 0) {
          groups.push({ heading: currentHeading, notes: currentList });
        }
        currentHeading = heading;
        currentList = [note];
      } else {
        currentList.push(note);
      }
    });

    if (currentList.length > 0) {
      groups.push({ heading: currentHeading, notes: currentList });
    }
    return groups;
  }, [journalNotes]);

  // Shuffle prompt within selected pack
  const handleShuffle = (e) => {
    e.stopPropagation();
    const shuffled = shufflePrompt(selectedPackId, currentPrompt.text);
    setCurrentPrompt(shuffled);
  };

  // Switch pack
  const handleSelectPack = (packId) => {
    setSelectedPackId(packId);
    const newPrompt = getDailyPrompt(packId, new Date());
    setCurrentPrompt(newPrompt);
  };

  // Open existing today's entry or create a new one
  const handleOpenOrCreateToday = async (isTiny = false) => {
    if (todayEntry) {
      setSelectedNoteId(todayEntry.id);
      return;
    }

    const newId = generateUUID();
    const newNote = {
      id: newId,
      user_id: 'local_user',
      workspace_id: 'journal',
      subproject_id: null,
      note_type: 'journal',
      title: currentPrompt.text || '',
      content: { type: 'doc', content: [] },
      color: 'default',
      is_pinned: false,
      mood: null,
      entry_date: todayStr,
      journal_meta: {
        prompt: currentPrompt.text,
        promptPack: currentPrompt.packId,
        isTinyEntry: isTiny,
      },
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

  const handleSelectEntry = (e, noteId) => {
    setSelectedNoteId(noteId);
    if (e?.currentTarget) {
      e.currentTarget.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6 pb-20 min-w-0 w-full journal-paper-texture">
      
      {/* ===================================================================
          1. HEADER BAND: Espresso (Light) or Deep Warm (Dark)
          Serif Title + Custom Tagline + Lit Candle Icon + Write Today
          =================================================================== */}
      <header
        role="banner"
        aria-label="Journal Sanctuary Header"
        className="rounded-2xl p-5 sm:p-6 text-[var(--journal-header-text)] shadow-md border border-[var(--journal-gold)]/25 transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, var(--journal-header-band) 0%, var(--journal-header-band-end) 100%)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 min-w-0 w-full">
          {/* Left Title & Tagline */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-journal-serif text-3xl sm:text-[34px] font-bold tracking-tight text-[var(--journal-header-text)] leading-tight">
                Journal
              </h1>
              <span className="px-2.5 py-0.5 text-[11px] font-journal-sans font-semibold rounded-full border border-[var(--journal-gold)]/40 text-[var(--journal-gold)] bg-[var(--journal-gold)]/10 uppercase tracking-widest">
                Sanctuary
              </span>
            </div>
            <p className="font-journal-serif italic text-xs sm:text-sm text-[var(--journal-header-muted)] mt-1 tracking-wide">
              A quiet place for your thoughts
            </p>
          </div>

          {/* Right: Lit/Unlit Candle Streak & Write Today Action */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {/* Candle Streak Badge */}
            <div
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium backdrop-blur-xs transition-all ${
                streakStats.isLit
                  ? 'bg-[var(--journal-gold)]/15 border-[var(--journal-gold)]/35 text-[var(--journal-gold)]'
                  : 'bg-black/20 border-white/10 text-[var(--journal-header-muted)]'
              }`}
              title={streakStats.statusText}
            >
              {/* Custom SVG Candle: lit flame when written today */}
              <div className="relative w-4 h-5 flex items-center justify-center shrink-0">
                {streakStats.isLit ? (
                  <span className="candle-flame-lit text-[var(--journal-gold)]" aria-label="Lit Candle">
                    🔥
                  </span>
                ) : (
                  <Flame className="w-4 h-4 text-[var(--journal-header-muted)]/60" aria-label="Unlit Candle" />
                )}
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-xs">
                  {streakStats.currentStreak} {streakStats.currentStreak === 1 ? 'Day Run' : 'Days Run'}
                </span>
                <span className="text-[10px] opacity-75 mt-0.5">
                  {streakStats.monthWritingDays} written this month
                </span>
              </div>
            </div>

            {/* Write Today Button */}
            <button
              type="button"
              onClick={() => handleOpenOrCreateToday(false)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-journal-sans text-xs font-semibold shadow-sm transition-all active:scale-95 hover:opacity-95 text-[var(--journal-btn-primary-fg)] bg-[var(--journal-btn-primary-bg)] hover:bg-[var(--journal-btn-primary-hover)] border border-[var(--journal-gold)]/30"
              aria-label={todayEntry ? "Continue today's entry" : "Write today's entry"}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>{todayEntry ? "Continue Today" : "Write Today"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================================
          2. RESPONSIVE CONTAINER LAYOUT:
             - >=720px: 2 columns (Timeline on Left, Writing Card + Heatmap on Right)
             - <720px: 1 column (Writing Card -> Heatmap -> Timeline -> On This Day)
          =================================================================== */}
      <div className="grid grid-cols-1 @min-[720px]:grid-cols-[minmax(0,1fr)_330px] gap-6 min-w-0 w-full items-start">
        
        {/* ===================================================================
            COLUMN 1: TIMELINE OF JOURNAL ENTRIES (Left on desktop)
            =================================================================== */}
        <section
          aria-label="Journal Entries Timeline"
          className="order-3 @min-[720px]:order-none @min-[720px]:col-start-1 @min-[720px]:row-start-1 @min-[720px]:row-span-3 flex flex-col min-w-0 space-y-5 w-full"
        >
          {/* Timeline Section Header */}
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--journal-text-muted)] px-1">
            <span className="font-journal-sans">Pages of Reflection</span>
            <span className="font-mono text-[11px]">
              {isLoading ? 'Loading...' : `${journalNotes.length} ${journalNotes.length === 1 ? 'entry' : 'entries'}`}
            </span>
          </div>

          {isLoading ? (
            <TimelineSkeleton count={4} />
          ) : journalNotes.length === 0 ? (
            /* Friendly Handcrafted Empty State */
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-[var(--journal-paper-card)] border border-[var(--journal-border)] rounded-2xl min-w-0 shadow-xs">
              {/* Original SVG Candle-and-Book Line Illustration */}
              <div className="w-20 h-20 mb-4 text-[var(--journal-gold)] flex items-center justify-center p-2 rounded-2xl bg-[var(--journal-gold-soft)] border border-[var(--journal-gold)]/20">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-14" aria-hidden="true">
                  {/* Open Book Base */}
                  <path d="M32 46C26 43 14 43 8 46V18C14 15 26 15 32 18M32 46C38 43 50 43 56 46V18C50 15 38 15 32 18M32 46V18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {/* Candle Stick */}
                  <rect x="42" y="24" width="6" height="14" rx="1.5" stroke="currentColor" strokeWidth="2" fill="var(--journal-paper)"/>
                  {/* Candle Wick & Flame */}
                  <path d="M45 24V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M45 15C43.5 17 43 18.5 45 20.5C47 18.5 46.5 17 45 15Z" fill="currentColor"/>
                </svg>
              </div>

              <h2 className="font-journal-serif text-lg font-bold text-[var(--journal-text)]">
                Your first page is waiting
              </h2>
              <p className="font-journal-serif italic text-xs text-[var(--journal-text-muted)] mt-1.5 max-w-sm leading-relaxed">
                A mindful space to capture reflections, track your emotional patterns, and write freely.
              </p>
              <button
                type="button"
                onClick={() => handleOpenOrCreateToday(false)}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold font-journal-sans text-[var(--journal-btn-primary-fg)] bg-[var(--journal-btn-primary-bg)] hover:bg-[var(--journal-btn-primary-hover)] active:scale-95 transition-all shadow-sm border border-[var(--journal-gold)]/30"
              >
                <Plus className="w-4 h-4" />
                <span>Write your first entry</span>
              </button>
            </div>
          ) : (
            /* Month Grouped Timeline */
            <div className="space-y-7 min-w-0 w-full">
              {entriesByMonth.map((group) => (
                <div key={group.heading} className="space-y-3.5 min-w-0">
                  {/* Sticky Month Heading with subtle thin gold divider */}
                  <div className="sticky top-0 z-10 flex items-center gap-3 py-1.5 bg-[var(--journal-bg)]/90 backdrop-blur-xs select-none">
                    <span className="font-journal-serif font-bold text-sm tracking-wide text-[var(--journal-text)]">
                      {group.heading}
                    </span>
                    <div className="flex-1 h-px bg-[var(--journal-gold)]/25" />
                    <span className="text-[11px] font-mono text-[var(--journal-text-muted)]">
                      {group.notes.length}
                    </span>
                  </div>

                  {/* Entry Cards */}
                  <div className="space-y-3 min-w-0 w-full">
                    {group.notes.map((note) => {
                      const isSelected = selectedNoteId === note.id;
                      const moodObj = getMoodConfig(note.mood);
                      const hasSpecificMood = Boolean(note.mood);
                      const preview = extractTextPreview(note.content);
                      const tags = noteTagsMap[note.id] || [];

                      return (
                        <article
                          key={note.id}
                          onClick={(e) => handleSelectEntry(e, note.id)}
                          className={`group relative rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-200 hover:shadow-md min-w-0 border ${
                            isSelected
                              ? 'ring-2 ring-[var(--journal-gold-ring)] shadow-sm'
                              : 'hover:border-[var(--journal-gold)]/40'
                          }`}
                          style={{
                            backgroundColor: 'var(--journal-paper-card)',
                            borderColor: isSelected ? 'var(--journal-gold)' : 'var(--journal-border)',
                          }}
                        >
                          {/* Mood-colored Book Spine on left edge */}
                          <div
                            className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-all group-hover:w-1.5"
                            style={{
                              backgroundColor: hasSpecificMood ? moodObj.dotColor : 'var(--journal-gold)',
                            }}
                            title={hasSpecificMood ? `Mood: ${moodObj.label}` : 'Journal Entry'}
                          />

                          {/* Top Row: Date Chip + Mood Badge + Card Actions */}
                          <div className="flex items-center justify-between gap-2 min-w-0 mb-2 pl-1.5">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              {/* Date chip */}
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium font-journal-sans bg-black/5 dark:bg-white/5 text-[var(--journal-text-muted)] shrink-0 border border-[var(--journal-border-soft)]">
                                <CalendarIcon className="w-3 h-3 opacity-60" />
                                <span>{formatEntryDate(note.entry_date)}</span>
                              </div>

                              {/* Mood Badge */}
                              {hasSpecificMood && (
                                <div
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium font-journal-sans border shrink-0"
                                  style={{
                                    backgroundColor: moodObj.bgVar,
                                    borderColor: moodObj.borderVar,
                                    color: moodObj.textVar,
                                  }}
                                >
                                  <span>{moodObj.emoji}</span>
                                  <span>{moodObj.label}</span>
                                </div>
                              )}

                              {/* Pinned Bookmark Ribbon Indicator */}
                              {note.is_pinned && (
                                <span className="p-0.5 text-[var(--journal-gold)]" title="Pinned to top">
                                  <Pin className="w-3.5 h-3.5 fill-[var(--journal-gold)] transform rotate-45" />
                                </span>
                              )}
                            </div>

                            {/* Card Actions Menu */}
                            <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              {/* Color Picker */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveColorNoteId(activeColorNoteId === note.id ? null : note.id);
                                  }}
                                  title="Change color"
                                  aria-label="Change journal entry tint"
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--journal-text-muted)] hover:text-[var(--journal-text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                >
                                  <Palette className="w-3.5 h-3.5" />
                                </button>

                                {activeColorNoteId === note.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-8 z-30 p-2 bg-[var(--journal-paper)] rounded-xl shadow-xl border border-[var(--journal-border)] flex items-center gap-1.5"
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
                                          showToast({ message: `Card tint changed to ${c.label}` });
                                        }}
                                        title={c.label}
                                        aria-label={`Select ${c.label} tint`}
                                        className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${
                                          (note.color || 'default') === c.id ? 'ring-2 ring-[var(--journal-gold)] ring-offset-1 scale-105' : ''
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
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--journal-text-muted)] hover:text-[var(--journal-text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                title={note.is_pinned ? 'Unpin entry' : 'Pin entry'}
                                aria-label={note.is_pinned ? 'Unpin entry' : 'Pin entry'}
                              >
                                <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'fill-current text-[var(--journal-gold)]' : ''}`} />
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
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--journal-text-muted)] hover:text-[var(--journal-text)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
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
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--journal-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Delete entry"
                                aria-label="Delete journal entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Entry Title (Serif) */}
                          <h3 className="font-journal-serif font-bold text-base sm:text-[17px] text-[var(--journal-text)] tracking-tight truncate pl-1.5 leading-snug">
                            {note.title || 'Untitled reflection'}
                          </h3>

                          {/* 2-line Text Preview */}
                          <p className="font-journal-serif text-xs sm:text-[13px] text-[var(--journal-text-2)] line-clamp-2 leading-relaxed mt-1 pl-1.5">
                            {preview || 'Empty reflection...'}
                          </p>

                          {/* Tags Footer */}
                          {tags.length > 0 && (
                            <div className="mt-3 pt-2.5 flex flex-wrap gap-1 border-t border-[var(--journal-border-soft)] pl-1.5">
                              {tags.map((tag) => (
                                <TagPill key={tag.id} label={tag.label} />
                              ))}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===================================================================
            COLUMN 2: WRITING CARD (Top of page on mobile, right on desktop)
            "What's on your mind?" + Today's Prompt + Shuffle + Start Writing
            =================================================================== */}
        <section
          aria-label="Daily Writing Prompt"
          className="order-1 @min-[720px]:order-none @min-[720px]:col-start-2 @min-[720px]:row-start-1 min-w-0 w-full"
        >
          <div className="bg-[var(--journal-paper-card)] border border-[var(--journal-border)] rounded-2xl p-5 shadow-xs relative min-w-0 flex flex-col justify-between">
            {/* Header: Label + Pack Selector Dropdown */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5 text-[var(--journal-gold)]">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider font-journal-sans text-[var(--journal-accent-text)]">
                  What&apos;s on your mind?
                </span>
              </div>

              {/* Pack Chip Selector */}
              <select
                value={selectedPackId}
                onChange={(e) => handleSelectPack(e.target.value)}
                className="text-[11px] font-journal-sans font-medium bg-black/5 dark:bg-white/5 border border-[var(--journal-border-soft)] rounded-lg px-2 py-1 text-[var(--journal-text-muted)] focus:outline-none cursor-pointer"
                title="Select prompt category pack"
                aria-label="Select prompt category pack"
              >
                <option value="all">All Packs</option>
                {PROMPT_PACKS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Prompt Quote */}
            <blockquote className="font-journal-serif italic text-sm sm:text-base font-medium text-[var(--journal-text)] leading-relaxed my-2.5 pl-3 border-l-2 border-[var(--journal-gold)] break-words">
              &ldquo;{currentPrompt.text}&rdquo;
            </blockquote>

            {/* Bottom Actions: Shuffle + Start Writing / Tiny Entry */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--journal-border-soft)] mt-2">
              <button
                type="button"
                onClick={handleShuffle}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium font-journal-sans text-[var(--journal-text-muted)] hover:text-[var(--journal-text)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="Shuffle to another prompt in this pack"
                aria-label="Shuffle prompt"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Tiny Entry (3 lines) */}
                <button
                  type="button"
                  onClick={() => handleOpenOrCreateToday(true)}
                  className="px-3 py-1.5 text-xs font-medium font-journal-sans rounded-lg border border-[var(--journal-border)] text-[var(--journal-text-2)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  title="Quick 3-line entry with mood"
                >
                  Tiny entry
                </button>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={() => handleOpenOrCreateToday(false)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold font-journal-sans text-[var(--journal-btn-primary-fg)] bg-[var(--journal-btn-primary-bg)] hover:bg-[var(--journal-btn-primary-hover)] active:scale-95 transition-all shadow-2xs border border-[var(--journal-gold)]/30 shrink-0 whitespace-nowrap"
                >
                  {todayEntry ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--journal-gold)]" />
                      <span>Continue today&apos;s entry</span>
                    </>
                  ) : (
                    <>
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Start writing</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            COLUMN 2: MOOD HISTORY COMPACT CARD (7 cols x 5 rows)
            Last 35 days with weekday headers & portal-style safe tooltips
            =================================================================== */}
        <section
          aria-label="Mood History 35-Day Heatmap"
          className="order-2 @min-[720px]:order-none @min-[720px]:col-start-2 @min-[720px]:row-start-2 min-w-0 w-full"
        >
          <div className="bg-[var(--journal-paper-card)] border border-[var(--journal-border)] rounded-2xl p-5 shadow-xs min-w-0">
            {/* Header: Label + Sublabel */}
            <div className="flex items-center justify-between mb-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base" role="img" aria-label="Mood calendar">
                  🕯️
                </span>
                <h2 className="text-xs font-bold font-journal-sans text-[var(--journal-text-muted)] uppercase tracking-wider truncate">
                  Mood History (Last 35 Days)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[var(--journal-text-muted)] shrink-0">
                7×5 grid
              </span>
            </div>

            {/* Heatmap Container */}
            <div className="p-3 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl border border-[var(--journal-border-soft)] min-w-0">
              {/* Weekday Column Letters (Mon - Sun) */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-1.5 text-center text-[10px] font-semibold text-[var(--journal-text-muted)] font-mono select-none">
                <span>M</span>
                <span>T</span>
                <span>W</span>
                <span>T</span>
                <span>F</span>
                <span>S</span>
                <span>S</span>
              </div>

              {/* 35-Day Grid (Square cells with 4px gaps) */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {heatmap.allDays.map((day, dIdx) => {
                  return (
                    <div
                      key={day.date}
                      tabIndex={0}
                      aria-label={`${day.formattedDate}: ${day.mood ? day.mood : day.hasEntry ? 'Entry recorded' : 'No entry'}`}
                      className="relative group/cell aspect-square flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--journal-gold)]"
                    >
                      <div
                        className={`w-full h-full aspect-square rounded-md transition-transform duration-150 hover:scale-110 cursor-pointer flex items-center justify-center ${
                          day.isToday ? 'ring-2 ring-[var(--journal-gold-ring)] ring-offset-1 ring-offset-[var(--journal-paper-card)]' : ''
                        }`}
                        style={{
                          backgroundColor: day.moodConfig
                            ? day.moodConfig.dotColor
                            : day.hasEntry
                            ? 'var(--journal-gold)'
                            : 'rgba(0, 0, 0, 0.05)',
                        }}
                      >
                        {/* Empty day subtle dot indicator */}
                        {!day.hasEntry && (
                          <div className="w-1 h-1 rounded-full bg-[var(--journal-text-muted)]/20" />
                        )}
                      </div>

                      {/* Portal-safe Tooltip (opens downward or upward without covering titles) */}
                      <div
                        role="tooltip"
                        className={`absolute ${
                          dIdx < 14 ? 'top-full mt-2' : 'bottom-full mb-2'
                        } left-1/2 -translate-x-1/2 hidden group-hover/cell:flex group-focus/cell:flex flex-col items-center z-50 pointer-events-none whitespace-nowrap`}
                      >
                        <div
                          className="bg-[var(--journal-paper)] text-[var(--journal-text)] border border-[var(--journal-border)] px-3 py-1.5 rounded-lg shadow-xl text-[11px] leading-tight flex flex-col gap-0.5"
                          style={{ minWidth: '130px' }}
                        >
                          <span className="font-bold text-[var(--journal-text)] font-journal-serif">
                            {day.formattedDate}
                          </span>
                          <span className="text-[var(--journal-text-muted)] font-journal-sans">
                            {day.mood ? `${day.moodConfig.emoji} ${day.mood}` : day.hasEntry ? '📝 Entry recorded' : 'No entry recorded'}
                          </span>
                          {day.entryTitle && (
                            <span className="text-[10px] text-[var(--journal-text-2)] truncate max-w-[150px] italic">
                              &ldquo;{day.entryTitle}&rdquo;
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="flex flex-wrap gap-2.5 mt-3 text-[11px] text-[var(--journal-text-muted)] font-medium font-journal-sans justify-center">
              {Object.values(MOOD_CONFIG).map((m) => (
                <span key={m.id} className="flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-xs inline-block"
                    style={{ backgroundColor: m.dotColor }}
                  />
                  <span>{m.label} {m.emoji}</span>
                </span>
              ))}
            </div>

            {/* Mood of the Week Summary Line */}
            {heatmap.topMoodThisWeek && (
              <div className="mt-3 pt-2.5 border-t border-[var(--journal-border-soft)] text-center text-xs font-journal-serif text-[var(--journal-text-2)]">
                <span>Mood of the week: </span>
                <span className="font-bold text-[var(--journal-text)]">
                  {heatmap.topMoodThisWeek.emoji} {heatmap.topMoodThisWeek.label}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ===================================================================
            COLUMN 2: ON THIS DAY CARD
            Past memories from previous years on this local month/day
            =================================================================== */}
        <section
          aria-label="On This Day Memories"
          className="order-4 @min-[720px]:order-none @min-[720px]:col-start-2 @min-[720px]:row-start-3 min-w-0 w-full"
        >
          <div className="bg-[var(--journal-paper-card)] border border-[var(--journal-border)] rounded-2xl p-5 shadow-xs min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[var(--journal-gold)] shrink-0" />
              <h2 className="text-xs font-bold font-journal-sans text-[var(--journal-text-muted)] uppercase tracking-wider">
                On This Day
              </h2>
            </div>

            {onThisDay.length === 0 ? (
              <p className="text-xs font-journal-serif italic text-[var(--journal-text-muted)] leading-relaxed">
                No past memories recorded on this date from previous years yet.
              </p>
            ) : (
              <div className="space-y-2">
                {onThisDay.map((note) => (
                  <div
                    key={note.id}
                    onClick={(e) => handleSelectEntry(e, note.id)}
                    className="p-3 bg-[var(--journal-paper)] border border-[var(--journal-border-soft)] rounded-xl cursor-pointer hover:border-[var(--journal-gold)] transition-colors"
                  >
                    <div className="text-[10px] font-mono text-[var(--journal-text-muted)] mb-0.5">
                      {note.entry_date?.substring(0, 4)}
                    </div>
                    <div className="font-journal-serif font-semibold text-xs text-[var(--journal-text)] truncate">
                      {note.title || 'Untitled reflection'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
