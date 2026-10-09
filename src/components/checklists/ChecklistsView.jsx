import React, { useState, useMemo } from 'react';
import { Folder, FileCheck, Plus, ChevronRight, CheckSquare, MoreVertical, Archive, Trash2 } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import NoteCard from '../cards/NoteCard';
import { STARTER_KITS } from '../../lib/starterKits';
import { generateUUID } from '../../lib/uuid';
import { GridSkeleton } from '../shared/SkeletonLoader';
import { softDeleteItem, archiveItem } from '../../lib/services/trashService';
import { useConfirmStore } from '../../store/confirmStore';

export default function ChecklistsView() {
  const { openSoftDelete } = useConfirmStore();
  const {
    selectedChecklistCategory,
    setSelectedChecklistCategory,
    selectedNoteId,
    setSelectedNoteId,
    searchQuery,
    activeTagId
  } = useUIStore();

  const [newFolderInput, setNewFolderInput] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Fetch all checklists
  const rawChecklists = useLiveQuery(async () => {
    const all = await db.notes.where('workspace_id').equals('checklists').toArray();
    return all
      .filter(n => !n.is_archived && !n.is_deleted)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, []);
  const checklists = rawChecklists || [];
  const isLoading = rawChecklists === undefined;

  // Get tags
  const allTags = useLiveQuery(() => db.tags.toArray(), []) || [];
  const allNoteTags = useLiveQuery(() => db.note_tags.toArray(), []) || [];
  
  const tagMap = useMemo(() => {
    const map = {};
    allTags.forEach((t) => (map[t.id] = t));
    return map;
  }, [allTags]);
  
  const noteTagsMap = useMemo(() => {
    const map = {};
    allNoteTags.forEach((nt) => {
      if (!map[nt.note_id]) map[nt.note_id] = [];
      if (tagMap[nt.tag_id]) map[nt.note_id].push(tagMap[nt.tag_id]);
    });
    return map;
  }, [allNoteTags, tagMap]);

  // Extract unique categories (Folders)
  const folders = useMemo(() => {
    const cats = new Set();
    checklists.forEach(c => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats).sort();
  }, [checklists]);

  const handleCreateChecklist = async (categoryName) => {
    const newId = generateUUID();
    const newNote = {
      id: newId,
      user_id: 'local_user',
      workspace_id: 'checklists',
      subproject_id: null,
      note_type: 'plain',
      title: '',
      category: categoryName || 'Uncategorized',
      content: { isTemplate: false, items: [] },
      color: 'default',
      is_pinned: false,
      mood: null,
      entry_date: new Date().toISOString().split('T')[0],
      is_archived: false,
      is_deleted: false,
      deleted_at: null,
      sort_order: Date.now(),
      synced_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.notes.add(newNote);
    setSelectedNoteId(newId);
    if (categoryName) {
      setSelectedChecklistCategory(categoryName);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderInput.trim()) return;
    // Creating a folder means creating an empty checklist inside it so the category persists
    await handleCreateChecklist(newFolderInput.trim());
    setNewFolderInput('');
    setIsCreatingFolder(false);
  };

  // Archive / Delete handlers for the Grid
  const handleArchiveNote = async (noteId) => {
    const note = await db.notes.get(noteId);
    await archiveItem({
      id: noteId,
      type: 'note',
      title: note?.title || 'Untitled checklist',
      workspace: 'checklists',
    });
    if (selectedNoteId === noteId) setSelectedNoteId(null);
  };

  const handleDeleteNote = async (noteId) => {
    const note = await db.notes.get(noteId);
    openSoftDelete({
      title: note?.title || 'Untitled checklist',
      onConfirm: async () => {
        await softDeleteItem({
          id: noteId,
          type: 'note',
          title: note?.title || 'Untitled checklist',
          workspace: 'checklists',
        });
        if (selectedNoteId === noteId) setSelectedNoteId(null);
      },
    });
  };

  // Render Category View (Inside a Folder)
  if (selectedChecklistCategory) {
    const categoryNotes = checklists.filter(c => c.category === selectedChecklistCategory);

    return (
      <div className="space-y-4 min-w-0">
        <div className="flex items-center justify-between mb-4 min-w-0">
          <h2 className="text-lg font-semibold text-text-primary">{selectedChecklistCategory}</h2>
          <button
            onClick={() => handleCreateChecklist(selectedChecklistCategory)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--workspace-accent)] text-white rounded-button text-xs font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Checklist</span>
          </button>
        </div>

        {isLoading ? (
          <GridSkeleton count={3} />
        ) : categoryNotes.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-card p-6 text-center min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] flex items-center justify-center mb-2">
              <CheckSquare className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-text-primary">No checklists here yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isSelected={selectedNoteId === note.id}
                tags={noteTagsMap[note.id] || []}
                onSelect={() => setSelectedNoteId(note.id)}
                onPinToggle={async () => {
                  await db.notes.update(note.id, { is_pinned: !note.is_pinned });
                }}
                onArchive={() => handleArchiveNote(note.id)}
                onDelete={() => handleDeleteNote(note.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render Main Folders View
  return (
    <div className="space-y-4 min-w-0">
      {/* Starter Kits Section */}
      <div className="mb-8 min-w-0">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Starter Kits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STARTER_KITS.map((kit) => (
            <div
              key={kit.id}
              onClick={() => setSelectedNoteId(kit.id)}
              className="group relative rounded-card p-3 border border-black/5 dark:border-white/10 bg-card-default transition-all duration-200 ease-out cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-black/40 flex items-center gap-3"
            >
              <div className="text-xl pl-1">{kit.title.split(' ')[0]}</div>
              <div>
                <h3 className="font-semibold text-sm text-text-primary line-clamp-1">{kit.title.substring(kit.title.indexOf(' ') + 1)}</h3>
                <p className="text-[11px] text-text-muted font-medium">{kit.items.length} items</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 min-w-0 mt-8 pt-4 border-t border-black/10 dark:border-white/10">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-text-primary capitalize leading-tight">
              Checklists
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] border border-[var(--workspace-accent)]/20 uppercase tracking-wider">
              Workspace
            </span>
          </div>
          <div className="h-0.5 w-8 rounded-full bg-[var(--workspace-accent)] mt-1.5" />
          <p className="text-xs text-text-muted mt-1">Organize your tasks and templates into folders.</p>
        </div>

        <div className="flex items-center gap-2">
          {isCreatingFolder ? (
            <form onSubmit={handleCreateFolder} className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                placeholder="Folder name..."
                value={newFolderInput}
                onChange={(e) => setNewFolderInput(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button text-text-primary outline-none focus:border-[var(--workspace-accent)]"
              />
              <button type="submit" className="px-3 py-1.5 bg-[var(--workspace-accent)] text-white text-xs rounded-button hover:opacity-90">Save</button>
              <button type="button" onClick={() => setIsCreatingFolder(false)} className="px-2 py-1.5 bg-black/5 dark:bg-white/10 text-xs rounded-button">Cancel</button>
            </form>
          ) : (
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--workspace-accent)] text-white rounded-button text-xs font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm"
              aria-label="Create new checklist folder"
            >
              <Folder className="w-4 h-4" />
              <span>New Folder</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <GridSkeleton count={4} />
      ) : folders.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-card p-8 text-center min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] flex items-center justify-center mb-3">
            <Folder className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-text-primary">No folders created yet</p>
          <p className="text-xs opacity-70 mt-1 max-w-xs">
            Create your first folder (like 'Shopping', 'Travel', 'Work') to organize your checklists.
          </p>
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-[var(--workspace-accent)] text-white rounded-button text-xs font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Folder
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folderName) => {
            const count = checklists.filter(c => c.category === folderName).length;
            return (
              <div
                key={folderName}
                onClick={() => {
                  setSelectedChecklistCategory(folderName);
                  setSelectedNoteId(null);
                }}
                className="group relative rounded-card p-4 border border-black/5 dark:border-white/10 bg-card-default transition-all duration-200 ease-out cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-black/40 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--workspace-accent-bg)] flex items-center justify-center text-[var(--workspace-accent)]">
                  <Folder className="w-5 h-5 fill-current opacity-20" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-text-primary line-clamp-1">{folderName}</h3>
                  <p className="text-xs text-text-muted">{count} checklist{count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
