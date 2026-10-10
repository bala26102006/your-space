import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Tag as TagIcon, 
  Smile, 
  Plus, 
  Clock 
} from 'lucide-react';
import { db } from '../../lib/db';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useDebouncedSave } from '../../hooks/useDebouncedSave';
import TipTapEditor from '../editor/TipTapEditor';
import TagPill from '../shared/TagPill';
import NoteModal from '../shared/NoteModal';
import { generateUUID } from '../../lib/uuid';
import { isJournalEntryEmpty } from '../../lib/services/journalService';

const MOODS = [
  { id: 'Calm', label: 'Calm', emoji: '😌', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' },
  { id: 'Restless', label: 'Restless', emoji: '🏃', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
  { id: 'Grateful', label: 'Grateful', emoji: '🙏', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
  { id: 'Tired', label: 'Tired', emoji: '😴', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)' },
];

export default function JournalEditor({ note, onClose }) {
  const { saveStatus, triggerSave } = useDebouncedSave(1000);

  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || { type: 'doc', content: [] });
  const [mood, setMood] = useState(note?.mood || null);
  const [isPinned, setIsPinned] = useState(note?.is_pinned || false);
  const [entryDate, setEntryDate] = useState(note?.entry_date || new Date().toISOString().split('T')[0]);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Latest state ref for unmount cleanup
  const latestStateRef = useRef({ title, content, id: note?.id });
  useEffect(() => {
    latestStateRef.current = { title, content, id: note?.id };
  }, [title, content, note?.id]);

  // Sync state when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || { type: 'doc', content: [] });
      setMood(note.mood || null);
      setIsPinned(note.is_pinned || false);
      setEntryDate(note.entry_date || new Date().toISOString().split('T')[0]);
    }
  }, [note?.id]);

  // Fetch tags for this note
  const allTags = useLiveQuery(() => db.tags.toArray(), []) || [];
  const noteTags = useLiveQuery(async () => {
    if (!note?.id) return [];
    const relations = await db.note_tags.where('note_id').equals(note.id).toArray();
    const tagIds = relations.map(r => r.tag_id);
    return await db.tags.where('id').anyOf(tagIds).toArray();
  }, [note?.id]) || [];

  // Calculate live word count & reading time
  const { wordCount, readingTime } = useMemo(() => {
    const extractText = (node) => {
      if (!node) return '';
      if (typeof node === 'string') return node;
      if (node.text) return node.text;
      if (Array.isArray(node.content)) {
        return node.content.map(extractText).join(' ');
      }
      return '';
    };

    const rawText = extractText(content).trim();
    if (!rawText) return { wordCount: 0, readingTime: 1 };
    const words = rawText.split(/\s+/).filter(Boolean).length;
    const readMinutes = Math.max(1, Math.ceil(words / 200));
    return { wordCount: words, readingTime: readMinutes };
  }, [content]);

  // Handlers
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    triggerSave(async () => {
      await db.notes.update(note.id, {
        title: val,
        updated_at: new Date().toISOString(),
      });
    });
  };

  const handleEditorChange = ({ json }) => {
    setContent(json);
    triggerSave(async () => {
      await db.notes.update(note.id, {
        content: json,
        updated_at: new Date().toISOString(),
      });
    });
  };

  const handleMoodSelect = async (selectedMood) => {
    const newMood = mood === selectedMood ? null : selectedMood;
    setMood(newMood);
    await db.notes.update(note.id, {
      mood: newMood,
      updated_at: new Date().toISOString(),
    });
  };

  const handlePinToggle = async () => {
    const nextPin = !isPinned;
    setIsPinned(nextPin);
    await db.notes.update(note.id, {
      is_pinned: nextPin,
      updated_at: new Date().toISOString(),
    });
  };

  const handleArchive = async () => {
    await db.notes.update(note.id, {
      is_archived: true,
      updated_at: new Date().toISOString(),
    });
    if (onClose) onClose();
  };

  const handleDelete = async () => {
    await db.notes.update(note.id, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (onClose) onClose();
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    const cleanLabel = newTagInput.trim().replace(/^#/, '');
    if (!cleanLabel) return;

    let tag = await db.tags.where('label').equals(cleanLabel).first();
    if (!tag) {
      const tagId = generateUUID();
      tag = { id: tagId, label: cleanLabel, color: '#5F6368', created_at: new Date().toISOString() };
      await db.tags.add(tag);
    }

    const exists = await db.note_tags.where({ note_id: note.id, tag_id: tag.id }).first();
    if (!exists) {
      await db.note_tags.add({
        id: generateUUID(),
        note_id: note.id,
        tag_id: tag.id,
      });
    }

    setNewTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = async (tagId) => {
    await db.note_tags.where({ note_id: note.id, tag_id: tagId }).delete();
  };

  // Close handler with empty entry auto-delete
  const handleClose = async () => {
    const { title: curTitle, content: curContent, id } = latestStateRef.current;
    if (id && isJournalEntryEmpty({ title: curTitle, content: curContent })) {
      try {
        await db.note_tags.where('note_id').equals(id).delete();
        await db.notes.delete(id);
      } catch (err) {
        console.warn('Auto-delete empty journal entry failed:', err);
      }
    }
    if (onClose) onClose();
  };

  const activeMoodObj = MOODS.find(m => m.id === mood);

  return (
    <NoteModal
      isOpen={true}
      onClose={handleClose}
      saveStatus={saveStatus}
      isPinned={isPinned}
      onPinToggle={handlePinToggle}
      isArchived={note?.is_archived}
      onArchive={handleArchive}
      onDelete={handleDelete}
      isExpanded={isExpanded}
      onToggleExpand={() => setIsExpanded(!isExpanded)}
      contentClassName="p-0"
      footer={
        <div className="px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
          {/* Word count & Reading Time */}
          <div className="flex items-center gap-3">
            <span className="font-medium text-text-primary">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 opacity-60" />
              <span>{readingTime} min read</span>
            </span>
            {activeMoodObj && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 font-medium" style={{ color: activeMoodObj.color }}>
                  <span>{activeMoodObj.emoji}</span>
                  <span>{activeMoodObj.label}</span>
                </span>
              </>
            )}
          </div>

          {/* Tags bar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {noteTags.map((t) => (
              <TagPill
                key={t.id}
                label={t.label}
                onRemove={() => handleRemoveTag(t.id)}
              />
            ))}

            {showTagInput ? (
              <form onSubmit={handleAddTag} className="flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="tag name..."
                  className="w-20 px-2 py-0.5 text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-full outline-none text-text-primary"
                />
                <button
                  type="submit"
                  className="p-1 rounded-full text-[var(--workspace-accent)] hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowTagInput(false)}
                  className="p-1 rounded-full text-text-muted hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X className="w-3 h-3" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowTagInput(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-black/15 dark:border-white/15 text-[11px] text-text-muted hover:text-text-primary hover:border-black/30 transition-colors"
              >
                <TagIcon className="w-2.5 h-2.5" />
                <span>+ Tag</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* Mood Selector & Date Banner */}
      <div className="px-6 py-3.5 bg-bg-sidebar/50 border-b border-black/5 dark:border-white/5 shrink-0 flex flex-wrap items-center justify-between gap-3">
        {/* Mood Selector Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mr-1 flex items-center gap-1">
            <Smile className="w-3.5 h-3.5 text-rose-500" />
            Mood:
          </span>
          {MOODS.map((m) => {
            const isSelected = mood === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleMoodSelect(m.id)}
                style={
                  isSelected
                    ? {
                        backgroundColor: m.bg,
                        borderColor: m.border,
                        color: m.color,
                      }
                    : undefined
                }
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  isSelected
                    ? 'shadow-xs font-semibold'
                    : 'bg-card-default border-black/5 dark:border-white/10 text-text-muted hover:text-text-primary hover:border-black/20'
                }`}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Display */}
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <CalendarIcon className="w-3.5 h-3.5 opacity-60" />
          <span>{entryDate}</span>
        </div>
      </div>

      {/* Main Journal Canvas (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col min-w-0">
        {/* Entry Title Input */}
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Journal Entry Title..."
          className="w-full text-xl sm:text-2xl font-bold tracking-tight bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted/50 mb-4 shrink-0"
        />

        {/* TipTap Rich Text Canvas */}
        <div className="flex-1 min-h-[300px]">
          <TipTapEditor
            content={content}
            onChange={handleEditorChange}
            placeholder="Write your thoughts, reflections, or moments of gratitude..."
          />
        </div>
      </div>
    </NoteModal>
  );
}
