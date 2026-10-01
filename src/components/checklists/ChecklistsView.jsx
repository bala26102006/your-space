import React, { useState, useMemo } from 'react';
import { Folder, FileCheck, Plus, ChevronRight, CheckSquare, MoreVertical, Archive, Trash2 } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import NoteCard from '../cards/NoteCard';
import { STARTER_KITS } from '../../lib/starterKits';

export default function ChecklistsView() {
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
  const checklists = useLiveQuery(async () => {
    const all = await db.notes.where('workspace_id').equals('checklists').toArray();
    return all
      .filter(n => !n.is_archived && !n.is_deleted)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, []) || [];

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
    const newId = crypto.randomUUID();
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
    await db.notes.update(noteId, {
      is_archived: true,
      updated_at: new Date().toISOString(),
    });
    if (selectedNoteId === noteId) setSelectedNoteId(null);
  };

  const handleDeleteNote = async (noteId) => {
    await db.notes.update(noteId, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (selectedNoteId === noteId) setSelectedNoteId(null);
  };

  // Render Category View (Inside a Folder)
  if (selectedChecklistCategory) {
    const categoryNotes = checklists.filter(c => c.category === selectedChecklistCategory);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">{selectedChecklistCategory}</h2>
          <button
            onClick={() => handleCreateChecklist(selectedChecklistCategory)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-text-primary text-bg-primary rounded-button text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Checklist</span>
          </button>
        </div>

        {categoryNotes.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-card p-6 text-center">
            <CheckSquare className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs font-medium">No checklists here yet.</p>
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
    <div className="space-y-4">
      {/* Starter Kits Section */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Starter Kits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STARTER_KITS.map((kit) => (
            <div
              key={kit.id}
              onClick={() => setSelectedNoteId(kit.id)}
              className="group relative rounded-card p-3 border border-black/5 dark:border-white/10 bg-card-default transition-all duration-200 cursor-pointer hover:shadow-card-hover dark:hover:shadow-card-hover-dark flex items-center gap-3"
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

      <div className="flex items-center justify-between mb-4 mt-8 pt-4 border-t border-black/10 dark:border-white/10">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Your Folders</h2>
          <p className="text-xs text-text-muted">Organize your tasks and templates into folders.</p>
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
                className="px-2 py-1.5 text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded text-text-primary outline-none focus:border-blue-500"
              />
              <button type="submit" className="px-2 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">Save</button>
              <button type="button" onClick={() => setIsCreatingFolder(false)} className="px-2 py-1.5 bg-black/5 dark:bg-white/10 text-xs rounded">Cancel</button>
            </form>
          ) : (
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-black/5 dark:bg-white/10 text-text-primary rounded-button text-xs font-medium hover:bg-black/10 dark:hover:bg-white/20 transition-colors shadow-sm"
            >
              <Folder className="w-4 h-4" />
              <span>New Folder</span>
            </button>
          )}
        </div>
      </div>

      {folders.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-card p-8 text-center">
          <Folder className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No folders created yet</p>
          <p className="text-xs opacity-70 mt-1 max-w-xs">
            Create your first folder (like 'Shopping', 'Travel', 'Work') to organize your checklists.
          </p>
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-text-primary text-bg-primary rounded-button text-xs font-medium hover:opacity-90"
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
                className="group relative rounded-card p-4 border border-black/5 dark:border-white/10 bg-card-default transition-all duration-200 cursor-pointer hover:shadow-card-hover dark:hover:shadow-card-hover-dark flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Folder className="w-5 h-5 fill-blue-500/20" />
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
