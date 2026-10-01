import React from 'react';
import { Plus, StickyNote, Archive, Trash2, Pin, FolderKanban, Folder } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import NoteCard from '../cards/NoteCard';
import ProjectsView from '../projects/ProjectsView';
import JournalView from '../journal/JournalView';
import WishListView from '../wishlist/WishListView';
import ChecklistsView from '../checklists/ChecklistsView';
import TopBar from './TopBar';

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
      setActiveWorkspace(note.workspace_id);
      
      if (note.workspace_id === 'projects' && note.subproject_id) {
        const sp = await db.subprojects.get(note.subproject_id);
        if (sp) {
          setSelectedProjectId(sp.project_id);
          setSelectedSubprojectId(note.subproject_id);
        }
      } else {
        setSelectedProjectId(null);
        setSelectedSubprojectId(null);
      }
      
      setSearchQuery('');
      setActiveTagId(null);
    }
    setSelectedNoteId(note.id);
  };

  // Actions
  const handleCreateNote = async () => {
    const newId = crypto.randomUUID();
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
      await db.notes.update(noteId, {
        is_archived: !note.is_archived,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const handleDeleteNote = async (noteId) => {
    const note = await db.notes.get(noteId);
    if (note) {
      await db.notes.update(noteId, {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
      }
    }
  };

  const handleRestoreNote = async (noteId) => {
    await db.notes.update(noteId, {
      is_deleted: false,
      is_archived: false,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    });
  };

  const handlePermanentDelete = async (noteId) => {
    await db.notes.delete(noteId);
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
    }
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
    }
    return 'overflow-y-auto';
  };

  const renderContent = () => {
    if (activeWorkspace === 'projects' && !isGlobalView) return <ProjectsView />;
    if (activeWorkspace === 'journal' && !isGlobalView) return <JournalView />;
    if (activeWorkspace === 'wishlist' && !isGlobalView) return <WishListView />;
    if (activeWorkspace === 'checklists' && !isGlobalView) return <ChecklistsView />;

    return (
      <>
        {/* Pane Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold capitalize text-text-primary">
              {isGlobalView ? (searchQuery ? `Search: "${searchQuery}"` : 'Tag Filter') : activeWorkspace}
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              {activeWorkspace === 'quicknotes' && 'Instant thoughts & fast color-coded cards'}
              {activeWorkspace === 'archive' && 'Hidden notes and projects'}
              {activeWorkspace === 'trash' && 'Soft-deleted items (auto-purged after 7 days)'}
              {activeWorkspace !== 'quicknotes' &&
                activeWorkspace !== 'archive' &&
                activeWorkspace !== 'trash' &&
                `${filteredNotes.length} item(s)`}
            </p>
          </div>

          {activeWorkspace !== 'archive' && activeWorkspace !== 'trash' && (
            <button
              onClick={handleCreateNote}
              className="flex items-center gap-1.5 px-3 py-2 bg-text-primary text-bg-primary rounded-button text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
          )}
        </div>

        {/* Main Grid View */}
        {filteredNotes.length === 0 &&
        archivedOrDeletedProjects.length === 0 &&
        archivedOrDeletedSubprojects.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-card p-8 text-center">
            <StickyNote className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No items here yet</p>
            <p className="text-xs opacity-70 mt-1 max-w-xs">
              {activeWorkspace === 'quicknotes'
                ? 'Click "+ New Note" to capture your first thought.'
                : 'Items will appear here as you create or archive/trash them.'}
            </p>
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
                    <div key={proj.id} className="p-4 bg-card-default border border-black/5 dark:border-white/10 rounded-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-text-primary">{proj.title}</span>
                        {activeWorkspace === 'archive' && (
                          <button
                            onClick={async () => {
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
                            <button onClick={() => handleRestoreProject(proj.id)} className="text-text-primary hover:underline">
                              Restore
                            </button>
                            <button onClick={() => handlePurgeProject(proj.id)} className="text-red-500 hover:underline">
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
                    <div key={sp.id} className="p-4 bg-card-default border border-black/5 dark:border-white/10 rounded-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-text-primary">{sp.title}</span>
                        {activeWorkspace === 'archive' && (
                          <button
                            onClick={async () => {
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
                            <button onClick={async () => {
                              await db.subprojects.update(sp.id, { is_deleted: false, deleted_at: null });
                            }} className="text-text-primary hover:underline">
                              Restore
                            </button>
                            <button onClick={async () => {
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
    <main className="flex-1 h-screen flex flex-col bg-bg-primary transition-all duration-200 overflow-hidden">
      <TopBar />
      <div className={`flex-1 p-6 relative ${getOverflowClass()}`}>
        {renderContent()}
      </div>
    </main>
  );
}
