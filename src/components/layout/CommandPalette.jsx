import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  StickyNote, 
  FolderKanban, 
  BookOpen, 
  CheckSquare, 
  Sparkles, 
  Repeat, 
  Palette, 
  Plus, 
  Moon, 
  Sun, 
  ArrowRight, 
  X,
  FileText,
  Archive,
  Trash2,
  Settings
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';
import { createSketchNote } from '../../lib/services/sketchService';
import { generateUUID } from '../../lib/uuid';

export default function CommandPalette() {
  const { 
    isCommandPaletteOpen, 
    closeCommandPalette, 
    setActiveWorkspace, 
    setSelectedNoteId,
    toggleTheme,
    theme
  } = useUIStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Fetch all active notes for search
  const allNotes = useLiveQuery(() => 
    db.notes
      .filter(n => !n.is_deleted && !n.is_archived)
      .reverse()
      .sortBy('updated_at')
  , []) || [];

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  // Global Ctrl+K / Cmd+K and Escape listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        useUIStore.getState().setIsCommandPaletteOpen();
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        e.preventDefault();
        closeCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, closeCommandPalette]);

  // Workspaces list
  const WORKSPACES = useMemo(() => [
    { id: 'quicknotes', label: 'Quick Notes', icon: StickyNote, category: 'Workspaces' },
    { id: 'projects', label: 'Projects', icon: FolderKanban, category: 'Workspaces' },
    { id: 'journal', label: 'Journal', icon: BookOpen, category: 'Workspaces' },
    { id: 'checklists', label: 'Checklists', icon: CheckSquare, category: 'Workspaces' },
    { id: 'wishlist', label: 'Wish List', icon: Sparkles, category: 'Workspaces' },
    { id: 'routines', label: 'Routines', icon: Repeat, category: 'Workspaces' },
    { id: 'sketch', label: 'Sketch', icon: Palette, category: 'Workspaces' },
    { id: 'archive', label: 'Archive', icon: Archive, category: 'Utilities' },
    { id: 'trash', label: 'Trash', icon: Trash2, category: 'Utilities' },
    { id: 'settings', label: 'Settings', icon: Settings, category: 'Utilities' },
  ], []);

  // Quick action items
  const QUICK_ACTIONS = useMemo(() => [
    {
      id: 'action-new-note',
      label: 'Create Quick Note',
      sublabel: 'New thought or note',
      icon: Plus,
      category: 'Actions',
      run: async () => {
        const newId = generateUUID();
        await db.notes.add({
          id: newId,
          user_id: 'local_user',
          workspace_id: 'quicknotes',
          subproject_id: null,
          note_type: 'text',
          title: 'Untitled Note',
          content: '',
          color: 'default',
          is_pinned: false,
          is_archived: false,
          is_deleted: false,
          sort_order: Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setActiveWorkspace('quicknotes');
        setSelectedNoteId(newId);
        closeCommandPalette();
      }
    },
    {
      id: 'action-new-wish',
      label: 'Create New Wish',
      sublabel: 'Add item to Wish List',
      icon: Sparkles,
      category: 'Actions',
      run: async () => {
        const newId = generateUUID();
        await db.notes.add({
          id: newId,
          user_id: 'local_user',
          workspace_id: 'wishlist',
          subproject_id: null,
          note_type: 'wishlist',
          title: 'Untitled Wish',
          content: { note: '', price: 0, link: '', image: '', category: 'Buy', priority: 'Medium', status: 'Wishing' },
          color: 'default',
          category: 'Buy',
          priority: 'Medium',
          status: 'Wishing',
          is_pinned: false,
          is_archived: false,
          is_deleted: false,
          sort_order: Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setActiveWorkspace('wishlist');
        setSelectedNoteId(newId);
        closeCommandPalette();
      }
    },
    {
      id: 'action-new-sketch',
      label: 'Create New Sketch',
      sublabel: 'Canvas idea & diagram',
      icon: Palette,
      category: 'Actions',
      run: async () => {
        const newId = await createSketchNote('Untitled Sketch');
        setActiveWorkspace('sketch');
        setSelectedNoteId(newId);
        closeCommandPalette();
      }
    },
    {
      id: 'action-toggle-theme',
      label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      sublabel: 'Toggle application theme',
      icon: theme === 'dark' ? Sun : Moon,
      category: 'Actions',
      run: () => {
        toggleTheme();
        closeCommandPalette();
      }
    }
  ], [theme, setActiveWorkspace, setSelectedNoteId, toggleTheme, closeCommandPalette]);

  // Extract searchable text from content
  const extractSearchableText = (content) => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (typeof content === 'object') {
      const parts = [];
      if (content.note) parts.push(content.note);
      if (content.description) parts.push(content.description);
      if (content.category) parts.push(content.category);
      if (content.priority) parts.push(content.priority);
      if (content.status) parts.push(content.status);
      if (content.link) parts.push(content.link);
      if (Array.isArray(content.items)) {
        content.items.forEach(i => parts.push(i.text || ''));
      }
      if (content.content && Array.isArray(content.content)) {
        const recurse = (node) => {
          if (node.text) parts.push(node.text);
          if (node.content && Array.isArray(node.content)) node.content.forEach(recurse);
        };
        recurse(content);
      }
      return parts.join(' ');
    }
    return '';
  };

  // Filtered items based on query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      // Default view: Actions first, then workspaces, then recent 3 notes
      const recentNotes = allNotes.slice(0, 4).map(n => ({
        id: `note-${n.id}`,
        label: n.title || 'Untitled Note',
        sublabel: n.workspace_id,
        icon: FileText,
        category: 'Recent Notes',
        run: () => {
          setActiveWorkspace(n.workspace_id);
          setSelectedNoteId(n.id);
          closeCommandPalette();
        }
      }));

      const workspaceItems = WORKSPACES.map(ws => ({
        id: `ws-${ws.id}`,
        label: ws.label,
        sublabel: `Jump to ${ws.label}`,
        icon: ws.icon,
        category: 'Workspaces',
        run: () => {
          setActiveWorkspace(ws.id);
          closeCommandPalette();
        }
      }));

      return [...QUICK_ACTIONS, ...workspaceItems, ...recentNotes];
    }

    // When querying:
    // 1. Actions match
    const matchedActions = QUICK_ACTIONS.filter(a => 
      a.label.toLowerCase().includes(q) || a.sublabel.toLowerCase().includes(q)
    );

    // 2. Workspaces match
    const matchedWorkspaces = WORKSPACES.filter(ws => 
      ws.label.toLowerCase().includes(q)
    ).map(ws => ({
      id: `ws-${ws.id}`,
      label: ws.label,
      sublabel: `Jump to ${ws.label}`,
      icon: ws.icon,
      category: 'Workspaces',
      run: () => {
        setActiveWorkspace(ws.id);
        closeCommandPalette();
      }
    }));

    // 3. Notes search
    const matchedNotes = allNotes.filter(n => {
      const titleMatch = (n.title || '').toLowerCase().includes(q);
      const wsMatch = (n.workspace_id || '').toLowerCase().includes(q);
      const catMatch = (n.category || '').toLowerCase().includes(q);
      const statusMatch = (n.status || '').toLowerCase().includes(q);
      const contentText = extractSearchableText(n.content).toLowerCase();
      const contentMatch = contentText.includes(q);
      return titleMatch || wsMatch || catMatch || statusMatch || contentMatch;
    }).slice(0, 12).map(n => ({
      id: `note-${n.id}`,
      label: n.title || 'Untitled Note',
      sublabel: `${n.workspace_id}${n.category ? ` • ${n.category}` : ''}${n.status ? ` • ${n.status}` : ''}`,
      icon: FileText,
      category: 'Notes',
      run: () => {
        setActiveWorkspace(n.workspace_id);
        setSelectedNoteId(n.id);
        closeCommandPalette();
      }
    }));

    return [...matchedActions, ...matchedWorkspaces, ...matchedNotes];
  }, [query, QUICK_ACTIONS, WORKSPACES, allNotes, setActiveWorkspace, setSelectedNoteId, closeCommandPalette]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems.length, selectedIndex]);

  // Handle keyboard navigation inside palette
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredItems[selectedIndex];
      if (current && current.run) {
        current.run();
      }
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={closeCommandPalette}
    >
      <div 
        className="w-full max-w-xl bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150 ring-1 ring-black/5 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-black/5 dark:border-white/10 gap-3 shrink-0">
          <Search className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, workspace, or search notes..."
            aria-label="Search commands, workspaces, or notes"
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-0"
          />
          <kbd className="flex items-center gap-1 shrink-0 text-[10px] text-text-muted bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md font-mono border border-black/5 dark:border-white/5">
            ESC
          </kbd>
          <button
            onClick={closeCommandPalette}
            aria-label="Close command palette"
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-xs">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.run}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors ${
                    isSelected 
                      ? 'bg-text-primary text-bg-primary shadow-xs' 
                      : 'hover:bg-hover-bg text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isSelected ? 'bg-bg-primary/20 text-bg-primary' : 'bg-black/5 dark:bg-white/5 text-text-muted'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{item.label}</div>
                      {item.sublabel && (
                        <div className={`text-[11px] truncate mt-0.5 ${
                          isSelected ? 'text-bg-primary/70' : 'text-text-muted'
                        }`}>
                          {item.sublabel}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 pl-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-bg-primary/20 text-bg-primary' : 'bg-black/5 dark:bg-white/5 text-text-muted'
                    }`}>
                      {item.category}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'translate-x-0.5' : 'opacity-0'}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Palette Footer Shortcuts Hint */}
        <div className="px-4 py-2 border-t border-black/5 dark:border-white/10 bg-bg-primary/50 text-[11px] text-text-muted flex items-center justify-between shrink-0 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}
