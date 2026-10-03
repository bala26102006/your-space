import React, { useEffect, useState } from 'react';
import { useUIStore } from './store/uiStore';
import { initWorkspaces } from './lib/db';
import Sidebar from './components/layout/Sidebar';
import GridListPane from './components/layout/GridListPane';
import EditorPane from './components/layout/EditorPane';
import AuthScreen from './components/auth/AuthScreen';
import { supabase } from './lib/supabaseClient';
import { pullFromCloud } from './lib/sync/syncEngine';

export default function App() {
  const { focusMode, theme, selectedNoteId, selectedSubprojectId } = useUIStore();
  const [session, setSession] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        pullFromCloud();
      }
      setAuthChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        pullFromCloud();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  if (authChecking) {
    return <div className="flex h-screen w-screen items-center justify-center bg-bg-primary text-text-primary">Loading...</div>;
  }

  if (!session) {
    return <AuthScreen onLogin={() => {}} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary text-text-primary selection:bg-active-nav-bg">
      {!focusMode && (
        <>
          <Sidebar session={session} />
          <GridListPane />
        </>
      )}

      {/* Editor Pane (slides in from right or centered in Focus Mode) */}
      <EditorPane />
    </div>
  );
}
