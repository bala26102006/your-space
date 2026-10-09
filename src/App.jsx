import React, { useEffect } from 'react';
import { useUIStore } from './store/uiStore';
import { initWorkspaces } from './lib/db';
import Sidebar from './components/layout/Sidebar';
import GridListPane from './components/layout/GridListPane';
import EditorPane from './components/layout/EditorPane';
import CommandPalette from './components/layout/CommandPalette';

export default function App() {
  const { focusMode, theme } = useUIStore();

  useEffect(() => {
    // Seed database workspaces if needed
    initWorkspaces();

    // Apply dark mode class on mount
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary text-text-primary selection:bg-active-nav-bg">
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
    </div>
  );
}
