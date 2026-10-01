import React from 'react';
import { ChevronRight, Folder, FolderKanban, FileText } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';

export default function ProjectBreadcrumbs() {
  const {
    selectedProjectId,
    selectedSubprojectId,
    setSelectedProjectId,
    setSelectedSubprojectId,
    setSelectedNoteId,
  } = useUIStore();

  const project = useLiveQuery(() => {
    if (!selectedProjectId) return null;
    return db.projects.get(selectedProjectId);
  }, [selectedProjectId]);

  const subproject = useLiveQuery(() => {
    if (!selectedSubprojectId) return null;
    return db.subprojects.get(selectedSubprojectId);
  }, [selectedSubprojectId]);

  if (!selectedProjectId) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-4 flex-wrap">
      <button
        onClick={() => {
          setSelectedProjectId(null);
          setSelectedSubprojectId(null);
          setSelectedNoteId(null);
        }}
        className="flex items-center gap-1 hover:text-text-primary transition-colors font-medium"
      >
        <FolderKanban className="w-3.5 h-3.5" />
        <span>Projects</span>
      </button>

      <ChevronRight className="w-3.5 h-3.5 opacity-40" />

      <button
        onClick={() => {
          setSelectedSubprojectId(null);
          setSelectedNoteId(null);
        }}
        className={`flex items-center gap-1 transition-colors ${
          !selectedSubprojectId ? 'text-text-primary font-semibold' : 'hover:text-text-primary font-medium'
        }`}
      >
        <Folder className="w-3.5 h-3.5 text-amber-500 opacity-80" />
        <span>{project?.title || 'Untitled Project'}</span>
      </button>

      {subproject && (
        <>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <button
            onClick={() => setSelectedNoteId(null)}
            className="flex items-center gap-1 text-text-primary font-semibold hover:opacity-80 transition-opacity"
          >
            <FileText className="w-3.5 h-3.5 text-blue-500 opacity-80" />
            <span>{subproject.title || 'Untitled Section'}</span>
          </button>
        </>
      )}
    </nav>
  );
}
