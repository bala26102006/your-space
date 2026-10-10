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

  return (
    <div
      data-workspace={activeWorkspace}
      className="flex h-screen w-screen max-w-[100vw] overflow-hidden min-w-0 bg-bg-primary text-text-primary selection:bg-active-nav-bg"
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
