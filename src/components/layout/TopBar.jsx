import React from 'react';
import { ChevronRight, Maximize, Minimize, LayoutGrid, List, ArrowDownUp } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';

export default function TopBar() {
  const {
    activeWorkspace,
    setActiveWorkspace,
    selectedProjectId,
    setSelectedProjectId,
    selectedSubprojectId,
    setSelectedSubprojectId,
    selectedChecklistCategory,
    setSelectedChecklistCategory,
    selectedWishlistFolderId,
    setSelectedWishlistFolderId,
    focusMode,
    setFocusMode,
    sortOrder,
    setSortOrder,
    viewMode,
    setViewMode,
  } = useUIStore();

  // Fetch names for breadcrumbs
  const activeProject = useLiveQuery(async () => {
    if (!selectedProjectId) return null;
    return await db.projects.get(selectedProjectId);
  }, [selectedProjectId]);

  const activeSubproject = useLiveQuery(async () => {
    if (!selectedSubprojectId) return null;
    return await db.subprojects.get(selectedSubprojectId);
  }, [selectedSubprojectId]);

  const activeWishlistFolder = useLiveQuery(async () => {
    if (!selectedWishlistFolderId) return null;
    return await db.wishlist_folders.get(selectedWishlistFolderId);
  }, [selectedWishlistFolderId]);

  // Construct breadcrumbs
  const breadcrumbs = [];

  const addWorkspaceCrumb = (label) => {
    breadcrumbs.push({
      label,
      onClick: () => {
        // Reset sub-navigation when clicking root workspace crumb
        if (activeWorkspace === 'projects') {
          setSelectedProjectId(null);
          setSelectedSubprojectId(null);
        } else if (activeWorkspace === 'checklists') {
          setSelectedChecklistCategory(null);
        } else if (activeWorkspace === 'wishlist') {
          setSelectedWishlistFolderId(null);
        }
      }
    });
  };

  switch (activeWorkspace) {
    case 'quicknotes':
      addWorkspaceCrumb('Quick Notes');
      break;
    case 'projects':
      addWorkspaceCrumb('Projects');
      if (activeProject) {
        breadcrumbs.push({
          label: activeProject.title,
          onClick: () => setSelectedSubprojectId(null)
        });
      }
      if (activeSubproject) {
        breadcrumbs.push({
          label: activeSubproject.title,
          onClick: null // Last item
        });
      }
      break;
    case 'journal':
      addWorkspaceCrumb('Journal');
      break;
    case 'checklists':
      addWorkspaceCrumb('Checklists');
      if (selectedChecklistCategory) {
        breadcrumbs.push({
          label: selectedChecklistCategory,
          onClick: null
        });
      }
      break;
    case 'wishlist':
      addWorkspaceCrumb('Wish List');
      if (activeWishlistFolder) {
        breadcrumbs.push({
          label: activeWishlistFolder.name,
          onClick: null
        });
      }
      break;
    case 'routines':
      addWorkspaceCrumb('Routines');
      break;
    case 'sketch':
      addWorkspaceCrumb('Sketch');
      break;
    case 'archive':
      addWorkspaceCrumb('Archive');
      break;
    case 'trash':
      addWorkspaceCrumb('Trash');
      break;
    default:
      addWorkspaceCrumb(activeWorkspace);
  }

  return (
    <div className="flex-shrink-0 h-14 bg-bg-primary border-b border-black/5 dark:border-white/10 flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-4 h-4 text-text-muted" />}
              <button
                onClick={crumb.onClick}
                disabled={isLast || !crumb.onClick}
                className={`transition-colors ${
                  isLast
                    ? 'text-text-primary cursor-default'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {crumb.label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* View Controls */}
      <div className="flex items-center gap-3">
        {/* Sort Dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-button text-xs font-medium text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <ArrowDownUp className="w-4 h-4" />
            <span className="capitalize">{sortOrder}</span>
          </button>
          
          <div className="absolute right-0 mt-1 w-32 bg-bg-sidebar border border-black/10 dark:border-white/10 shadow-lg rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
            {['date', 'name', 'priority'].map(opt => (
              <button
                key={opt}
                onClick={() => setSortOrder(opt)}
                className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                  sortOrder === opt 
                    ? 'bg-active-nav-bg text-text-primary font-medium' 
                    : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary'
                }`}
              >
                <span className="capitalize">{opt}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-4 bg-black/10 dark:bg-white/10"></div>

        {/* View Toggle */}
        <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-button p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-sm transition-colors ${
              viewMode === 'grid' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-sm transition-colors ${
              viewMode === 'list' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-4 bg-black/10 dark:bg-white/10"></div>

        {/* Focus Mode Toggle */}
        <button
          onClick={() => setFocusMode(!focusMode)}
          className="p-1.5 rounded-button text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
        >
          {focusMode ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
