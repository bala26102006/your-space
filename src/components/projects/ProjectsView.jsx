import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Folder, FolderKanban, FileText, MoreVertical, Archive, Trash2, Edit2, Check, Film, Youtube, BookOpen } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import { COLOR_OPTIONS } from '../shared/ColorPicker';
import SortableSubprojectItem from './SortableSubprojectItem';
import SortableNoteItem from './SortableNoteItem';

export default function ProjectsView() {
  const [showTemplates, setShowTemplates] = useState(false);
  const {
    selectedProjectId,
    selectedSubprojectId,
    setSelectedProjectId,
    setSelectedSubprojectId,
    selectedNoteId,
    setSelectedNoteId,
    searchQuery,
  } = useUIStore();

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // LEVEL 1: Fetch Top-level Projects
  const projects = useLiveQuery(async () => {
    const all = await db.projects.toArray();
    return all
      .filter((p) => !p.is_archived && !p.is_deleted)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, []) || [];

  // LEVEL 2: Fetch Sub-projects for current Project
  const subprojects = useLiveQuery(async () => {
    if (!selectedProjectId) return [];
    const all = await db.subprojects.where('project_id').equals(selectedProjectId).toArray();
    return all
      .filter((sp) => !sp.is_archived && !sp.is_deleted)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [selectedProjectId]) || [];

  // LEVEL 3: Fetch Notes for current Sub-project
  const subprojectNotes = useLiveQuery(async () => {
    if (!selectedSubprojectId) return [];
    const all = await db.notes.where('subproject_id').equals(selectedSubprojectId).toArray();
    return all
      .filter((n) => !n.is_archived && !n.is_deleted)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [selectedSubprojectId]) || [];

  // Data for Progress bars
  const allSubprojects = useLiveQuery(() => db.subprojects.toArray(), []) || [];
  const allNotes = useLiveQuery(() => db.notes.where('workspace_id').equals('projects').toArray(), []) || [];

  const getProjectProgressData = (projectId) => {
    const projectSubprojects = allSubprojects.filter(sp => sp.project_id === projectId && !sp.is_archived && !sp.is_deleted);
    const subprojectIds = projectSubprojects.map(sp => sp.id);
    const projectNotes = allNotes.filter(n => subprojectIds.includes(n.subproject_id) && !n.is_archived && !n.is_deleted);
    
    const total = projectNotes.length;
    if (total === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = projectNotes.filter(n => n.is_completed).length;
    const percent = Math.round((completed / total) * 100);
    return { completed, total, percent };
  };

  // Tags map for rendering notes
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

  // Actions: Create Project
  const handleCreateProject = async (template = null) => {
    const projectId = crypto.randomUUID();
    const newProject = {
      id: projectId,
      user_id: 'local_user',
      title: template ? `${template} Project` : '',
      description: '',
      color: 'default',
      is_archived: false,
      is_deleted: false,
      deleted_at: null,
      sort_order: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.projects.add(newProject);

    if (template) {
      let subNames = [];
      if (template === 'Movie Script') subNames = ['Act 1: Beginning', 'Act 2: Middle', 'Act 3: End', 'Character Bios', 'Locations'];
      else if (template === 'YouTube Video') subNames = ['Hook / Intro', 'Main Content', 'B-Roll Ideas', 'Sponsorship / Outro', 'Thumbnail Concepts'];
      else if (template === 'Novel') subNames = ['Part 1', 'Part 2', 'World Building', 'Character Arcs'];

      const subs = subNames.map((title, idx) => ({
        id: crypto.randomUUID(),
        project_id: projectId,
        title,
        sort_order: Date.now() + idx,
        is_archived: false,
        is_deleted: false,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      await db.subprojects.bulkAdd(subs);
    }

    setSelectedProjectId(projectId);
    setSelectedSubprojectId(null);
    setSelectedNoteId(null);
    setShowTemplates(false);
  };

  // Actions: Create Subproject
  const handleCreateSubproject = async (e) => {
    if (e) e.preventDefault();
    if (!selectedProjectId) return;

    const subprojectId = crypto.randomUUID();
    const newSubproject = {
      id: subprojectId,
      project_id: selectedProjectId,
      title: '',
      sort_order: Date.now(),
      is_archived: false,
      is_deleted: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.subprojects.add(newSubproject);
    setSelectedSubprojectId(subprojectId);
    setSelectedNoteId(null);
  };

  // Actions: Create Note inside Subproject
  const handleCreateSubprojectNote = async () => {
    if (!selectedProjectId || !selectedSubprojectId) return;

    const noteId = crypto.randomUUID();
    const newNote = {
      id: noteId,
      user_id: 'local_user',
      workspace_id: 'projects',
      subproject_id: selectedSubprojectId,
      note_type: 'plain',
      title: '',
      content: { type: 'doc', content: [] },
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
    setSelectedNoteId(noteId);
  };

  // DND Handler for Subprojects
  const handleDragEndSubprojects = async (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = subprojects.findIndex((item) => item.id === active.id);
      const newIndex = subprojects.findIndex((item) => item.id === over.id);
      const reordered = arrayMove(subprojects, oldIndex, newIndex);

      // Save updated sort_order in Dexie
      await db.transaction('rw', db.subprojects, async () => {
        for (let i = 0; i < reordered.length; i++) {
          await db.subprojects.update(reordered[i].id, {
            sort_order: i,
            updated_at: new Date().toISOString(),
          });
        }
      });
    }
  };

  // DND Handler for Notes within Subproject
  const handleDragEndNotes = async (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = subprojectNotes.findIndex((item) => item.id === active.id);
      const newIndex = subprojectNotes.findIndex((item) => item.id === over.id);
      const reordered = arrayMove(subprojectNotes, oldIndex, newIndex);

      // Save updated sort_order in Dexie
      await db.transaction('rw', db.notes, async () => {
        for (let i = 0; i < reordered.length; i++) {
          await db.notes.update(reordered[i].id, {
            sort_order: i,
            updated_at: new Date().toISOString(),
          });
        }
      });
    }
  };

  // Rename Subproject
  const handleRenameSubproject = async (id, title) => {
    await db.subprojects.update(id, {
      title,
      updated_at: new Date().toISOString(),
    });
  };

  // Archive / Delete handlers
  const handleArchiveProject = async (id) => {
    await db.projects.update(id, {
      is_archived: true,
      updated_at: new Date().toISOString(),
    });
    if (selectedProjectId === id) setSelectedProjectId(null);
  };

  const handleDeleteProject = async (id) => {
    await db.projects.update(id, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (selectedProjectId === id) setSelectedProjectId(null);
  };

  const handleArchiveSubproject = async (id) => {
    await db.subprojects.update(id, {
      is_archived: true,
      updated_at: new Date().toISOString(),
    });
    if (selectedSubprojectId === id) setSelectedSubprojectId(null);
  };

  const handleDeleteSubproject = async (id) => {
    await db.subprojects.update(id, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (selectedSubprojectId === id) setSelectedSubprojectId(null);
  };

  // RENDER LEVEL 3: Notes inside Sub-project
  if (selectedProjectId && selectedSubprojectId) {
    return (
      <div className="space-y-4">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Notes / Scenes
          </h2>
          <button
            onClick={handleCreateSubprojectNote}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-text-primary text-bg-primary rounded-button text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>New Scene/Note</span>
          </button>
        </div>

        {subprojectNotes.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-card p-6 text-center">
            <FileText className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs font-medium">No scenes or notes in this section yet.</p>
            <p className="text-[11px] opacity-70 mt-1">Click "+ New Scene/Note" to start writing.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndNotes}>
            <SortableContext items={subprojectNotes.map((n) => n.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subprojectNotes.map((note) => (
                  <SortableNoteItem
                    key={note.id}
                    note={note}
                    isSelected={selectedNoteId === note.id}
                    tags={noteTagsMap[note.id] || []}
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
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    );
  }

  // RENDER LEVEL 2: Sub-projects inside selected Project
  if (selectedProjectId) {
    return (
      <div className="space-y-4">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Sub-projects / Sections (Acts, Characters, Bibles)
          </h2>
          <button
            onClick={handleCreateSubproject}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-text-primary text-bg-primary rounded-button text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>New Section</span>
          </button>
        </div>

        {subprojects.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-card p-6 text-center">
            <Folder className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs font-medium">No sections created yet.</p>
            <p className="text-[11px] opacity-70 mt-1">Create sections like "Act 1", "Act 2", or "Character Bibles".</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndSubprojects}>
            <SortableContext items={subprojects.map((sp) => sp.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {subprojects.map((sp) => (
                  <SortableSubprojectItem
                    key={sp.id}
                    subproject={sp}
                    onSelect={() => setSelectedSubprojectId(sp.id)}
                    onRename={handleRenameSubproject}
                    onArchive={handleArchiveSubproject}
                    onDelete={handleDeleteSubproject}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    );
  }

  // RENDER LEVEL 1: Top-level Projects List
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Projects
          </h2>
          <p className="text-xs text-text-muted">
            3-Tier creative structure (Project → Sub-project → Scene/Note)
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 px-3 py-2 bg-text-primary text-bg-primary rounded-button text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
          
          {showTemplates && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-bg-primary border border-black/10 dark:border-white/10 rounded-lg shadow-lg z-20 py-1 flex flex-col">
              <button onClick={() => handleCreateProject(null)} className="text-left px-4 py-2 text-xs hover:bg-hover-bg flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-text-muted" /> Blank Project
              </button>
              <button onClick={() => handleCreateProject('Movie Script')} className="text-left px-4 py-2 text-xs hover:bg-hover-bg flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-500" /> Movie Script
              </button>
              <button onClick={() => handleCreateProject('YouTube Video')} className="text-left px-4 py-2 text-xs hover:bg-hover-bg flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-500" /> YouTube Video
              </button>
              <button onClick={() => handleCreateProject('Novel')} className="text-left px-4 py-2 text-xs hover:bg-hover-bg flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" /> Novel
              </button>
            </div>
          )}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-card p-8 text-center">
          <FolderKanban className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No projects created yet</p>
          <p className="text-xs opacity-70 mt-1 max-w-xs">
            Build structured scripts, YouTube content calendars, or novels with nested Acts and Scenes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            let colorClasses = 'bg-card-default border-black/5 dark:border-white/10';
            if (proj.color === 'yellow') colorClasses = 'bg-card-yellow border-yellow-200/50 dark:border-yellow-900/30';
            else if (proj.color === 'red') colorClasses = 'bg-card-red border-red-200/50 dark:border-red-900/30';
            else if (proj.color === 'blue') colorClasses = 'bg-card-blue border-blue-200/50 dark:border-blue-900/30';
            else if (proj.color === 'green') colorClasses = 'bg-card-green border-green-200/50 dark:border-green-900/30';

            const { completed, total, percent: progress } = getProjectProgressData(proj.id);
            const colorData = COLOR_OPTIONS.find(c => c.id === proj.color) || COLOR_OPTIONS[0];

            return (
            <div
              key={proj.id}
              onClick={() => {
                setSelectedProjectId(proj.id);
                setSelectedSubprojectId(null);
                setSelectedNoteId(null);
              }}
              className={`group relative rounded-card p-4 border transition-all duration-200 ease-out cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-black/40 ${colorClasses}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {proj.color !== 'default' && (
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: colorData.border }}
                    />
                  )}
                  <FolderKanban className="w-5 h-5 text-text-primary opacity-60" />
                  <h3 className="font-semibold text-base text-text-primary line-clamp-1">
                    {proj.title}
                  </h3>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchiveProject(proj.id);
                    }}
                    title="Archive project"
                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(proj.id);
                    }}
                    title="Delete project"
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-text-muted line-clamp-2 min-h-[2.5rem] mb-3">
                {proj.description || 'No description provided.'}
              </p>

              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[10px] font-mono text-text-muted">
                  {total > 0 ? `${progress}% (${completed}/${total})` : '0%'}
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
