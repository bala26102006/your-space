import React, { useState, useEffect } from 'react';
import { X, Pin, Archive, Trash2, Tag as TagIcon, Maximize2, Minimize2, Plus, ArrowRightLeft, Sparkles, Loader2 } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import { useDebouncedSave } from '../../hooks/useDebouncedSave';
import SavedIndicator from '../cards/SavedIndicator';
import { summarizeText, expandIdea } from '../../lib/ai';
import { exportProjectToPDF, exportProjectToWord } from '../../lib/export';
import ColorPicker, { getCardColorStyle } from '../shared/ColorPicker';
import TipTapEditor from '../editor/TipTapEditor';
import ChecklistEditor from '../editor/ChecklistEditor';
import WishlistEditor from '../editor/WishlistEditor';
import RoutinesEditor from '../routines/RoutinesEditor';
import SketchEditor from '../sketch/SketchEditor';
import JournalEditor from '../journal/JournalEditor';
import TagPill from '../shared/TagPill';
import TodayDashboard from './TodayDashboard';
import { STARTER_KITS, getStarterKitItems } from '../../lib/starterKits';
import { generateUUID } from '../../lib/uuid';
import { softDeleteItem, archiveItem, unarchiveItem } from '../../lib/services/trashService';
import { useConfirmStore } from '../../store/confirmStore';

