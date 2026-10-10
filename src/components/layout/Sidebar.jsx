import React, { useState } from 'react';
import {
  StickyNote,
  FolderKanban,
  BookOpen,
  CheckSquare,
  Sparkles,
  Repeat,
  Palette,
  Archive,
  Trash2,
  Search,
  Sun,
  Moon,
  Monitor,
  Plus,
  Tag as TagIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import { supabase } from '../../lib/supabaseClient';
import TagPill from '../shared/TagPill';
import { generateUUID } from '../../lib/uuid';

const WORKSPACE_NAV_ITEMS = [
  { id: 'quicknotes', label: 'Quick Notes', icon: StickyNote },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'checklists', label: 'Checklists', icon: CheckSquare },
  { id: 'wishlist', label: 'Wish List', icon: Sparkles },
  { id: 'routines', label: 'Routines', icon: Repeat },
  { id: 'sketch', label: 'Sketch', icon: Palette },
];

const UTILITY_NAV_ITEMS = [
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'trash', label: 'Trash', icon: Trash2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const {
    activeWorkspace,
    setActiveWorkspace,
    theme,
    setTheme,
    toggleTheme,
    searchQuery,
    setSearchQuery,
    activeTagId,
    setActiveTagId,
    sidebarOpen,
    toggleSidebar,
  } = useUIStore();

  const handleCycleTheme = () => {
    let nextTheme = 'dark';
    if (theme === 'light') nextTheme = 'dark';
    else if (theme === 'dark') nextTheme = 'system';
    else nextTheme = 'light';
    setTheme(nextTheme);
  };

  const [newTagInput, setNewTagInput] = useState('');
  const [showTagAdd, setShowTagAdd] = useState(false);

  // Fetch tags dynamically
  const tags = useLiveQuery(() => db.tags.toArray(), []) || [];

  // Fetch count of archived and trashed items for badges
  const archiveCount = useLiveQuery(async () => {
    try {
      const notes = await db.notes.filter(n => Boolean(n.is_archived)).count();
      const projects = await db.projects.filter(p => Boolean(p.is_archived)).count();
      const subprojects = await db.subprojects.filter(sp => Boolean(sp.is_archived)).count();
      return notes + projects + subprojects;
    } catch (e) {
      return 0;
    }
  }, []) || 0;

  const trashCount = useLiveQuery(async () => {
    try {
      const notes = await db.notes.filter(n => Boolean(n.is_deleted)).count();
      const projects = await db.projects.filter(p => Boolean(p.is_deleted)).count();
      const subprojects = await db.subprojects.filter(sp => Boolean(sp.is_deleted)).count();
      return notes + projects + subprojects;
    } catch (e) {
      return 0;
    }
  }, []) || 0;

  const handleCreateTag = async (e) => {
    e.preventDefault();
    const label = newTagInput.trim().replace(/^#/, '');
    if (!label) return;

    const existing = await db.tags.where('label').equals(label).first();
    if (!existing) {
      await db.tags.add({
        id: generateUUID(),
        label,
        color: '#5F6368',
        created_at: new Date().toISOString(),
      });
    }
    setNewTagInput('');
    setShowTagAdd(false);
  };

  return (
    <>
      {/* Desktop Sidebar (250px) */}
      <aside
        className={`flex flex-col h-full min-h-0 w-[250px] min-w-[250px] bg-bg-sidebar border-r border-black/5 dark:border-[var(--border-color)] transition-all duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full absolute z-30'
        }`}
      >
        {/* Header: App Brand + Sidebar Collapse Toggle + Theme Toggle */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-black/5 dark:border-[var(--divider-color)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-text-primary text-bg-primary flex items-center justify-center font-bold text-xs">
              YS
            </div>
            <span className="font-semibold text-sm tracking-tight text-text-primary">
              Your Space
            </span>
          </div>

          <div className="flex items-center gap-1 text-text-muted">
            <button
              onClick={handleCycleTheme}
              title={
                theme === 'light'
                  ? 'Theme: Light (click for Dark)'
                  : theme === 'dark'
                  ? 'Theme: Dark (click for System)'
                  : 'Theme: System (click for Light)'
              }
              aria-label={
                theme === 'light'
                  ? 'Theme: Light (click for Dark)'
                  : theme === 'dark'
                  ? 'Theme: Dark (click for System)'
                  : 'Theme: System (click for Light)'
              }
              className="p-1.5 rounded-button hover:bg-black/5 dark:hover:bg-[var(--hover-bg)] transition-colors relative group"
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : theme === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Monitor className="w-4 h-4 text-sky-400" />
              )}
            </button>
            <button
              onClick={toggleSidebar}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="p-1.5 rounded-button hover:bg-black/5 dark:hover:bg-[var(--hover-bg)] transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Search Bar & Command Palette Trigger */}
        <div className="p-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search notes... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-12 py-1.5 text-xs bg-bg-primary border border-black/5 dark:border-[var(--border-color)] rounded-button focus:outline-none focus:ring-1 focus:ring-text-primary/30 text-text-primary placeholder:text-text-muted"
            />
            <button
              type="button"
              onClick={() => useUIStore.getState().openCommandPalette()}
              className="absolute right-2 top-2 px-1.5 py-0.5 text-[10px] font-mono text-text-muted bg-black/5 dark:bg-white/5 rounded border border-black/5 dark:border-[var(--border-color)] hover:text-text-primary"
              title="Open Command Palette (Ctrl+K)"
              aria-label="Open Command Palette (Ctrl+K)"
            >
              ⌘K
            </button>
          </div>
        </div>

        {/* Workspace Navigation Links */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-0.5 pb-12">
          <div className="px-2 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
            Workspaces
          </div>

          {WORKSPACE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeWorkspace === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveWorkspace(item.id)}
                style={
                  isActive
                    ? {
                        backgroundColor: `var(--accent-${item.id}-bg)`,
                        color: 'var(--text-primary)',
                      }
                    : undefined
                }
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-normal rounded-button transition-colors duration-150 ${
                  isActive
                    ? 'font-medium shadow-xs'
                    : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-primary'
                }`}
              >
                <Icon
                  className="w-4 h-4 transition-colors duration-150"
                  style={{
                    color: isActive ? `var(--accent-${item.id})` : undefined,
                  }}
                />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-3 px-2 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center justify-between">
            <span>Tags</span>
            <button
              onClick={() => setShowTagAdd(!showTagAdd)}
              className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-text-muted hover:text-text-primary"
              aria-label="Add new tag"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {showTagAdd && (
            <form onSubmit={handleCreateTag} className="px-2 py-1">
              <input
                type="text"
                autoFocus
                placeholder="New tag name..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-bg-primary border border-black/10 dark:border-white/10 rounded focus:outline-none text-text-primary"
              />
            </form>
          )}

          <div className="flex flex-wrap gap-1 px-2 py-1">
            {tags.map((tag) => (
              <TagPill
                key={tag.id}
                label={tag.label}
                active={activeTagId === tag.id}
                onClick={() => setActiveTagId(tag.id)}
              />
            ))}
            {tags.length === 0 && !showTagAdd && (
              <span className="text-[11px] text-text-muted italic px-1">No tags created</span>
            )}
          </div>

          <div className="pt-4 px-2 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
            Utilities
          </div>

          {UTILITY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeWorkspace === item.id;
            const count = item.id === 'archive' ? archiveCount : item.id === 'trash' ? trashCount : 0;
            return (
              <button
                key={item.id}
                onClick={() => setActiveWorkspace(item.id)}
                style={
                  isActive
                    ? {
                        backgroundColor: `var(--accent-${item.id}-bg)`,
                        color: 'var(--text-primary)',
                      }
                    : undefined
                }
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-normal rounded-button transition-colors duration-150 ${
                  isActive
                    ? 'font-medium shadow-xs'
                    : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-primary'
                }`}
              >
                <Icon
                  className="w-4 h-4 transition-colors duration-150"
                  style={{
                    color: isActive ? `var(--accent-${item.id})` : undefined,
                  }}
                />
                <span>{item.label}</span>
                {count > 0 && (
                  <span
                    className={`ml-auto px-1.5 py-0.2 text-[10px] font-semibold rounded-full border ${
                      item.id === 'trash'
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                        : 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/20'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}


        </div>
      </aside>

      {/* Floating Reopen Button when Sidebar is Collapsed on Desktop */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          title="Open sidebar"
          aria-label="Open sidebar"
          className="flex fixed left-3 top-3 z-30 p-2 bg-bg-sidebar border border-black/10 dark:border-[var(--border-color)] rounded-button shadow-md text-text-muted hover:text-text-primary"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}


    </>
  );
}
