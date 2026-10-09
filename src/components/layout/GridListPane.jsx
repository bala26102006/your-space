import React, { useState } from 'react';
import { Plus, StickyNote, Archive, Trash2, Pin, FolderKanban, Folder } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import NoteCard from '../cards/NoteCard';
import ProjectsView from '../projects/ProjectsView';
import JournalView from '../journal/JournalView';
import WishListView from '../wishlist/WishListView';
import ChecklistsView from '../checklists/ChecklistsView';
import SettingsView from '../settings/SettingsView';
import RoutinesView from '../routines/RoutinesView';
import SketchView from '../sketch/SketchView';
import ArchiveView from '../archive/ArchiveView';
import TrashView from '../trash/TrashView';
import TopBar from './TopBar';
import { autoOrganize } from '../../lib/ai/autoOrganize';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { generateUUID } from '../../lib/uuid';
import { GridSkeleton } from '../shared/SkeletonLoader';
import { softDeleteItem, restoreItem, permanentDeleteItem, archiveItem, unarchiveItem } from '../../lib/services/trashService';
import { useConfirmStore } from '../../store/confirmStore';

export default function GridListPane() {
  const {
    activeWorkspace,
    setActiveWorkspace,
    selectedNoteId,
    setSelectedNoteId,
    setSelectedProjectId,
    setSelectedSubprojectId,
    searchQuery,
    setSearchQuery,
    activeTagId,
    setActiveTagId,
    sortOrder,
    viewMode,
  } = useUIStore();

  const { openSoftDelete, openPermanentDelete } = useConfirmStore();

  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizeSuggestion, setOrganizeSuggestion] = useState(null);

  // Fetch notes
  const notes = useLiveQuery(async () => {
    let collection = db.notes.toCollection();

    if (searchQuery.trim() || activeTagId) {
      // Global fetch across all non-deleted/non-archived notes
      const all = await collection.toArray();
      return all.filter((n) => !n.is_archived && !n.is_deleted);
    }

    if (activeWorkspace === 'archive') {
      collection = db.notes.where('is_archived').equals(1);
    } else if (activeWorkspace === 'trash') {
      collection = db.notes.where('is_deleted').equals(1);
    } else {
      const all = await db.notes
        .where('workspace_id')
        .equals(activeWorkspace)
        .toArray();
      
      return all.filter((n) => !n.is_archived && !n.is_deleted);
    }

    return await collection.toArray();
  }, [activeWorkspace, searchQuery, activeTagId]);

  // Fetch archived or deleted projects when viewing archive or trash
  const archivedOrDeletedProjects = useLiveQuery(async () => {
    if (activeWorkspace === 'archive') {
      return await db.projects.where('is_archived').equals(1).toArray();
    }
    if (activeWorkspace === 'trash') {
      return await db.projects.where('is_deleted').equals(1).toArray();
    }
    return [];
  }, [activeWorkspace]) || [];

  // Fetch archived or deleted subprojects
  const archivedOrDeletedSubprojects = useLiveQuery(async () => {
    if (activeWorkspace === 'archive') {
      return await db.subprojects.where('is_archived').equals(1).toArray();
    }
    if (activeWorkspace === 'trash') {
      return await db.subprojects.where('is_deleted').equals(1).toArray();
    }
    return [];
  }, [activeWorkspace]) || [];

  // Tags mapping
  const allTags = useLiveQuery(() => db.tags.toArray(), []) || [];
  const allNoteTags = useLiveQuery(() => db.note_tags.toArray(), []) || [];

  const tagMap = React.useMemo(() => {
    const map = {};
    allTags.forEach((t) => (map[t.id] = t));
    return map;
  }, [allTags]);

  const noteTagsMap = React.useMemo(() => {
    const map = {};
    allNoteTags.forEach((nt) => {
      if (!map[nt.note_id]) map[nt.note_id] = [];
      if (tagMap[nt.tag_id]) map[nt.note_id].push(tagMap[nt.tag_id]);
    });
    return map;
  }, [allNoteTags, tagMap]);

  // Apply filters
  const filteredNotes = React.useMemo(() => {
    if (!notes) return [];

    return notes.filter((note) => {
      if (activeTagId) {
        const hasTag = (noteTagsMap[note.id] || []).some((t) => t.id === activeTagId);
        if (!hasTag) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (note.title || '').toLowerCase().includes(q);
        const textContent =
          typeof note.content === 'string'
            ? note.content
            : JSON.stringify(note.content || '');
        const contentMatch = textContent.toLowerCase().includes(q);
        return titleMatch || contentMatch;
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'name') {
        return (a.title || '').localeCompare(b.title || '');
      } else if (sortOrder === 'priority') {
        // Quicknotes don't have priority directly on root object unless added, fallback to date
        // Wait, for quicknotes we just sort by date if priority is missing
        const pA = a.content?.priority === 'High' ? 3 : a.content?.priority === 'Medium' ? 2 : a.content?.priority === 'Low' ? 1 : 0;
        const pB = b.content?.priority === 'High' ? 3 : b.content?.priority === 'Medium' ? 2 : b.content?.priority === 'Low' ? 1 : 0;
        if (pA !== pB) return pB - pA;
      }
      // default: date
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [notes, activeTagId, searchQuery, noteTagsMap, sortOrder]);

  // Split into pinned and unpinned
  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.is_pinned);

  const handleSelectNote = async (note) => {
    if (searchQuery.trim() || activeTagId) {
      // Global navigation intercept
      let projectId = null;
      let subprojectId = null;
      if (note.workspace_id === 'projects' && note.subproject_id) {
        const sp = await db.subprojects.get(note.subproject_id);
        if (sp) {
          projectId = sp.project_id;
          subprojectId = note.subproject_id;
        }
      }

      // Synchronous batch update
      useUIStore.setState({
        activeWorkspace: note.workspace_id,
        selectedProjectId: projectId,
        selectedSubprojectId: subprojectId,
        selectedNoteId: note.id,
        searchQuery: '',
        activeTagId: null,
      });
    } else {
      setSelectedNoteId(note.id);
    }
  };

  // Actions
  const handleCreateNote = async () => {
    const newId = generateUUID();
    let initialContent = { type: 'doc', content: [] };
    if (activeWorkspace === 'checklists') {
      initialContent = { isTemplate: false, items: [] };
    } else if (activeWorkspace === 'wishlist') {
      initialContent = { url: '', price: 0, priority: 'Low', gotIt: false, image: '' };
    }

    const newNote = {
      id: newId,
      user_id: 'local_user',
      workspace_id: activeWorkspace === 'archive' || activeWorkspace === 'trash' ? 'quicknotes' : activeWorkspace,
      subproject_id: null,
      note_type: 'plain',
      title: '',
      content: initialContent,
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
  };

  const handlePinToggle = async (noteId) => {
    const note = await db.notes.get(noteId);
    if (note) {
      await db.notes.update(noteId, {
        is_pinned: !note.is_pinned,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const handleArchiveNote = async (noteId) => {
    const note = await db.notes.get(noteId);
    if (note) {
      if (note.is_archived) {
        await unarchiveItem({
          id: note.id,
          type: 'note',
          title: note.title || 'Untitled note',
          workspace: note.workspace_id || activeWorkspace,
        });
      } else {
        await archiveItem({
          id: note.id,
          type: 'note',
          title: note.title || 'Untitled note',
          workspace: note.workspace_id || activeWorkspace,
        });
      }
    }
  };

  const handleDeleteNote = async (noteId) => {
    const note = await db.notes.get(noteId);
    if (note) {
      openSoftDelete({
        title: note.title || 'Untitled note',
        onConfirm: async () => {
          await softDeleteItem({
            id: note.id,
            type: 'note',
            title: note.title || 'Untitled note',
            workspace: note.workspace_id || activeWorkspace,
          });
          if (selectedNoteId === noteId) {
            setSelectedNoteId(null);
          }
        },
      });
    }
  };

  const handleRestoreNote = async (noteId) => {
    const note = await db.notes.get(noteId);
    await restoreItem({
      id: noteId,
      type: 'note',
      title: note?.title || 'Untitled note',
      workspace: note?.workspace_id || activeWorkspace,
    });
  };

  const handlePermanentDelete = async (noteId) => {
    const note = await db.notes.get(noteId);
    openPermanentDelete({
      title: note?.title || 'Untitled note',
      onConfirm: async () => {
        await permanentDeleteItem({
          id: noteId,
          type: 'note',
          title: note?.title || 'Untitled note',
          workspace: note?.workspace_id || activeWorkspace,
        });
        if (selectedNoteId === noteId) {
          setSelectedNoteId(null);
        }
      },
    });
  };

  const handleAutoOrganize = async () => {
    if (unpinnedNotes.length === 0) return;
    setIsOrganizing(true);
    setOrganizeSuggestion(null);
    try {
      const suggestions = await autoOrganize(unpinnedNotes);
      if (suggestions && suggestions.length > 0) {
        setOrganizeSuggestion(suggestions);
      } else {
        alert('Could not find any obvious organization. Your notes might already be organized!');
      }
    } catch (e) {
      console.error(e);
      alert('AI Error: ' + e.message);
    } finally {
      setIsOrganizing(false);
    }
  };

  const applyOrganization = async () => {
    if (!organizeSuggestion) return;
    
    // We'll create a project for each category and move notes into it
    // If we can't find a matching project, we'll create one. 
    // Actually, simple implementation: just create a new Project and Subproject for each category.
    for (const group of organizeSuggestion) {
      const projectId = generateUUID();
      await db.projects.add({
        id: projectId,
        title: group.category || 'Organized Project',
        color: 'default',
        is_archived: false,
        is_deleted: false,
        deleted_at: null,
        sort_order: Date.now(),
        updated_at: new Date().toISOString()
      });

      const subprojectId = generateUUID();
      await db.subprojects.add({
        id: subprojectId,
        project_id: projectId,
        title: 'Notes',
        sort_order: Date.now(),
        is_deleted: false,
        deleted_at: null
      });

      for (const noteId of group.noteIds) {
        const note = await db.notes.get(noteId);
        if (note) {
          await db.notes.update(noteId, {
            workspace_id: 'projects',
            subproject_id: subprojectId,
            updated_at: new Date().toISOString()
          });
        }
      }
    }
    
    setOrganizeSuggestion(null);
  };

  // Restore & Purge Project
  const handleRestoreProject = async (id) => {
    await db.projects.update(id, {
      is_deleted: false,
      is_archived: false,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    });
  };

  const handlePurgeProject = async (id) => {
    await db.projects.delete(id);
  };

  // Compute 7-day trash countdown
  const getTrashDaysRemaining = (deletedAtStr) => {
    if (!deletedAtStr) return 7;
    const deletedAt = new Date(deletedAtStr).getTime();
    const now = new Date().getTime();
    const diffDays = (now - deletedAt) / (1000 * 3600 * 24);
    return Math.max(0, Math.ceil(7 - diffDays));
  };

  const isGlobalView = !!(searchQuery.trim() || activeTagId);

  const getOverflowClass = () => {
    if (!isGlobalView) {
      if (activeWorkspace === 'projects') return 'overflow-y-auto';
      if (activeWorkspace === 'journal') return 'overflow-hidden';
      if (activeWorkspace === 'wishlist') return 'overflow-hidden';
      if (activeWorkspace === 'checklists') return 'overflow-hidden';
      if (activeWorkspace === 'archive') return 'overflow-hidden';
      if (activeWorkspace === 'trash') return 'overflow-hidden';
    }
    return 'overflow-y-auto';
  };

  const renderContent = () => {
    if (activeWorkspace === 'projects' && !isGlobalView) return <ProjectsView />;
    if (activeWorkspace === 'journal' && !isGlobalView) return <JournalView />;
    if (activeWorkspace === 'wishlist' && !isGlobalView) return <WishListView />;
    if (activeWorkspace === 'checklists' && !isGlobalView) return <ChecklistsView />;
    if (activeWorkspace === 'routines' && !isGlobalView) return <RoutinesView />;
    if (activeWorkspace === 'sketch' && !isGlobalView) return <SketchView />;
    if (activeWorkspace === 'archive' && !isGlobalView) return <ArchiveView />;
    if (activeWorkspace === 'trash' && !isGlobalView) return <TrashView />;
    if (activeWorkspace === 'settings') return <SettingsView />;

    return (
      <>
        {/* Pane Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-text-primary capitalize leading-tight">
                {isGlobalView
                  ? (searchQuery ? `Search: "${searchQuery}"` : 'Tag Filter')
                  : (activeWorkspace === 'quicknotes'
                      ? 'Quick Notes'
                      : activeWorkspace === 'wishlist'
                      ? 'Wish List'
                      : activeWorkspace)}
              </h1>
              {!isGlobalView && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] border border-[var(--workspace-accent)]/20 uppercase tracking-wider">
                  Workspace
                </span>
              )}
            </div>
            <div className="h-0.5 w-8 rounded-full bg-[var(--workspace-accent)] mt-1.5" />
            <p className="text-xs text-text-muted mt-1">
              {activeWorkspace === 'quicknotes' && 'Instant thoughts & fast color-coded cards'}
              {activeWorkspace === 'archive' && 'Hidden notes and projects'}
              {activeWorkspace === 'trash' && 'Soft-deleted items (auto-purged after 7 days)'}
              {activeWorkspace !== 'quicknotes' &&
                activeWorkspace !== 'archive' &&
                activeWorkspace !== 'trash' &&
                `${filteredNotes.length} item(s)`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeWorkspace !== 'archive' && activeWorkspace !== 'trash' && (
              <button
                onClick={handleCreateNote}
                aria-label="Create New Note"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--workspace-accent)] text-white rounded-button text-xs font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Note</span>
              </button>
            )}
            {activeWorkspace === 'quicknotes' && unpinnedNotes.length > 0 && !isGlobalView && (
              <button
                onClick={handleAutoOrganize}
                disabled={isOrganizing}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-button text-xs font-medium hover:bg-purple-500/20 transition-colors shadow-sm disabled:opacity-50"
                title="Suggest Projects for these notes"
              >
                {isOrganizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Auto-Organize</span>
              </button>
            )}
          </div>
        </div>

        {organizeSuggestion && (
          <div className="mb-6 border border-purple-500/20 bg-purple-50/50 dark:bg-purple-900/10 rounded-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium text-sm">
                <Sparkles className="w-4 h-4" />
                AI Auto-Organize Suggestion
              </div>
              <div className="flex gap-2">
                <button onClick={() => setOrganizeSuggestion(null)} className="px-3 py-1.5 text-xs text-text-muted hover:bg-black/5 dark:hover:bg-white/10 rounded">
                  Discard
                </button>
                <button onClick={applyOrganization} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">
                  <Check className="w-3.5 h-3.5" />
                  Accept & Move Notes
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {organizeSuggestion.map((group, i) => (
                <div key={i} className="bg-bg-primary border border-black/5 dark:border-white/10 p-3 rounded">
                  <div className="font-semibold text-sm mb-2">{group.category}</div>
                  <div className="text-xs text-text-muted space-y-1">
                    {group.noteIds.map(nid => {
                      const n = notes?.find(x => x.id === nid);
                      return n ? <div key={nid} className="truncate">• {n.title || 'Untitled Note'}</div> : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid View */}
        {notes === undefined ? (
          <div className="pt-2">
            <GridSkeleton count={viewMode === 'list' ? 4 : 6} />
          </div>
        ) : filteredNotes.length === 0 &&
        archivedOrDeletedProjects.length === 0 &&
        archivedOrDeletedSubprojects.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-card p-8 text-center min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] flex items-center justify-center mb-3">
              <StickyNote className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-text-primary">No items here yet</p>
            <p className="text-xs opacity-70 mt-1 max-w-xs">
              {activeWorkspace === 'quicknotes'
                ? 'Click "+ New Note" to capture your first thought.'
                : 'Items will appear here as you create or archive/trash them.'}
            </p>
            {activeWorkspace === 'quicknotes' && (
              <button
                onClick={handleCreateNote}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-[var(--workspace-accent)] text-white rounded-button text-xs font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Note</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Archived / Deleted Projects Section */}
            {archivedOrDeletedProjects.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>Projects</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archivedOrDeletedProjects.map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => {
                        useUIStore.setState({ selectedProjectId: proj.id, selectedSubprojectId: null, selectedNoteId: null });
                      }}
                      className="p-4 bg-card-default border border-black/5 dark:border-white/10 rounded-card cursor-pointer hover:shadow-card-hover"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-text-primary">{proj.title}</span>
                        {activeWorkspace === 'archive' && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await db.projects.update(proj.id, { is_archived: false });
                            }}
                            className="text-xs text-text-primary hover:underline"
                          >
                            Unarchive
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-text-muted line-clamp-2">{proj.description}</p>
                      {activeWorkspace === 'trash' && (
                        <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-black/5 dark:border-white/5">
                          <span className="text-amber-600 font-medium">
                            Purges in {getTrashDaysRemaining(proj.deleted_at)}d
                          </span>
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleRestoreProject(proj.id); }} className="text-text-primary hover:underline">
                              Restore
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handlePurgeProject(proj.id); }} className="text-red-500 hover:underline">
                              Purge
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Archived / Deleted Subprojects Section */}
            {archivedOrDeletedSubprojects.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted uppercase tracking-wider mb-3 mt-4">
                  <Folder className="w-3.5 h-3.5" />
                  <span>Sub-projects (Sections)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archivedOrDeletedSubprojects.map((sp) => (
                    <div
                      key={sp.id}
                      onClick={() => {
                        useUIStore.setState({ selectedProjectId: null, selectedSubprojectId: sp.id, selectedNoteId: null });
                      }}
                      className="p-4 bg-card-default border border-black/5 dark:border-white/10 rounded-card cursor-pointer hover:shadow-card-hover"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-text-primary">{sp.title}</span>
                        {activeWorkspace === 'archive' && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await db.subprojects.update(sp.id, { is_archived: false });
                            }}
                            className="text-xs text-text-primary hover:underline"
                          >
                            Unarchive
                          </button>
                        )}
                      </div>
                      {activeWorkspace === 'trash' && (
                        <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-black/5 dark:border-white/5">
                          <span className="text-amber-600 font-medium">
                            Purges in {getTrashDaysRemaining(sp.deleted_at)}d
                          </span>
                          <div className="flex gap-2">
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              await db.subprojects.update(sp.id, { is_deleted: false, deleted_at: null });
                            }} className="text-text-primary hover:underline">
                              Restore
                            </button>
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              await db.subprojects.delete(sp.id);
                            }} className="text-red-500 hover:underline">
                              Purge
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pinned Notes Section */}
            {pinnedNotes.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                  <Pin className="w-3.5 h-3.5" />
                  <span>Pinned</span>
                </div>
                <div className={viewMode === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isSelected={selectedNoteId === note.id}
                      tags={noteTagsMap[note.id] || []}
                      onSelect={() => handleSelectNote(note)}
                      onPinToggle={handlePinToggle}
                      onArchive={handleArchiveNote}
                      onDelete={handleDeleteNote}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Main / Unpinned Notes Section */}
            {unpinnedNotes.length > 0 && (
              <div>
                {pinnedNotes.length > 0 && (
                  <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                    Others
                  </div>
                )}
                <div className={viewMode === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
                  {unpinnedNotes.map((note) => (
                    <div key={note.id} className="relative">
                      <NoteCard
                        note={note}
                        isSelected={selectedNoteId === note.id}
                        tags={noteTagsMap[note.id] || []}
                        onSelect={() => handleSelectNote(note)}
                        onPinToggle={handlePinToggle}
                        onArchive={handleArchiveNote}
                        onDelete={handleDeleteNote}
                      />

                      {activeWorkspace === 'trash' && (
                        <div className="mt-2 flex items-center justify-between text-xs px-1">
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Purges in {getTrashDaysRemaining(note.deleted_at)}d
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRestoreNote(note.id)}
                              className="text-text-primary hover:underline"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(note.id)}
                              className="text-red-500 hover:underline"
                            >
                              Purge
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <main className="flex-1 min-w-[320px] h-screen flex flex-col bg-bg-primary transition-all duration-200 overflow-hidden">
      <TopBar />
      <div className={`flex-1 min-w-0 p-4 sm:p-6 relative overflow-x-hidden ${getOverflowClass()}`}>
        {renderContent()}
      </div>
    </main>
  );
}