export default function EditorPane() {
  const { selectedNoteId, setSelectedNoteId, selectedSubprojectId, setSelectedSubprojectId, selectedProjectId, setSelectedProjectId, focusMode, setFocusMode } = useUIStore();
  const { openSoftDelete } = useConfirmStore();
  const { saveStatus, triggerSave } = useDebouncedSave(1000);
  const [sketchFullscreen, setSketchFullscreen] = useState(false);

  // Fetch current selected note
  const note = useLiveQuery(() => {
    if (!selectedNoteId) return null;
    if (selectedNoteId.startsWith('starter-kit-')) {
      const kit = STARTER_KITS.find(k => k.id === selectedNoteId);
      if (!kit) return null;
      return {
        id: kit.id,
        workspace_id: 'checklists',
        title: kit.title,
        content: { isTemplate: true, isStarterKit: true, items: [] },
        is_pinned: false,
        is_archived: false,
        is_deleted: false,
      };
    }
    return db.notes.get(selectedNoteId);
  }, [selectedNoteId]);

  // Fetch current selected subproject (only if no note is selected)
  const subproject = useLiveQuery(() => {
    if (!selectedNoteId && selectedSubprojectId) {
      return db.subprojects.get(selectedSubprojectId);
    }
    return null;
  }, [selectedNoteId, selectedSubprojectId]);

  // Fetch current selected project (only if no note and no subproject is selected)
  const project = useLiveQuery(() => {
    if (!selectedNoteId && !selectedSubprojectId && selectedProjectId) {
      return db.projects.get(selectedProjectId);
    }
    return null;
  }, [selectedNoteId, selectedSubprojectId, selectedProjectId]);

  const activeItem = note || subproject || project;
  const isProject = !!project && !subproject && !note;
  const isSubproject = !!subproject && !note;

  // Fetch tags for current note
  const noteTags = useLiveQuery(async () => {
    if (!selectedNoteId || isSubproject) return [];
    const joins = await db.note_tags.where('note_id').equals(selectedNoteId).toArray();
    const tagIds = joins.map((j) => j.tag_id);
    return db.tags.where('id').anyOf(tagIds).toArray();
  }, [selectedNoteId, isSubproject]) || [];

  const allTags = useLiveQuery(() => db.tags.toArray(), []) || [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState(null);
  const [color, setColor] = useState('default');
  const [isPinned, setIsPinned] = useState(false);
  const [mood, setMood] = useState(null);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Fetch all projects/subprojects for "Send to Project" menu
  const allProjects = useLiveQuery(() => db.projects.toArray(), []) || [];
  const allSubprojects = useLiveQuery(() => db.subprojects.toArray(), []) || [];

  const handleSendToProject = async (subprojectId) => {
    await db.notes.update(selectedNoteId, {
      workspace_id: 'projects',
      subproject_id: subprojectId,
      updated_at: new Date().toISOString()
    });
    setShowSendMenu(false);
    setSelectedNoteId(null);
  };

  // Sync local editor state when selected item changes
  useEffect(() => {
    if (activeItem) {
      setTitle(activeItem.title || '');
      if (isProject || isSubproject) {
        setDescription(activeItem.description || '');
      } else {
        setContent(activeItem.content || null);
        setColor(activeItem.color || 'default');
        setIsPinned(activeItem.is_pinned || false);
        setMood(activeItem.mood || null);
      }
    }
  }, [activeItem?.id, isProject, isSubproject]);

  // Folder fetching for Starter Kits
  const folders = useLiveQuery(async () => {
    const checklists = await db.notes.where('workspace_id').equals('checklists').toArray();
    const cats = new Set();
    checklists.forEach(c => {
      if (c.category && c.category !== 'Starter Kits') cats.add(c.category);
    });
    return Array.from(cats).sort();
  }) || [];
  
  const [selectedFolder, setSelectedFolder] = useState('');
  
  const handleUseTemplate = async () => {
    if (!activeItem || !activeItem.content?.isStarterKit) return;
    const kitItems = getStarterKitItems(activeItem.id);
    
    const newId = generateUUID();
    const newNote = {
      ...activeItem,
      id: newId,
      category: selectedFolder || (folders.length > 0 ? folders[0] : 'Uncategorized'),
      content: { ...activeItem.content, isTemplate: false, isStarterKit: false },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await db.notes.add(newNote);
    
    const dbItems = kitItems.map(item => ({
      ...item,
      id: generateUUID(),
      note_id: newId,
    }));
    await db.checklist_items.bulkAdd(dbItems);
    
    setSelectedNoteId(newId);
  };

  if (!activeItem) {
    return null;
  }

  // Handle Title Edits
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    triggerSave(async () => {
      if (isProject) {
        await db.projects.update(selectedProjectId, {
          title: val,
          updated_at: new Date().toISOString(),
        });
      } else if (isSubproject) {
        await db.subprojects.update(selectedSubprojectId, {
          title: val,
          updated_at: new Date().toISOString(),
        });
      } else {
        await db.notes.update(selectedNoteId, {
          title: val,
          updated_at: new Date().toISOString(),
        });
      }
    });
  };

  const handleDescriptionChange = (e) => {
    const val = e.target.value;
    setDescription(val);
    triggerSave(async () => {
      if (isProject) {
        await db.projects.update(selectedProjectId, {
          description: val,
          updated_at: new Date().toISOString(),
        });
      } else if (isSubproject) {
        await db.subprojects.update(selectedSubprojectId, {
          description: val,
          updated_at: new Date().toISOString(),
        });
      }
    });
  };

  // Handle Editor Content Edits
  const handleEditorChange = (newContentOrWrapper) => {
    if (isProject || isSubproject) return;
    const json = newContentOrWrapper?.json !== undefined ? newContentOrWrapper.json : newContentOrWrapper;
    setContent(json);
    triggerSave(async () => {
      const patch = {
        content: json,
        updated_at: new Date().toISOString(),
      };
      if (note?.workspace_id === 'wishlist' && typeof json === 'object') {
        if (json.category) patch.category = json.category;
        if (json.priority) patch.priority = json.priority;
        if (json.status) {
          patch.status = json.status;
          patch.is_completed = json.status === 'Got it';
          if (json.status === 'Got it') {
            patch.got_it_at = note?.got_it_at || new Date().toISOString();
          }
        }
        if (json.price !== undefined) patch.price = json.price;
        if (json.link !== undefined) patch.link = json.link;
        if (json.image !== undefined) patch.image = json.image;
        if (json.targetDate !== undefined) patch.target_date = json.targetDate;
      }
      await db.notes.update(selectedNoteId, patch);
    });
  };

  // Handle Color Edits
  const handleColorChange = (newColor) => {
    setColor(newColor);
    triggerSave(async () => {
      if (isProject) {
        await db.projects.update(selectedProjectId, {
          color: newColor,
          updated_at: new Date().toISOString(),
        });
      } else if (isSubproject) {
        await db.subprojects.update(selectedSubprojectId, {
          color: newColor,
          updated_at: new Date().toISOString(),
        });
      } else {
        await db.notes.update(selectedNoteId, {
          color: newColor,
          updated_at: new Date().toISOString(),
        });
      }
    });
  };

  const handleAISummarize = async () => {
    if (!content) return;
    setIsAILoading(true);
    setAiSuggestion(null);
    
    let text = '';
    const extractText = (node) => {
      if (node.type === 'text') text += node.text + ' ';
      if (node.content) node.content.forEach(extractText);
    };
    if (content.content) content.content.forEach(extractText);

    try {
      const summary = await summarizeText(text, selectedNoteId);
      if (summary) {
        setAiSuggestion({ type: 'summarize', text: summary });
      }
    } catch (e) {
      console.error(e);
      alert('AI Error: ' + e.message);
    } finally {
      setIsAILoading(false);
    }
  };

  const handleAIExpand = async () => {
    if (!content) return;
    setIsAILoading(true);
    setAiSuggestion(null);
    
    let text = '';
    const extractText = (node) => {
      if (node.type === 'text') text += node.text + ' ';
      if (node.content) node.content.forEach(extractText);
    };
    if (content.content) content.content.forEach(extractText);

    try {
      const expanded = await expandIdea(text, selectedNoteId);
      if (expanded) {
        setAiSuggestion({ type: 'expand', text: expanded });
      }
    } catch (e) {
      console.error(e);
      alert('AI Error: ' + e.message);
    } finally {
      setIsAILoading(false);
    }
  };

  const applyAISuggestion = () => {
    if (!aiSuggestion || !content) return;
    
    const newContent = {
      ...content,
      content: [
        ...content.content,
        { type: 'paragraph', content: [{ type: 'text', text: aiSuggestion.type === 'summarize' ? `**Summary:**\n${aiSuggestion.text}` : aiSuggestion.text }] }
      ]
    };
    setContent(newContent);
    setAiSuggestion(null);
    triggerSave(async () => {
      await db.notes.update(selectedNoteId, {
        content: newContent,
        updated_at: new Date().toISOString(),
      });
    });
  };

  const rejectAISuggestion = () => {
    setAiSuggestion(null);
  };

  // Handle Pin Toggle
  const handlePinToggle = () => {
    if (isProject || isSubproject) return;
    const nextPin = !isPinned;
    setIsPinned(nextPin);
    triggerSave(async () => {
      await db.notes.update(selectedNoteId, {
        is_pinned: nextPin,
        updated_at: new Date().toISOString(),
      });
    });
  };

  // Handle Mood Edits
  const handleMoodChange = (e) => {
    if (isProject || isSubproject) return;
    const newMood = e.target.value;
    setMood(newMood);
    triggerSave(async () => {
      await db.notes.update(selectedNoteId, {
        mood: newMood,
        updated_at: new Date().toISOString(),
      });
    });
  };

  // Handle Soft-Delete
  const handleDelete = () => {
    const itemTitle = isProject ? project?.title : isSubproject ? subproject?.title : note?.title;
    const finalTitle = itemTitle || (isProject ? 'Untitled project' : isSubproject ? 'Untitled section' : 'Untitled note');

    openSoftDelete({
      title: finalTitle,
      onConfirm: async () => {
        if (isProject) {
          await softDeleteItem({
            id: selectedProjectId,
            type: 'project',
            title: finalTitle,
            workspace: 'projects',
          });
          setSelectedProjectId(null);
        } else if (isSubproject) {
          await softDeleteItem({
            id: selectedSubprojectId,
            type: 'subproject',
            title: finalTitle,
            workspace: 'projects',
          });
          setSelectedSubprojectId(null);
        } else {
          await softDeleteItem({
            id: selectedNoteId,
            type: 'note',
            title: finalTitle,
            workspace: note?.workspace_id || 'quicknotes',
          });
          setSelectedNoteId(null);
        }
      },
    });
  };

  // Handle Archive
  const handleArchive = async () => {
    const itemTitle = isProject ? project?.title : isSubproject ? subproject?.title : note?.title;
    const finalTitle = itemTitle || (isProject ? 'Untitled project' : isSubproject ? 'Untitled section' : 'Untitled note');
    const isCurrentlyArchived = activeItem?.is_archived;

    if (isCurrentlyArchived) {
      if (isProject) {
        await unarchiveItem({ id: selectedProjectId, type: 'project', title: finalTitle, workspace: 'projects' });
        setSelectedProjectId(null);
      } else if (isSubproject) {
        await unarchiveItem({ id: selectedSubprojectId, type: 'subproject', title: finalTitle, workspace: 'projects' });
        setSelectedSubprojectId(null);
      } else {
        await unarchiveItem({ id: selectedNoteId, type: 'note', title: finalTitle, workspace: note?.workspace_id || 'quicknotes' });
        setSelectedNoteId(null);
      }
    } else {
      if (isProject) {
        await archiveItem({ id: selectedProjectId, type: 'project', title: finalTitle, workspace: 'projects' });
        setSelectedProjectId(null);
      } else if (isSubproject) {
        await archiveItem({ id: selectedSubprojectId, type: 'subproject', title: finalTitle, workspace: 'projects' });
        setSelectedSubprojectId(null);
      } else {
        await archiveItem({ id: selectedNoteId, type: 'note', title: finalTitle, workspace: note?.workspace_id || 'quicknotes' });
        setSelectedNoteId(null);
      }
    }
  };

  // Tag Management inside Editor
  const handleToggleTag = async (tagId) => {
    const existing = await db.note_tags.get([selectedNoteId, tagId]);
    if (existing) {
      await db.note_tags.delete([selectedNoteId, tagId]);
    } else {
      await db.note_tags.add({ note_id: selectedNoteId, tag_id: tagId });
    }
  };

  const handleCreateAndAttachTag = async (e) => {
    e.preventDefault();
    const label = newTagInput.trim().replace(/^#/, '');
    if (!label) return;

    let tag = await db.tags.where('label').equals(label).first();
    if (!tag) {
      const tagId = generateUUID();
      tag = { id: tagId, label, color: '#5F6368', created_at: new Date().toISOString() };
      await db.tags.add(tag);
    }

    await handleToggleTag(tag.id);
    setNewTagInput('');
  };

  if (!activeItem) {
    return (
      <aside
        className={`fixed md:relative right-0 top-0 bottom-0 z-30 h-screen transition-all duration-150 ease-out bg-bg-primary border-l border-black/10 dark:border-white/10 flex flex-col min-w-0 overflow-hidden ${
          focusMode ? 'w-full max-w-3xl mx-auto border-none' : 'w-full md:w-[480px] lg:w-[540px]'
        } translate-x-full md:translate-x-0`}
      >
        <TodayDashboard />
      </aside>
    );
  }

  if (note?.workspace_id === 'routines') {
    return (
      <aside
        className={`fixed md:relative right-0 top-0 bottom-0 z-30 h-screen transition-all duration-150 ease-out bg-bg-primary border-l border-black/10 dark:border-white/10 flex flex-col min-w-0 overflow-hidden ${
          focusMode ? 'w-full max-w-3xl mx-auto border-none' : 'w-full md:w-[480px] lg:w-[540px]'
        } translate-x-0`}
      >
        <RoutinesEditor note={note} onClose={() => setSelectedNoteId(null)} />
      </aside>
    );
  }

  if (note?.workspace_id === 'sketch') {
    return (
      <aside
        className={`fixed top-0 bottom-0 z-50 h-screen transition-all duration-150 ease-out bg-bg-primary flex flex-col min-w-0 overflow-hidden ${
          sketchFullscreen
            ? 'inset-0 w-screen h-screen'
            : (focusMode 
                ? 'right-0 md:relative w-full max-w-4xl mx-auto border-none' 
                : 'right-0 md:relative w-full md:w-[540px] lg:w-[680px] xl:w-[820px] 2xl:flex-1 border-l border-black/10 dark:border-white/10')
        }`}
      >
        <SketchEditor 
          note={note} 
          onClose={() => {
            setSketchFullscreen(false);
            setSelectedNoteId(null);
          }}
          isFullscreen={sketchFullscreen}
          onToggleFullscreen={() => setSketchFullscreen(prev => !prev)}
        />
      </aside>
    );
  }

  if (note?.workspace_id === 'journal') {
    return (
      <aside
        className={`fixed md:relative right-0 top-0 bottom-0 z-30 h-screen transition-all duration-150 ease-out bg-bg-primary border-l border-black/10 dark:border-white/10 flex flex-col min-w-0 overflow-hidden ${
          focusMode ? 'w-full max-w-3xl mx-auto border-none' : 'w-full md:w-[480px] lg:w-[540px]'
        } translate-x-0`}
      >
        <JournalEditor note={note} onClose={() => setSelectedNoteId(null)} />
      </aside>
    );
  }

  return (
    <aside
      className={`fixed md:relative right-0 top-0 bottom-0 z-30 h-screen transition-all duration-150 ease-out bg-bg-primary border-l border-black/10 dark:border-white/10 flex flex-col min-w-0 overflow-hidden ${
        focusMode ? 'w-full max-w-3xl mx-auto border-none' : 'w-full md:w-[480px] lg:w-[540px]'
      } translate-x-0`}
    >
      {/* Editor Header Bar */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isProject) setSelectedProjectId(null);
              else if (isSubproject) setSelectedSubprojectId(null);
              else setSelectedNoteId(null);
            }}
            className="p-1.5 rounded-button hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary"
            title="Close editor"
          >
            <X className="w-4 h-4" />
          </button>
          <SavedIndicator status={saveStatus} />
        </div>

        {/* Editor Actions Toolbar */}
        <div className="flex items-center gap-1.5 text-text-muted">
          {!isProject && !isSubproject && note?.workspace_id === 'journal' && (
             <select 
               value={mood || ''} 
               onChange={handleMoodChange}
               className="text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded px-2 py-1 text-text-primary focus:outline-none h-[28px]"
             >
               <option value="">No mood</option>
               <option value="Calm">Calm 😌</option>
               <option value="Restless">Restless 🏃</option>
               <option value="Grateful">Grateful 🙏</option>
               <option value="Tired">Tired 😴</option>
             </select>
          )}

          <ColorPicker currentColor={color} onChange={handleColorChange} />

          {!isProject && !isSubproject && (
            <button
              onClick={handlePinToggle}
              className={`p-1.5 rounded-button hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
                isPinned ? 'text-amber-500 fill-amber-500' : ''
              }`}
              title={isPinned ? 'Unpin' : 'Pin note'}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
            </button>
          )}

          <button
            onClick={handleArchive}
            className="p-1.5 rounded-button hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title={activeItem.is_archived ? 'Unarchive' : 'Archive'}
          >
            <Archive className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            className="p-1.5 rounded-button hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors"
            title="Move to trash"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setFocusMode(!focusMode)}
            className="p-1.5 rounded-button hover:bg-black/5 dark:hover:bg-white/10 transition-colors ml-1"
            title={focusMode ? 'Exit Focus Mode' : 'Focus Mode (Ctrl+.)'}
          >
            {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {!isProject && !isSubproject && note?.workspace_id === 'quicknotes' && (
            <div className="relative ml-2">
              <button
                onClick={() => setShowSendMenu(!showSendMenu)}
                className="flex items-center gap-1 px-2 py-1 bg-text-primary text-bg-primary rounded text-xs font-medium hover:opacity-90 transition-opacity"
                title="Send to Project"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Move</span>
              </button>
              {showSendMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 max-h-64 overflow-y-auto bg-bg-primary border border-black/10 dark:border-white/10 rounded-lg shadow-lg z-20 py-2">
                  <div className="px-3 pb-2 text-xs font-semibold text-text-muted border-b border-black/5 dark:border-white/5 mb-1">
                    Select Destination
                  </div>
                  {allProjects.filter(p => !p.is_deleted && !p.is_archived).map(proj => (
                    <div key={proj.id} className="mb-1">
                      <div className="px-3 py-1 text-xs font-bold text-text-primary truncate">{proj.title || 'Untitled'}</div>
                      {allSubprojects.filter(sp => sp.project_id === proj.id && !sp.is_deleted && !sp.is_archived).map(sp => (
                        <button
                          key={sp.id}
                          onClick={() => handleSendToProject(sp.id)}
                          className="w-full text-left pl-6 pr-3 py-1.5 text-xs hover:bg-hover-bg text-text-muted hover:text-text-primary truncate"
                        >
                          ↳ {sp.title || 'Untitled Section'}
                        </button>
                      ))}
                    </div>
                  ))}
                  {allProjects.length === 0 && (
                    <div className="px-3 py-2 text-xs text-text-muted">No active projects found.</div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {isProject && (
            <div className="flex items-center gap-1 ml-2 border-l border-black/10 dark:border-white/10 pl-2">
              <button
                onClick={() => exportProjectToPDF(selectedProjectId)}
                className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded text-xs font-medium hover:bg-red-500/20 transition-colors"
                title="Export to PDF"
              >
                <span>PDF</span>
              </button>
              <button
                onClick={() => exportProjectToWord(selectedProjectId)}
                className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs font-medium hover:bg-blue-500/20 transition-colors"
                title="Export to Word"
              >
                <span>Word</span>
              </button>
            </div>
          )}

          {!isProject && !isSubproject && note?.workspace_id !== 'journal' && note?.workspace_id !== 'checklists' && note?.workspace_id !== 'wishlist' && (
            <div className="flex items-center gap-1 ml-2 border-l border-black/10 dark:border-white/10 pl-2">
              <button
                onClick={handleAISummarize}
                disabled={isAILoading}
                className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded text-xs font-medium hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                title="AI Summarize"
              >
                {isAILoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Summarize</span>
              </button>
              <button
                onClick={handleAIExpand}
                disabled={isAILoading}
                className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                title="AI Expand Idea"
              >
                {isAILoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Expand</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Body Canvas */}
      <div className={`flex-1 overflow-y-auto p-6 flex flex-col ${isProject || isSubproject ? '' : getCardColorStyle(color)} transition-colors duration-200`}>
        {/* Title Input */}
        <input
          type="text"
          placeholder={isProject ? "Project Title..." : isSubproject ? "Section Title..." : "Title..."}
          value={title}
          onChange={handleTitleChange}
          className="w-full text-2xl font-bold bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted mb-4"
        />

        {!isProject && !isSubproject && (
          <>
            {/* Tag Manager Toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-1.5 relative">
              {noteTags.map((tag) => (
                <TagPill
                  key={tag.id}
                  label={tag.label}
                  onRemove={() => handleToggleTag(tag.id)}
                />
              ))}

              <button
                type="button"
                onClick={() => setShowTagMenu(!showTagMenu)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-text-muted hover:text-text-primary bg-black/5 dark:bg-white/10 rounded-full"
              >
                <Plus className="w-3 h-3" />
                <span>Add tag</span>
              </button>

              {showTagMenu && (
                <div className="absolute left-0 top-7 z-20 w-48 p-2 bg-bg-primary border border-black/10 dark:border-white/10 rounded-button shadow-lg text-xs">
                  <form onSubmit={handleCreateAndAttachTag} className="mb-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="New tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      className="w-full px-2 py-1 bg-bg-sidebar border border-black/10 dark:border-white/10 rounded text-text-primary"
                    />
                  </form>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {allTags.map((t) => {
                      const isAttached = noteTags.some((nt) => nt.id === t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleToggleTag(t.id)}
                          className={`w-full text-left px-2 py-1 rounded flex items-center justify-between hover:bg-hover-bg ${
                            isAttached ? 'font-medium text-text-primary' : 'text-text-muted'
                          }`}
                        >
                          <span>#{t.label}</span>
                          {isAttached && <span>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Specialized Editors */}
            <div className="flex-1">
              {note?.workspace_id === 'wishlist' ? (
                <WishlistEditor content={content} onChange={handleEditorChange} />
              ) : note?.workspace_id === 'checklists' ? (
                <ChecklistEditor noteId={selectedNoteId} content={content} onChange={handleEditorChange} />
              ) : (
                <TipTapEditor content={content} onChange={handleEditorChange} />
              )}
            </div>
          </>
        )}

        {(isProject || isSubproject) && (
          <div className="flex-1">
            <textarea
              placeholder={isProject ? "Description or logline of this project..." : "Description or summary of this section..."}
              value={description}
              onChange={handleDescriptionChange}
              className="w-full h-full bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted resize-none"
            />
          </div>
        )}
      </div>

      {aiSuggestion && (
        <div className="border-t border-black/10 dark:border-white/10 p-4 bg-purple-50/50 dark:bg-purple-900/10 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium text-sm">
            <Sparkles className="w-4 h-4" />
            AI Suggestion ({aiSuggestion.type === 'summarize' ? 'Summary' : 'Expansion'}):
          </div>
          <div className="text-sm text-text-primary bg-bg-primary p-3 rounded border border-black/10 dark:border-white/10 max-h-40 overflow-y-auto whitespace-pre-wrap">
            {aiSuggestion.text}
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <button onClick={rejectAISuggestion} className="px-3 py-1.5 text-xs text-text-muted hover:bg-black/5 dark:hover:bg-white/10 rounded">
              Discard
            </button>
            <button onClick={applyAISuggestion} className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">
              Add to Note
            </button>
          </div>
        </div>
      )}

      {/* Starter Kit Use Template Bar */}
      {activeItem?.content?.isStarterKit && (
        <div className="border-t border-black/10 dark:border-white/10 p-4 bg-bg-sidebar flex items-center justify-between">
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="text-sm bg-bg-primary border border-black/10 dark:border-white/10 rounded px-3 py-2 text-text-primary focus:outline-none"
          >
            <option value="">Select Folder...</option>
            {folders.map(f => <option key={f} value={f}>{f}</option>)}
            {folders.length === 0 && <option value="Uncategorized">Uncategorized</option>}
          </select>
          <button
            onClick={handleUseTemplate}
            className="px-5 py-2 bg-blue-500 text-white rounded-button text-sm font-semibold hover:bg-blue-600 transition-colors shadow"
          >
            Use This Template
          </button>
        </div>
      )}
    </aside>
  );
}
