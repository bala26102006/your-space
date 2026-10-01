import React from 'react';
import { Folder, MoreVertical, Archive, Trash2, Layers } from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { getProjectSubItemCount } from '../../lib/queries/cardSummary';

export default function ProjectCard({ project, tags = [], onSelect, onArchive, onDelete }) {
  const subprojectsCount = useLiveQuery(() => 
    project ? getProjectSubItemCount(project.id) : 0
  , [project?.id]) || 0;
  return (
    <div
      onClick={onSelect}
      className="group relative rounded-card p-4 border border-black/5 dark:border-white/10 bg-card-default transition-all duration-200 cursor-pointer hover:shadow-card-hover dark:hover:shadow-card-hover-dark"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-text-primary">
          <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />
          <h3 className="font-semibold text-base line-clamp-1">{project?.title || 'Untitled Project'}</h3>
        </div>
      </div>
      <div className="text-xs text-text-muted line-clamp-2 min-h-[2.5rem]">
        {project?.description || 'No description provided.'}
      </div>
      
      {/* Actionable Metadata */}
      <div className="mt-3 flex items-center gap-1.5 w-max px-2 py-0.5 rounded text-[10px] font-medium bg-black/5 dark:bg-white/10 text-text-muted border border-black/5 dark:border-white/5">
        <Layers className="w-3 h-3" />
        <span>{subprojectsCount} sub-projects</span>
      </div>

      {/* Tags Footer */}
      {tags.length > 0 && (
        <div className="mt-3 pt-2 flex flex-wrap gap-1 border-t border-black/5 dark:border-white/5">
          {tags.map((tag) => (
            <span key={tag.id || tag} className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-text-muted text-[10px] font-medium border border-black/5 dark:border-white/5">
              #{typeof tag === 'string' ? tag : tag.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
