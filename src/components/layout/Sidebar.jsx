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
  Plus,
  Tag as TagIcon,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import TagPill from '../shared/TagPill';

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
];

export default function Sidebar() {
  const {
    activeWorkspace,
    setActiveWorkspace,
    theme,
    toggleTheme,
    searchQuery,
    setSearchQuery,
    activeTagId,
    setActiveTagId,
    sidebarOpen,
    toggleSidebar,
  } = useUIStore();

  const [newTagInput, setNewTagInput] = useState('');
  const [showTagAdd, setShowTagAdd] = useState(false);

  // Fetch tags dynamically
  const tags = useLiveQuery(() => db.tags.toArray(), []) || [];

  const handleCreateTag = async (e) => {
    e.preventDefault();
    const label = newTagInput.trim().replace(/^#/, '');
    if (!label) return;

    const existing = await db.tags.where('label').equals(label).first();
    if (!existing) {
      await db.tags.add({
        id: crypto.randomUUID(),
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
        className={`hidden md:flex flex-col h-screen w-[250px] min-w-[250px] bg-bg-sidebar border-r border-black/5 dark:border-white/10 transition-all duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full absolute z-30'
        }`}
      >
        {/* Header: App Brand + Sidebar Collapse Toggle + Theme Toggle */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-black/5 dark:border-white/10">
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
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className="p-1.5 rounded-button hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleSidebar}
              title="Collapse sidebar"
              className="p-1.5 rounded-button hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="p-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search all notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-bg-primary border border-black/5 dark:border-white/10 rounded-button focus:outline-none focus:ring-1 focus:ring-text-primary/30 text-text-primary placeholder:text-text-muted"
            />
          </div>
        </div>

        {/* Workspace Navigation Links */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          <div className="px-2 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Workspaces
          </div>

          {WORKSPACE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeWorkspace === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveWorkspace(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-normal rounded-button transition-colors duration-150 ${
                  isActive
                    ? 'bg-active-nav-bg text-text-primary font-medium'
                    : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-3 px-2 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider flex items-center justify-between">
            <span>Tags</span>
            <button
              onClick={() => setShowTagAdd(!showTagAdd)}
              className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-text-muted hover:text-text-primary"
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

          <div className="pt-4 px-2 py-1 text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Utilities
          </div>

          {UTILITY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeWorkspace === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveWorkspace(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-normal rounded-button transition-colors duration-150 ${
                  isActive
                    ? 'bg-active-nav-bg text-text-primary font-medium'
                    : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
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
          className="hidden md:flex fixed left-3 top-3 z-30 p-2 bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button shadow-md text-text-muted hover:text-text-primary"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-sidebar border-t border-black/10 dark:border-white/10 flex items-center justify-around h-14 px-2">
        {WORKSPACE_NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeWorkspace === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveWorkspace(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-button ${
                isActive ? 'text-text-primary font-semibold' : 'text-text-muted'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        <button
          onClick={() => setActiveWorkspace('archive')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-button ${
            activeWorkspace === 'archive' || activeWorkspace === 'trash' ? 'text-text-primary' : 'text-text-muted'
          }`}
        >
          <Archive className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </nav>
    </>
  );
}
