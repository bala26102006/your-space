import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Maximize, Minimize, LayoutGrid, List, ArrowDownUp, ChevronDown, Columns } from 'lucide-react';
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
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    setSelectedNoteId,
  } = useUIStore();

  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortButtonRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const handleOpenSortMenu = () => {
    if (sortButtonRef.current) {
      const rect = sortButtonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    }
    setSortMenuOpen((prev) => !prev);
  };

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
        setSelectedNoteId(null);
      }
    });
  };

  switch (activeWorkspace) {
    case 'today':
      addWorkspaceCrumb('Today');
      break;
    case 'quicknotes':
      addWorkspaceCrumb('Quick Notes');
      break;

    case 'projects':
      addWorkspaceCrumb('Projects');
      if (activeProject) {
        breadcrumbs.push({
          label: activeProject.title,
          onClick: () => {
            setSelectedSubprojectId(null);
            setSelectedNoteId(null);
          }
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
      <div className="flex items-center gap-2.5">
        {/* Sort Controls: Desc/Asc Toggle + Portal Menu */}
        <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-button p-0.5 border border-black/5 dark:border-white/10" ref={sortButtonRef}>
          <button 
            type="button"
            onClick={() => {
              setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
            }}
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-button text-xs font-medium text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title={
              activeWorkspace === 'sketch'
                ? `Current sort: ${sortBy === 'title' ? 'Title' : sortBy === 'created' ? 'Created date' : 'Last edited'} (${sortOrder === 'desc' ? 'Descending' : 'Ascending'}). Click to reverse.`
                : sortBy === 'title'
                ? 'Sorted by Title (click to toggle order)'
                : sortOrder === 'desc'
                ? 'Newest first (click to toggle Oldest first)'
                : 'Oldest first (click to toggle Newest first)'
            }
            aria-label="Toggle sort order"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            <span className="capitalize">
              {activeWorkspace === 'sketch' ? (
                sortBy === 'title'
                  ? `Title ${sortOrder === 'desc' ? 'Z–A' : 'A–Z'}`
                  : sortBy === 'created'
                  ? `Created ${sortOrder === 'desc' ? '↓' : '↑'}`
                  : `Edited ${sortOrder === 'desc' ? '↓' : '↑'}`
              ) : (
                sortBy === 'title' ? 'Title A–Z' : sortOrder === 'desc' ? 'Desc' : 'Asc'
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={handleOpenSortMenu}
            className={`h-8 w-6 flex items-center justify-center rounded-button text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
              sortMenuOpen ? 'bg-black/10 dark:bg-white/10 text-text-primary' : ''
            }`}
            title="Sort options menu"
            aria-label="Sort options menu"
            aria-expanded={sortMenuOpen}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Portal-rendered Sort Menu (never clipped by parents) */}
        {sortMenuOpen && typeof document !== 'undefined' && createPortal(
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setSortMenuOpen(false)} 
            />
            <div 
              className="fixed z-50 w-44 bg-bg-sidebar border border-black/10 dark:border-white/10 shadow-xl rounded-xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5"
              style={{ top: `${menuPos.top}px`, right: `${menuPos.right}px` }}
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider select-none border-b border-black/5 dark:border-white/10">
                {activeWorkspace === 'sketch' ? 'Sort Sketches' : activeWorkspace === 'quicknotes' ? 'Sort Notes' : 'Sort Timeline'}
              </div>

              {activeWorkspace === 'sketch' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('updated');
                      setSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                      (sortBy === 'updated' || (!sortBy || sortBy === 'date'))
                        ? 'bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] font-semibold'
                        : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary'
                    }`}
                  >
                    <span>Last edited</span>
                    <span className="text-[10px] opacity-60 font-mono">Recent</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('created');
                      setSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                      sortBy === 'created'
                        ? 'bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] font-semibold'
                        : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary'
                    }`}
                  >
                    <span>Created date</span>
                    <span className="text-[10px] opacity-60 font-mono">Date</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('title');
                      setSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                      sortBy === 'title'
                        ? 'bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] font-semibold'
                        : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary'
                    }`}
                  >
                    <span>Title A–Z</span>
                    <span className="text-[10px] opacity-60 font-mono">A-Z</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('date');
                      setSortOrder('desc');
                      setSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                      sortBy === 'date' && sortOrder === 'desc'
                        ? 'bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] font-semibold'
                        : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary'
                    }`}
                  >
                    <span>Newest first</span>
                    <span className="text-[10px] opacity-60 font-mono">Desc</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('date');
                      setSortOrder('asc');
                      setSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                      sortBy === 'date' && sortOrder === 'asc'
                        ? 'bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] font-semibold'
                        : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary'
                    }`}
                  >
                    <span>Oldest first</span>
                    <span className="text-[10px] opacity-60 font-mono">Asc</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('title');
                      setSortOrder('asc');
                      setSortMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                      sortBy === 'title'
                        ? 'bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] font-semibold'
                        : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary'
                    }`}
                  >
                    <span>Title A–Z</span>
                    <span className="text-[10px] opacity-60 font-mono">A-Z</span>
                  </button>
                </>
              )}
            </div>
          </>,
          document.body
        )}

        <div className="w-px h-5 bg-black/10 dark:bg-white/10"></div>

        {/* View Toggle (36px height, vertically centered, clear active highlight) */}
        <div className="h-9 flex items-center bg-black/5 dark:bg-white/5 rounded-button p-1 border border-black/5 dark:border-white/10 gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`h-7 w-7 flex items-center justify-center rounded-button transition-all ${
              viewMode === 'grid'
                ? 'bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] shadow-xs font-semibold'
                : 'text-text-muted hover:text-text-primary'
            }`}
            title="Grid View"
            aria-label="Switch to grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          {activeWorkspace === 'sketch' && (
            <button
              onClick={() => setViewMode('wall')}
              className={`h-7 w-7 flex items-center justify-center rounded-button transition-all ${
                viewMode === 'wall'
                  ? 'bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] shadow-xs font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Wall View (Pin-board)"
              aria-label="Switch to wall pin-board view"
            >
              <Columns className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setViewMode('list')}
            className={`h-7 w-7 flex items-center justify-center rounded-button transition-all ${
              viewMode === 'list'
                ? 'bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] shadow-xs font-semibold'
                : 'text-text-muted hover:text-text-primary'
            }`}
            title="List View"
            aria-label="Switch to list view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 bg-black/10 dark:bg-white/10"></div>

        {/* Focus Mode Toggle (36px height) */}
        <button
          onClick={() => setFocusMode(!focusMode)}
          className="h-9 w-9 flex items-center justify-center rounded-button text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
          aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
        >
          {focusMode ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
