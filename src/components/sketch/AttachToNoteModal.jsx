import React, { useState, useMemo } from 'react';
import { X, Search, FileText, BookOpen, FolderKanban, Check, Sparkles } from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';

export default function AttachToNoteModal({ isOpen, onClose, onAttach, sketchTitle }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWorkspace, setFilterWorkspace] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState(null);

  // Fetch all active notes from Quick Notes, Journal, and Projects
  const notes = useLiveQuery(() => 
    db.notes
      .filter(n => !n.is_deleted && !n.is_archived && ['quicknotes', 'journal', 'projects'].includes(n.workspace_id))
      .reverse()
      .sortBy('updated_at')
  , []) || [];

  // Fetch projects to resolve project names if notes are inside subprojects
  const projects = useLiveQuery(() => db.projects.toArray(), []) || [];
  const subprojects = useLiveQuery(() => db.subprojects.toArray(), []) || [];

  const projectMap = useMemo(() => {
    const map = new Map();
    projects.forEach(p => map.set(p.id, p.title));
    return map;
  }, [projects]);

  const subprojectMap = useMemo(() => {
    const map = new Map();
    subprojects.forEach(sp => map.set(sp.id, sp));
    return map;
  }, [subprojects]);

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (filterWorkspace !== 'all' && n.workspace_id !== filterWorkspace) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const titleMatch = (n.title || '').toLowerCase().includes(q);
      const textMatch = typeof n.content === 'string' && n.content.toLowerCase().includes(q);
      return titleMatch || textMatch;
    });
  }, [notes, filterWorkspace, searchQuery]);

  if (!isOpen) return null;

  const handleSelectNote = async (note) => {
    try {
      setIsSubmitting(true);
      setSelectedTargetId(note.id);
      await onAttach(note);
      setTimeout(() => {
        setIsSubmitting(false);
        setSelectedTargetId(null);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Failed to attach sketch to note:', err);
      setIsSubmitting(false);
      setSelectedTargetId(null);
    }
  };

  const getWorkspaceInfo = (workspaceId, subprojectId) => {
    switch (workspaceId) {
      case 'journal':
        return { label: 'Journal', icon: BookOpen, colorClass: 'bg-[#D6CCE0]/40 text-[#5F4B66]' };
      case 'projects': {
        let label = 'Project';
        if (subprojectId) {
          const sp = subprojectMap.get(subprojectId);
          if (sp) {
            const pTitle = projectMap.get(sp.project_id);
            label = pTitle ? `${pTitle} › ${sp.title}` : sp.title;
          }
        }
        return { label, icon: FolderKanban, colorClass: 'bg-[#B9C8D6]/40 text-[#2C485E]' };
      }
      case 'quicknotes':
      default:
        return { label: 'Quick Note', icon: FileText, colorClass: 'bg-[#E6DAB9]/40 text-[#5C4D24]' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-text-muted" />
              Save to Note
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Attach &ldquo;{sketchTitle || 'Untitled Sketch'}&rdquo; as a visual idea to any note.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-hover-bg text-text-muted transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Workspace Filter */}
        <div className="p-4 border-b border-black/5 dark:border-white/5 space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes by title..."
              className="w-full pl-9 pr-3 py-2 bg-bg-primary rounded-xl text-xs text-text-primary placeholder:text-text-muted border border-black/5 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setFilterWorkspace('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterWorkspace === 'all'
                  ? 'bg-text-primary text-bg-primary'
                  : 'bg-black/5 dark:bg-white/5 text-text-muted hover:text-text-primary'
              }`}
            >
              All Notes
            </button>
            <button
              onClick={() => setFilterWorkspace('quicknotes')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterWorkspace === 'quicknotes'
                  ? 'bg-text-primary text-bg-primary'
                  : 'bg-black/5 dark:bg-white/5 text-text-muted hover:text-text-primary'
              }`}
            >
              Quick Notes
            </button>
            <button
              onClick={() => setFilterWorkspace('projects')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterWorkspace === 'projects'
                  ? 'bg-text-primary text-bg-primary'
                  : 'bg-black/5 dark:bg-white/5 text-text-muted hover:text-text-primary'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => setFilterWorkspace('journal')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterWorkspace === 'journal'
                  ? 'bg-text-primary text-bg-primary'
                  : 'bg-black/5 dark:bg-white/5 text-text-muted hover:text-text-primary'
              }`}
            >
              Journal
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-black/5 dark:divide-white/5">
          {filteredNotes.length === 0 ? (
            <div className="py-12 text-center text-text-muted flex flex-col items-center">
              <FileText className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-xs font-medium">No matching notes found</p>
              <p className="text-[11px] opacity-70 mt-0.5">Try searching for another term or create notes first.</p>
            </div>
          ) : (
            filteredNotes.map(n => {
              const wsInfo = getWorkspaceInfo(n.workspace_id, n.subproject_id);
              const WsIcon = wsInfo.icon;
              const isSelected = selectedTargetId === n.id;

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleSelectNote(n)}
                  disabled={isSubmitting}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-3 group pt-2.5 ${
                    isSelected
                      ? 'bg-text-primary/10 border border-text-primary/20'
                      : 'hover:bg-hover-bg'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${wsInfo.colorClass}`}>
                        <WsIcon className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{wsInfo.label}</span>
                      </span>
                      {n.updated_at && (
                        <span className="text-[10px] text-text-muted">
                          {new Date(n.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-xs text-text-primary truncate group-hover:text-text-primary">
                      {n.title || 'Untitled Note'}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center pl-2">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-green-600 dark:text-green-400">
                        <Check className="w-4 h-4" /> Attached!
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-text-muted opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-black/5 dark:bg-white/10 rounded-lg">
                        Attach
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-black/5 dark:border-white/10 flex items-center justify-end shrink-0 bg-bg-primary/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
