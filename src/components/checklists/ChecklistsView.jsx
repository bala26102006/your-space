import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  Folder, 
  CheckSquare, 
  ChevronRight, 
  Pin, 
  Sparkles,
  FolderPlus,
  ArrowLeft,
  Filter
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import UpNextStrip from './UpNextStrip';
import ChecklistCard from './ChecklistCard';
import FolderCard from './FolderCard';
import TemplateGallery from './TemplateGallery';
import { GridSkeleton } from '../shared/SkeletonLoader';
import { softDeleteItem, archiveItem } from '../../lib/services/trashService';
import { useConfirmStore } from '../../store/confirmStore';
import { generateUUID } from '../../lib/uuid';
import { 
  getTodayStr, 
  isItemCompleted, 
  getDueDateStatus, 
  getUpNextItems, 
  calculateWeeklyProgress, 
  duplicateChecklist,
  renameFolderAcrossChecklists,
  getKnownEmptyFolders,
  addKnownEmptyFolder,
  removeKnownEmptyFolder
} from '../../lib/checklists/checklistUtils';

export default function ChecklistsView() {
  const { openSoftDelete } = useConfirmStore();
  const {
    selectedChecklistCategory,
    setSelectedChecklistCategory,
    selectedNoteId,
    setSelectedNoteId,
    viewMode,
    setViewMode
  } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'in_progress' | 'due_soon' | 'completed' | 'pinned'
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');

  // 1. Fetch all active checklists (excluding archived/deleted and templates)
  const rawChecklists = useLiveQuery(async () => {
    const all = await db.notes.where('workspace_id').equals('checklists').toArray();
    return all
      .filter(n => !n.is_archived && !n.is_deleted)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, []);
  const checklists = rawChecklists || [];
  const isLoading = rawChecklists === undefined;

  // 2. Performance: Single bulk query for all checklist_items, grouped by note_id
  const rawItems = useLiveQuery(() => db.checklist_items.toArray(), []) || [];
  const itemsByNoteId = useMemo(() => {
    const map = new Map();
    rawItems.forEach(item => {
      if (!map.has(item.note_id)) {
        map.set(item.note_id, []);
      }
      map.get(item.note_id).push(item);
    });
    return map;
  }, [rawItems]);

  // 3. Dynamic Folders List (Combines category tags from notes + known empty folders)
  const allFolderNames = useMemo(() => {
    const folderSet = new Set();
    checklists.forEach(c => {
      if (c.category && c.category !== 'Uncategorized') {
        folderSet.add(c.category);
      }
    });
    getKnownEmptyFolders().forEach(f => folderSet.add(f));
    return Array.from(folderSet).sort();
  }, [checklists]);

  // 4. Up Next Items & Weekly Progress
  const upNextItems = useMemo(() => {
    return getUpNextItems(checklists, itemsByNoteId, 3);
  }, [checklists, itemsByNoteId]);

  const weeklyProgress = useMemo(() => {
    return calculateWeeklyProgress(checklists, itemsByNoteId);
  }, [checklists, itemsByNoteId]);

  // -------------------------------------------------------------
  // Filter & Search Evaluation
  // -------------------------------------------------------------
  const filteredChecklists = useMemo(() => {
    return checklists.filter(note => {
      // Exclude template items from standard listings
      if (note.content?.isTemplate || note.content?.isStarterKit) return false;

      // Filter by folder if inside a folder view
      if (selectedChecklistCategory && note.category !== selectedChecklistCategory) {
        return false;
      }

      // In-page search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (note.title || '').toLowerCase().includes(query);
        const categoryMatch = (note.category || '').toLowerCase().includes(query);
        const items = itemsByNoteId.get(note.id) || [];
        const itemMatch = items.some(i => (i.text || '').toLowerCase().includes(query));
        if (!titleMatch && !categoryMatch && !itemMatch) return false;
      }

      // Filter Chips
      const items = (itemsByNoteId.get(note.id) || []).filter(i => i.item_type === 'task' || !i.item_type);
      const total = items.length;
      const completed = items.filter(i => isItemCompleted(i)).length;
      const open = total - completed;

      switch (activeFilter) {
        case 'in_progress':
          // In progress = has at least one open task, or is an empty list (0 items)
          return open > 0 || total === 0;
        case 'completed':
          return total > 0 && completed === total;
        case 'due_soon': {
          // List dueDate or any open item due within 3 days / overdue
          const listDue = getDueDateStatus(note.content?.dueDate);
          if (listDue && (listDue.status === 'overdue' || listDue.status === 'today' || listDue.status === 'tomorrow' || listDue.status === 'soon')) {
            return true;
          }
          return items.some(i => {
            if (isItemCompleted(i) || !i.due_date) return false;
            const st = getDueDateStatus(i.due_date);
            return st && (st.status === 'overdue' || st.status === 'today' || st.status === 'tomorrow' || st.status === 'soon');
          });
        }
        case 'pinned':
          return Boolean(note.is_pinned);
        default:
          return true;
      }
    });
  }, [checklists, itemsByNoteId, selectedChecklistCategory, searchQuery, activeFilter]);

  // Pinned & Recent lists partitioning (for main view)
  const { pinnedChecklists, recentChecklists } = useMemo(() => {
    const pinned = [];
    const recent = [];
    filteredChecklists.forEach(c => {
      if (c.is_pinned) pinned.push(c);
      else recent.push(c);
    });
    return { pinnedChecklists: pinned, recentChecklists: recent };
  }, [filteredChecklists]);

  // -------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------
  const handleCreateChecklist = async (targetCategory = 'Uncategorized') => {
    const newId = generateUUID();
    const newNote = {
      id: newId,
      user_id: 'local_user',
      workspace_id: 'checklists',
      subproject_id: null,
      note_type: 'plain',
      title: '',
      category: targetCategory,
      content: { isTemplate: false, icon: 'CheckSquare' },
      color: 'default',
      is_pinned: false,
      is_archived: false,
      is_deleted: false,
      sort_order: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.notes.add(newNote);
    setSelectedNoteId(newId);
  };

  const handleCreateFolder = (e) => {
    e.preventDefault();
    const clean = newFolderNameInput.trim();
    if (!clean) return;
    addKnownEmptyFolder(clean);
    setNewFolderNameInput('');
    setIsCreatingFolder(false);
  };

  const handleRenameFolder = async (oldName, newName) => {
    await renameFolderAcrossChecklists(oldName, newName);
    if (selectedChecklistCategory === oldName) {
      setSelectedChecklistCategory(newName);
    }
  };

  const handleDeleteFolder = async (folderName) => {
    openSoftDelete({
      title: `Folder "${folderName}"`,
      message: `Are you sure? Any checklists in "${folderName}" will be moved to Uncategorized.`,
      onConfirm: async () => {
        // Move checklists to Uncategorized
        const matching = checklists.filter(c => c.category === folderName);
        for (const note of matching) {
          await db.notes.update(note.id, { category: 'Uncategorized' });
        }
        removeKnownEmptyFolder(folderName);
        if (selectedChecklistCategory === folderName) {
          setSelectedChecklistCategory(null);
        }
      }
    });
  };

  const handleDuplicate = async (note) => {
    const newId = await duplicateChecklist(note.id);
    if (newId) setSelectedNoteId(newId);
  };

  const handleMoveToFolder = async (note, targetCategory) => {
    await db.notes.update(note.id, {
      category: targetCategory,
      updated_at: new Date().toISOString()
    });
  };

  const handleArchive = async (note) => {
    await archiveItem({
      id: note.id,
      type: 'note',
      title: note.title || 'Untitled checklist',
      workspace: 'checklists',
    });
    if (selectedNoteId === note.id) setSelectedNoteId(null);
  };

  const handleDelete = (note) => {
    openSoftDelete({
      title: note.title || 'Untitled checklist',
      onConfirm: async () => {
        await softDeleteItem({
          id: note.id,
          type: 'note',
          title: note.title || 'Untitled checklist',
          workspace: 'checklists',
        });
        if (selectedNoteId === note.id) setSelectedNoteId(null);
      },
    });
  };

  // -------------------------------------------------------------
  // RENDER: FOLDER DRILL-DOWN VIEW
  // -------------------------------------------------------------
  if (selectedChecklistCategory) {
    return (
      <div className="flex flex-col min-h-full relative min-w-0 overflow-x-hidden space-y-6 pb-20">
        {/* Breadcrumb Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedChecklistCategory(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-text-muted hover:text-text-primary transition-all active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Checklists</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-text-muted/40" />
            <span className="text-text-primary font-bold text-sm">
              {selectedChecklistCategory}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleCreateChecklist(selectedChecklistCategory)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all self-end sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Checklist</span>
          </button>
        </div>

        {/* Checklists in this folder */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <GridSkeleton count={3} />
          ) : filteredChecklists.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-dashed border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10 p-8">
              <Folder className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
              <h3 className="text-base font-bold text-text-primary">No checklists in this folder</h3>
              <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
                Create your first checklist in "{selectedChecklistCategory}" to get started.
              </p>
              <button
                type="button"
                onClick={() => handleCreateChecklist(selectedChecklistCategory)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-600"
              >
                <Plus className="w-4 h-4" />
                <span>Create Checklist</span>
              </button>
            </div>
          ) : (
            <div className={
              viewMode === 'list'
                ? 'space-y-2.5'
                : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            }>
              {filteredChecklists.map(note => (
                <ChecklistCard
                  key={note.id}
                  note={note}
                  items={itemsByNoteId.get(note.id) || []}
                  allFolders={allFolderNames}
                  onSelect={() => setSelectedNoteId(note.id)}
                  onPinToggle={() => db.notes.update(note.id, { is_pinned: !note.is_pinned })}
                  onDuplicate={handleDuplicate}
                  onMoveToFolder={handleMoveToFolder}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  isListView={viewMode === 'list'}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: MAIN CHECKLISTS WORKSPACE VIEW
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col min-h-full relative min-w-0 overflow-x-hidden space-y-7 pb-20">
      
      {/* 1. Page Header (Emerald Title + Underline + Actions) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
              Smart Checklists
            </span>
          </div>

          <h1 className="text-[28px] sm:text-[32px] font-extrabold text-text-primary tracking-tight leading-tight">
            Checklists
          </h1>
          <div className="h-0.5 w-10 rounded-full bg-emerald-500 mt-1 mb-1.5" />
          <p className="text-xs text-text-muted">
            Instant capture, smart priorities, and templates for effortless execution.
          </p>
        </div>

        {/* Top Header Buttons: Grid/List Toggle + New Folder + New Checklist */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          <div className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-colors"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>
          </div>

          {/* New Folder Action */}
          {isCreatingFolder ? (
            <form onSubmit={handleCreateFolder} className="flex items-center gap-1.5 bg-bg-sidebar p-1 rounded-xl border border-black/10 dark:border-white/10">
              <input
                autoFocus
                type="text"
                placeholder="Folder name..."
                value={newFolderNameInput}
                onChange={(e) => setNewFolderNameInput(e.target.value)}
                className="w-32 px-2.5 py-1 text-xs bg-bg-primary rounded-lg text-text-primary outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button type="submit" className="px-2.5 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600">Save</button>
              <button type="button" onClick={() => setIsCreatingFolder(false)} className="px-2 py-1 bg-black/5 text-text-muted text-xs rounded-lg">Cancel</button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreatingFolder(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-text-primary rounded-xl text-xs font-bold border border-black/5 dark:border-white/5 transition-all active:scale-95"
              aria-label="Create new folder"
            >
              <FolderPlus className="w-4 h-4 text-emerald-500" />
              <span>New Folder</span>
            </button>
          )}

          {/* New Checklist Primary Action */}
          <button
            type="button"
            onClick={() => handleCreateChecklist('Uncategorized')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow active:scale-95 transition-all"
            aria-label="Create new checklist"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Checklist</span>
          </button>
        </div>
      </div>

      {/* 2. In-Page Search & Filter Chips */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'due_soon', label: 'Due Soon' },
            { id: 'completed', label: 'Completed' },
            { id: 'pinned', label: 'Pinned' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                activeFilter === f.id
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-black/5 dark:bg-white/5 text-text-muted hover:text-text-primary hover:bg-black/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search checklists & tasks..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          />
        </div>
      </div>

      {/* 3. Up Next Strip (Focus Tasks & Weekly Progress) */}
      <UpNextStrip
        items={upNextItems}
        weeklyProgress={weeklyProgress}
        onSelectChecklist={setSelectedNoteId}
      />

      {/* 4. Pinned Checklists (If any exist) */}
      {pinnedChecklists.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 py-1 border-b border-black/5 dark:border-white/5">
            <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Pinned Checklists
            </h2>
            <span className="text-[11px] font-semibold text-text-muted bg-black/5 dark:bg-white/5 px-2 py-0.2 rounded-full">
              {pinnedChecklists.length}
            </span>
          </div>

          <div className={
            viewMode === 'list'
              ? 'space-y-2.5'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
          }>
            {pinnedChecklists.map(note => (
              <ChecklistCard
                key={note.id}
                note={note}
                items={itemsByNoteId.get(note.id) || []}
                allFolders={allFolderNames}
                onSelect={() => setSelectedNoteId(note.id)}
                onPinToggle={() => db.notes.update(note.id, { is_pinned: !note.is_pinned })}
                onDuplicate={handleDuplicate}
                onMoveToFolder={handleMoveToFolder}
                onArchive={handleArchive}
                onDelete={handleDelete}
                isListView={viewMode === 'list'}
              />
            ))}
          </div>
        </div>
      )}

      {/* 5. Recent / Active Checklists */}
      <div className="space-y-3">
        <div className="flex items-center justify-between py-1 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              {pinnedChecklists.length > 0 ? 'All Checklists' : 'My Checklists'}
            </h2>
            <span className="text-[11px] font-semibold text-text-muted bg-black/5 dark:bg-white/5 px-2 py-0.2 rounded-full">
              {recentChecklists.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <GridSkeleton count={4} />
        ) : recentChecklists.length === 0 && pinnedChecklists.length === 0 ? (
          <div className="py-12 text-center text-text-muted">
            <Filter className="w-8 h-8 mx-auto opacity-30 mb-2" />
            <p className="text-sm font-semibold text-text-primary">No checklists found</p>
            <p className="text-xs mt-1">Try resetting the filter or create a new checklist.</p>
          </div>
        ) : (
          <div className={
            viewMode === 'list'
              ? 'space-y-2.5'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
          }>
            {recentChecklists.map(note => (
              <ChecklistCard
                key={note.id}
                note={note}
                items={itemsByNoteId.get(note.id) || []}
                allFolders={allFolderNames}
                onSelect={() => setSelectedNoteId(note.id)}
                onPinToggle={() => db.notes.update(note.id, { is_pinned: !note.is_pinned })}
                onDuplicate={handleDuplicate}
                onMoveToFolder={handleMoveToFolder}
                onArchive={handleArchive}
                onDelete={handleDelete}
                isListView={viewMode === 'list'}
              />
            ))}
          </div>
        )}
      </div>

      {/* 6. Folders Section */}
      <div className="space-y-3 pt-4 border-t border-black/8 dark:border-white/10">
        <div className="flex items-center justify-between py-1 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Folder className="w-3.5 h-3.5 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Folders
            </h2>
            <span className="text-[11px] font-semibold text-text-muted bg-black/5 dark:bg-white/5 px-2 py-0.2 rounded-full">
              {allFolderNames.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingFolder(true)}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>New Folder</span>
          </button>
        </div>

        {allFolderNames.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-muted rounded-2xl border border-dashed border-black/10 dark:border-white/10">
            No folders created yet. Click "New Folder" above to group your checklists.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allFolderNames.map(folderName => (
              <FolderCard
                key={folderName}
                folderName={folderName}
                checklists={checklists.filter(c => c.category === folderName)}
                itemsByNoteId={itemsByNoteId}
                onSelectFolder={(f) => setSelectedChecklistCategory(f)}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
                onAddChecklist={(f) => handleCreateChecklist(f)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 7. Start from a Template (At Bottom, Never Dominates User Content) */}
      <TemplateGallery
        allFolders={allFolderNames}
        onTemplateCreated={(newNoteId) => {
          setSelectedNoteId(newNoteId);
        }}
      />
    </div>
  );
}
