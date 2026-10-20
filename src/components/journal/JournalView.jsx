import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronDown,
  MoreHorizontal,
  Sparkle,
  CheckSquare,
  Square,
  X,
  AlertTriangle
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
  ALL_PACK_PROMPTS,
} from '../../lib/journal/journalUtils';

export default function JournalView() {
  const { 
    setSelectedNoteId, 
    selectedNoteId, 
    viewMode = 'grid', 
    sortOrder = 'desc', 
    sortBy = 'date' 
  } = useUIStore();
  const { openSoftDelete } = useConfirmStore();
  const { showToast } = useToastStore();

  const [activeColorNoteId, setActiveColorNoteId] = useState(null);
  const [selectedPackId, setSelectedPackId] = useState('all');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [selectedEmptyIds, setSelectedEmptyIds] = useState(new Set());
  const moreMenuRef = useRef(null);

  const todayStr = useMemo(() => getTodayLocalDateStr(), []);

  // Shared deterministic daily prompt initialized for today
  const [currentPrompt, setCurrentPrompt] = useState(() => getDailyPrompt('all', new Date()));

  // Live Query: Fetch all journal notes
  const rawJournalNotes = useLiveQuery(async () => {
    return await db.notes.where('workspace_id').equals('journal').toArray();
  }, []);

  const journalNotes = useMemo(() => {
    return (rawJournalNotes || []).filter((n) => !n.is_archived && !n.is_deleted);
  }, [rawJournalNotes]);

  const isLoading = rawJournalNotes === undefined;

  // Sorted Journal Notes according to top-bar sortOrder and sortBy
  const sortedNotes = useMemo(() => {
    const list = [...journalNotes];
    if (sortBy === 'title') {
      return list.sort((a, b) => {
        const titleA = (a.title || 'Untitled reflection').toLowerCase();
        const titleB = (b.title || 'Untitled reflection').toLowerCase();
        const cmp = titleA.localeCompare(titleB);
        return sortOrder === 'desc' ? -cmp : cmp;
      });
    }
    // Date sort (default)
    return list.sort((a, b) => {
      const dateA = a.entry_date || a.created_at || '';
      const dateB = b.entry_date || b.created_at || '';
      return sortOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    });
  }, [journalNotes, sortBy, sortOrder]);

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

  // Group timeline entries by Month (unless sorting by title)
  const isFlatList = sortBy === 'title';

  const entriesByMonth = useMemo(() => {
    if (isFlatList) return [];
    const groups = [];
    let currentHeading = null;
    let currentList = [];

    sortedNotes.forEach((note) => {
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
  }, [sortedNotes, isFlatList]);

  // Scan for empty entries: no mood, no written content, generic/empty title
  const emptyCandidates = useMemo(() => {
    return journalNotes.filter((note) => {
      // Must not have a mood
      if (note.mood) return false;
      const preview = extractTextPreview(note.content).trim();
      // Must not have written content beyond prompt quote
      if (preview && !ALL_PACK_PROMPTS.some((p) => preview === p || preview === `"${p}"` || preview === `“${p}”`)) {
        return false;
      }
      // Must have default/empty title
      const title = (note.title || '').trim();
      const isDefault =
        !title ||
        title === 'Untitled' ||
        title === 'Journal Entry' ||
        title === 'Daily Reflection' ||
        title === 'Untitled reflection' ||
        ALL_PACK_PROMPTS.includes(title);
      return isDefault;
    });
  }, [journalNotes]);

  // Helper for word count
  const getWordCount = (content) => {
    const text = extractTextPreview(content).trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  };

  // Open cleanup modal
  const handleOpenCleanupModal = () => {
    setShowMoreMenu(false);
    setSelectedEmptyIds(new Set(emptyCandidates.map((n) => n.id)));
    setShowCleanupModal(true);
  };

  const handleToggleSelectCandidate = (id) => {
    setSelectedEmptyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllCandidates = () => {
    if (selectedEmptyIds.size === emptyCandidates.length) {
      setSelectedEmptyIds(new Set());
    } else {
      setSelectedEmptyIds(new Set(emptyCandidates.map((n) => n.id)));
    }
  };

  const handleExecuteCleanup = async () => {
    const idsToTrash = Array.from(selectedEmptyIds);
    if (idsToTrash.length === 0) {
      setShowCleanupModal(false);
      return;
    }

    const now = new Date().toISOString();
    for (const id of idsToTrash) {
      await db.notes.update(id, {
        is_deleted: true,
        deleted_at: now,
      });
    }

    setShowCleanupModal(false);
    showToast({
      message: `Moved ${idsToTrash.length} empty ${idsToTrash.length === 1 ? 'entry' : 'entries'} to Trash`,
      action: {
        label: 'Undo',
        onClick: async () => {
          for (const id of idsToTrash) {
            await db.notes.update(id, {
              is_deleted: false,
              deleted_at: null,
            });
          }
          showToast({ message: 'Restored cleaned entries' });
        },
      },
    });
  };

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
      const scroller = e.currentTarget.closest('.pane-scroller');
      if (scroller) {
        const cardRect = e.currentTarget.getBoundingClientRect();
        const scrollerRect = scroller.getBoundingClientRect();
        if (cardRect.top < scrollerRect.top) {
          scroller.scrollTop -= (scrollerRect.top - cardRect.top + 16);
        } else if (cardRect.bottom > scrollerRect.bottom) {
          scroller.scrollTop += (cardRect.bottom - scrollerRect.bottom + 16);
        }
      }
    }
  };

  // Render individual entry card based on viewMode ('grid' = PAGES, 'list' = CONTENTS)
  const renderCard = (note) => {
    const isSelected = selectedNoteId === note.id;
    const moodObj = getMoodConfig(note.mood);
    const hasSpecificMood = Boolean(note.mood);
    const preview = extractTextPreview(note.content);
    const wordCount = getWordCount(note.content);
    const tags = noteTagsMap[note.id] || [];

    if (viewMode === 'list') {
      return (
        <article
          key={note.id}
          tabIndex={0}
          onClick={(e) => handleSelectEntry(e, note.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSelectEntry(e, note.id);
          }}
          className={`group relative min-h-[56px] sm:min-h-[60px] flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border bg-[var(--journal-paper-card)] border-[var(--journal-border)] hover:border-[var(--journal-gold)]/50 transition-all duration-150 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--journal-gold)] ${
            isSelected ? 'ring-2 ring-[var(--journal-gold-ring)] shadow-xs' : 'hover:shadow-xs'
          }`}
        >
          {/* Mood-colored mini book spine */}
          <div
            className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
            style={{
              backgroundColor: hasSpecificMood ? moodObj.dotColor : 'var(--journal-gold)',
            }}
            title={hasSpecificMood ? `Mood: ${moodObj.label}` : 'Journal Entry'}
          />

          {/* Left: Date + Title + 1-line preview */}
          <div className="flex items-center gap-3 min-w-0 flex-1 pl-1.5">
            <div className="text-[11px] font-mono text-[var(--journal-text-muted)] shrink-0 w-20 sm:w-24">
              {formatEntryDate(note.entry_date)}
            </div>

            <div className="font-journal-serif font-bold text-xs sm:text-sm text-[var(--journal-text)] truncate max-w-[160px] sm:max-w-[240px] shrink-0">
              {note.title || 'Untitled reflection'}
            </div>

            <div className="text-xs font-journal-serif text-[var(--journal-text-2)] truncate flex-1 min-w-0 hidden md:block italic">
              {preview || '(Blank page)'}
            </div>
          </div>

          {/* Right: Mood Chip + Word count + Tags + Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {hasSpecificMood && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-journal-sans border shrink-0"
                style={{
                  backgroundColor: moodObj.bgVar,
                  borderColor: moodObj.borderVar,
                  color: moodObj.textVar,
                }}
              >
                <span>{moodObj.emoji}</span>
                <span className="hidden sm:inline">{moodObj.label}</span>
              </span>
            )}

            <span className="text-[11px] font-mono text-[var(--journal-text-muted)] shrink-0 hidden sm:inline">
              {wordCount}w
            </span>

            {tags.length > 0 && (
              <div className="hidden lg:flex items-center gap-1 shrink-0">
                {tags.slice(0, 2).map((tag) => (
                  <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[var(--journal-text-muted)]">
                    #{tag.label}
                  </span>
                ))}
              </div>
            )}

            {note.is_pinned && (
              <Pin className="w-3.5 h-3.5 fill-[var(--journal-gold)] text-[var(--journal-gold)] transform rotate-45 shrink-0" />
            )}

            {/* Quick Actions */}
            <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center gap-0.5">
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  const nextPin = !note.is_pinned;
                  await db.notes.update(note.id, { is_pinned: nextPin, updated_at: new Date().toISOString() });
                  showToast({ message: nextPin ? 'Pinned entry' : 'Unpinned entry' });
                }}
                className="p-1 rounded text-[var(--journal-text-muted)] hover:text-[var(--journal-text)] hover:bg-black/5 dark:hover:bg-white/10"
                title={note.is_pinned ? 'Unpin' : 'Pin'}
              >
                <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'fill-current text-[var(--journal-gold)]' : ''}`} />
              </button>

              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  await archiveItem({ id: note.id, type: 'note', title: note.title || 'Journal Entry', workspace: 'journal' });
                  if (selectedNoteId === note.id) setSelectedNoteId(null);
                  showToast({ message: 'Archived entry' });
                }}
                className="p-1 rounded text-[var(--journal-text-muted)] hover:text-[var(--journal-text)] hover:bg-black/5 dark:hover:bg-white/10"
                title="Archive"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openSoftDelete({
                    title: note.title || 'Journal Entry',
                    count: 1,
                    onConfirm: async () => {
                      await softDeleteItem({ id: note.id, type: 'note', title: note.title || 'Journal Entry', workspace: 'journal' });
                      if (selectedNoteId === note.id) setSelectedNoteId(null);
                      showToast({ message: 'Moved entry to Trash' });
                    },
                  });
                }}
                className="p-1 rounded text-[var(--journal-text-muted)] hover:text-red-500 hover:bg-red-500/10"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </article>
      );
    }

    // Grid View ("PAGES"): Portrait paper card with folded corner and ruled lines preview
    return (
      <article
        key={note.id}
        tabIndex={0}
        onClick={(e) => handleSelectEntry(e, note.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSelectEntry(e, note.id);
        }}
        className={`group relative rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md min-w-0 border journal-folded-corner aspect-[4/5] min-h-[285px] max-h-[340px] flex flex-col justify-between motion-reduce:transition-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--journal-gold)] ${
          isSelected
            ? 'ring-2 ring-[var(--journal-gold-ring)] shadow-sm'
            : 'hover:border-[var(--journal-gold)]/50'
        }`}
        style={{
          backgroundColor: 'var(--journal-paper-card)',
          borderColor: isSelected ? 'var(--journal-gold)' : 'var(--journal-border)',
        }}
      >
        {/* Mood-colored Book Spine on left edge */}
        <div
          className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-md transition-all group-hover:w-2"
          style={{
            backgroundColor: hasSpecificMood ? moodObj.dotColor : 'var(--journal-gold)',
          }}
          title={hasSpecificMood ? `Mood: ${moodObj.label}` : 'Journal Entry'}
        />

        {/* Top: Date Chip + Pin + Actions */}
        <div>
          <div className="flex items-center justify-between gap-1.5 min-w-0 mb-2 pl-2">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-journal-sans bg-black/5 dark:bg-white/5 text-[var(--journal-text-muted)] shrink-0 border border-[var(--journal-border-soft)]">
                <CalendarIcon className="w-2.5 h-2.5 opacity-60" />
                <span>{formatEntryDate(note.entry_date)}</span>
              </div>

              {note.is_pinned && (
                <span className="p-0.5 text-[var(--journal-gold)]" title="Pinned to top">
                  <Pin className="w-3 h-3 fill-[var(--journal-gold)] transform rotate-45" />
                </span>
              )}
            </div>

            {/* Card Actions (Visible on hover/focus) */}
            <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center gap-0.5">
              {/* Color Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveColorNoteId(activeColorNoteId === note.id ? null : note.id);
                  }}
                  title="Card tint"
                  className="w-6 h-6 flex items-center justify-center rounded text-[var(--journal-text-muted)] hover:text-[var(--journal-text)] hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <Palette className="w-3 h-3" />
                </button>

                {activeColorNoteId === note.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-7 z-30 p-1.5 bg-[var(--journal-paper)] rounded-xl shadow-xl border border-[var(--journal-border)] flex items-center gap-1"
                  >
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await db.notes.update(note.id, { color: c.id, updated_at: new Date().toISOString() });
                          setActiveColorNoteId(null);
                          showToast({ message: `Tint changed to ${c.label}` });
                        }}
                        title={c.label}
                        className={`w-4 h-4 rounded-full border transition-transform hover:scale-110 ${
                          (note.color || 'default') === c.id ? 'ring-2 ring-[var(--journal-gold)] scale-105' : ''
                        }`}
                        style={{ backgroundColor: c.border }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  const nextPin = !note.is_pinned;
                  await db.notes.update(note.id, { is_pinned: nextPin, updated_at: new Date().toISOString() });
                  showToast({ message: nextPin ? 'Pinned entry' : 'Unpinned entry' });
                }}
                className="w-6 h-6 flex items-center justify-center rounded text-[var(--journal-text-muted)] hover:text-[var(--journal-text)] hover:bg-black/5 dark:hover:bg-white/10"
                title={note.is_pinned ? 'Unpin' : 'Pin'}
              >
                <Pin className={`w-3 h-3 ${note.is_pinned ? 'fill-current text-[var(--journal-gold)]' : ''}`} />
              </button>

              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  await archiveItem({ id: note.id, type: 'note', title: note.title || 'Journal Entry', workspace: 'journal' });
                  if (selectedNoteId === note.id) setSelectedNoteId(null);
                  showToast({ message: 'Archived entry' });
                }}
                className="w-6 h-6 flex items-center justify-center rounded text-[var(--journal-text-muted)] hover:text-[var(--journal-text)] hover:bg-black/5 dark:hover:bg-white/10"
                title="Archive"
              >
                <Archive className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openSoftDelete({
                    title: note.title || 'Journal Entry',
                    count: 1,
                    onConfirm: async () => {
                      await softDeleteItem({ id: note.id, type: 'note', title: note.title || 'Journal Entry', workspace: 'journal' });
                      if (selectedNoteId === note.id) setSelectedNoteId(null);
                      showToast({ message: 'Moved entry to Trash' });
                    },
                  });
                }}
                className="w-6 h-6 flex items-center justify-center rounded text-[var(--journal-text-muted)] hover:text-red-500 hover:bg-red-500/10"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Title: clamped 2 lines */}
          <h3 className="font-journal-serif font-bold text-sm text-[var(--journal-text)] tracking-tight line-clamp-2 leading-snug pl-2 mb-1.5">
            {note.title || 'Untitled reflection'}
          </h3>

          {/* Ruled lines text preview: clamped 6 lines */}
          <div className="journal-ruled-preview pl-2 pr-1 text-xs font-journal-serif text-[var(--journal-text-2)] line-clamp-6 leading-[20px] min-h-[75px]">
            {preview ? (
              <span>{preview}</span>
            ) : (
              <span className="text-[var(--journal-text-muted)]/70 italic text-[11px] pt-1 block">
                Blank page
              </span>
            )}
          </div>
        </div>

        {/* Card Footer: Mood Badge + Word Count + Tags */}
        <div className="pt-2 border-t border-[var(--journal-border-soft)] pl-2 flex flex-col gap-1.5 mt-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--journal-text-muted)]">
            {hasSpecificMood ? (
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-journal-sans border"
                style={{
                  backgroundColor: moodObj.bgVar,
                  borderColor: moodObj.borderVar,
                  color: moodObj.textVar,
                }}
              >
                <span>{moodObj.emoji}</span>
                <span>{moodObj.label}</span>
              </span>
            ) : (
              <span className="opacity-60 italic font-journal-sans">No mood set</span>
            )}

            <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[var(--journal-text-muted)]">
                  #{tag.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    );
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

            {/* More Menu (Clean up empty entries, etc.) */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="w-9 h-9 flex items-center justify-center rounded-xl font-journal-sans text-xs font-semibold shadow-2xs transition-all active:scale-95 bg-black/20 hover:bg-black/30 border border-white/10 text-[var(--journal-header-text)]"
                title="More journal options"
                aria-label="More journal options"
                aria-expanded={showMoreMenu}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 top-11 z-40 w-56 bg-[var(--journal-paper-card)] border border-[var(--journal-border)] rounded-xl shadow-xl overflow-hidden py-1 text-xs font-journal-sans animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={handleOpenCleanupModal}
                      className="w-full text-left px-3.5 py-2.5 flex items-center justify-between text-[var(--journal-text)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkle className="w-3.5 h-3.5 text-[var(--journal-gold)]" />
                        <span>Clean up empty entries</span>
                      </div>
                      {emptyCandidates.length > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--journal-gold)]/15 text-[var(--journal-gold)] border border-[var(--journal-gold)]/30 font-bold">
                          {emptyCandidates.length}
                        </span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
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
          ) : isFlatList ? (
            /* Flat Alphabetical Timeline when sorting by Title */
            <div className="space-y-4 min-w-0 w-full">
              <div className="sticky top-0 z-10 px-4 py-2.5 rounded-xl bg-[var(--journal-bg)] border-b border-[var(--journal-border)] flex items-center justify-between select-none shadow-2xs">
                <span className="font-journal-serif font-bold text-sm sm:text-base tracking-wide text-[var(--journal-text)]">
                  All Reflections (Title A–Z)
                </span>
                <span className="text-[11px] font-mono text-[var(--journal-text-muted)] bg-black/5 dark:bg-white/5 px-2.5 py-0.5 rounded-full border border-[var(--journal-border-soft)]">
                  {sortedNotes.length} {sortedNotes.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              <div className={viewMode === 'list' ? 'flex flex-col gap-2.5' : 'grid grid-cols-1 @min-[480px]:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4'}>
                {sortedNotes.map((note) => renderCard(note))}
              </div>
            </div>
          ) : (
            /* Month Grouped Timeline */
            <div className="space-y-7 min-w-0 w-full">
              {entriesByMonth.map((group) => (
                <div key={group.heading} className="space-y-3 min-w-0">
                  {/* Sticky Month Heading: Opaque, in normal flow, cards scroll cleanly underneath */}
                  <div className="sticky top-0 z-10 px-4 py-2.5 rounded-xl bg-[var(--journal-bg)] border-b border-[var(--journal-border)] flex items-center justify-between select-none shadow-2xs">
                    <span className="font-journal-serif font-bold text-sm sm:text-base tracking-wide text-[var(--journal-text)]">
                      {group.heading}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--journal-text-muted)] bg-black/5 dark:bg-white/5 px-2.5 py-0.5 rounded-full border border-[var(--journal-border-soft)]">
                      {group.notes.length} {group.notes.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>

                  {/* Entry Cards (Grid or List) */}
                  <div className={viewMode === 'list' ? 'flex flex-col gap-2.5' : 'grid grid-cols-1 @min-[480px]:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4'}>
                    {group.notes.map((note) => renderCard(note))}
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

      {/* ===================================================================
          CLEAN UP EMPTY ENTRIES MODAL (Manual user confirmation only)
          =================================================================== */}
      {showCleanupModal && typeof document !== 'undefined' && createPortal(
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Clean up empty journal entries"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowCleanupModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[var(--journal-paper-card)] border border-[var(--journal-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--journal-border-soft)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--journal-gold-soft)] text-[var(--journal-gold)] flex items-center justify-center shrink-0 border border-[var(--journal-gold)]/20">
                  <Sparkle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-journal-serif font-bold text-base text-[var(--journal-text)]">
                    Clean Up Empty Entries
                  </h3>
                  <p className="font-journal-sans text-xs text-[var(--journal-text-muted)] mt-0.5">
                    Review and remove blank placeholder entries
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCleanupModal(false)}
                className="p-1 rounded-lg text-[var(--journal-text-muted)] hover:text-[var(--journal-text)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4 font-journal-sans text-xs">
              {emptyCandidates.length === 0 ? (
                <div className="py-8 text-center text-[var(--journal-text-muted)]">
                  <CheckCircle2 className="w-10 h-10 text-[var(--journal-gold)] mx-auto mb-2 opacity-80" />
                  <p className="font-journal-serif text-sm font-semibold text-[var(--journal-text)]">
                    Your journal is clean
                  </p>
                  <p className="text-xs mt-1">
                    No empty entries found. All entries have written reflections or mood ratings.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-[var(--journal-border-soft)]">
                    <p className="text-[var(--journal-text-2)] leading-relaxed">
                      Found <strong className="text-[var(--journal-text)]">{emptyCandidates.length}</strong> empty {emptyCandidates.length === 1 ? 'entry' : 'entries'} with no mood and no written text. Select the ones you want to move to Trash:
                    </p>
                    <button
                      type="button"
                      onClick={handleSelectAllCandidates}
                      className="px-2.5 py-1 text-xs font-semibold text-[var(--journal-accent-text)] hover:underline shrink-0"
                    >
                      {selectedEmptyIds.size === emptyCandidates.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {emptyCandidates.map((entry) => {
                      const isChecked = selectedEmptyIds.has(entry.id);
                      return (
                        <div
                          key={entry.id}
                          onClick={() => handleToggleSelectCandidate(entry.id)}
                          className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-[var(--journal-gold-soft)] border-[var(--journal-gold)]/40'
                              : 'bg-black/5 dark:bg-white/5 border-[var(--journal-border-soft)] opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-[var(--journal-gold)] shrink-0">
                              {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-[var(--journal-text-muted)]" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-journal-serif font-bold text-xs text-[var(--journal-text)] truncate">
                                {entry.title || 'Untitled reflection'}
                              </div>
                              <div className="text-[11px] text-[var(--journal-text-muted)] mt-0.5">
                                {formatEntryDate(entry.entry_date)} · <span className="italic">Blank page</span>
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono text-[var(--journal-text-muted)] shrink-0">
                            0 words
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-[var(--journal-text-muted)] italic">
                    Note: Entries moved to Trash can still be restored within 7 days from the Trash workspace.
                  </p>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--journal-border-soft)] bg-black/5 dark:bg-white/5 flex items-center justify-end gap-2.5 font-journal-sans text-xs">
              <button
                type="button"
                onClick={() => setShowCleanupModal(false)}
                className="px-4 py-2 rounded-xl text-[var(--journal-text-2)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium"
              >
                Cancel
              </button>

              {emptyCandidates.length > 0 && (
                <button
                  type="button"
                  disabled={selectedEmptyIds.size === 0}
                  onClick={handleExecuteCleanup}
                  className="px-4 py-2 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    Move {selectedEmptyIds.size} {selectedEmptyIds.size === 1 ? 'entry' : 'entries'} to Trash
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
