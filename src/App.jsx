import React, { useEffect } from 'react';
import { useUIStore } from './store/uiStore';
import { initWorkspaces } from './lib/db';
import { autoPurgeOldTrash } from './lib/services/trashService';
import Sidebar from './components/layout/Sidebar';
import GridListPane from './components/layout/GridListPane';
import EditorPane from './components/layout/EditorPane';
import CommandPalette from './components/layout/CommandPalette';
import DeleteConfirmModal from './components/shared/DeleteConfirmModal';
import ToastContainer from './components/shared/ToastContainer';

export default function App() {
  const { focusMode, theme, activeWorkspace } = useUIStore();

  useEffect(() => {
    // Seed database workspaces if needed
    initWorkspaces();

    // Auto-purge soft-deleted items older than 7 days on app load
    autoPurgeOldTrash();

    // Support Light, Dark, and System modes with live system listener
    const applyTheme = () => {
      let isDark = false;
      if (theme === 'dark') {
        isDark = true;
      } else if (theme === 'system' || !theme) {
        isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDark = false;
      }

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    if ((theme === 'system' || !theme) && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(listener);
        return () => mediaQuery.removeListener(listener);
      }
    }
  }, [theme]);

  // Apply workspace, data-panel, & warm theme style attribute to document.documentElement for universal styling & portals
  useEffect(() => {
    document.documentElement.setAttribute('data-workspace', activeWorkspace);
    if (activeWorkspace === 'journal') {
      document.documentElement.setAttribute('data-style', 'warm');
    } else {
      document.documentElement.removeAttribute('data-style');
    }

    const panelMap = {
      quicknotes: 'notes',
      projects: 'projects',
      checklists: 'checklists',
      wishlist: 'wishlist',
      routines: 'routines',
      sketch: 'sketch',
      today: 'today',
    };
    const panelValue = panelMap[activeWorkspace];
    if (panelValue) {
      document.documentElement.setAttribute('data-panel', panelValue);
    } else {
      document.documentElement.removeAttribute('data-panel');
    }

    try {
      localStorage.setItem('activeWorkspace', activeWorkspace);
    } catch (e) {}

    return () => {
      document.documentElement.removeAttribute('data-style');
      document.documentElement.removeAttribute('data-panel');
    };
  }, [activeWorkspace]);

  // Defensive guard against accidental horizontal shift
  useEffect(() => {
    const lockScrollLeft = () => {
      if (window.scrollX > 0) window.scrollTo(0, window.scrollY);
      if (document.documentElement.scrollLeft > 0) document.documentElement.scrollLeft = 0;
      if (document.body.scrollLeft > 0) document.body.scrollLeft = 0;
      const root = document.getElementById('root');
      if (root && root.scrollLeft > 0) root.scrollLeft = 0;
    };
    window.addEventListener('scroll', lockScrollLeft, { passive: true });
    return () => window.removeEventListener('scroll', lockScrollLeft);
  }, []);

  return (
    <div
      data-workspace={activeWorkspace}
      onScroll={(e) => {
        if (e.currentTarget.scrollLeft > 0) {
          e.currentTarget.scrollLeft = 0;
        }
      }}
      className="flex flex-row h-dvh w-screen max-w-[100vw] overflow-x-clip overflow-y-hidden min-w-0 bg-bg-primary text-text-primary"
    >
      {!focusMode && (
        <>
          <Sidebar />
          <GridListPane />
        </>
      )}

      {/* Editor Pane (slides in from right or centered in Focus Mode) */}
      <EditorPane />

      {/* Futuristic Command Palette (Ctrl+K / Cmd+K) */}
      <CommandPalette />

      {/* Global Delete Confirmation Modal (Soft & Permanent) */}
      <DeleteConfirmModal />

      {/* Global Toast Notification System */}
      <ToastContainer />
    </div>
  );
}
