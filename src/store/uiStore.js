import { create } from 'zustand';

export const useUIStore = create((set) => ({
  activeWorkspace: 'quicknotes',
  activePane: 'grid', // 'sidebar', 'grid', 'editor'
  viewMode: 'grid',
  sortBy: 'date',
  sortOrder: 'desc',
  isFocusMode: false,
  isSidebarCollapsed: false,
  theme: localStorage.getItem('theme') || 'light',
  activeModal: null,
  user: { id: 'local-user-123', email: 'local@yourspace.app' },

  setUser: (user) => {
    set({ user });
  },
  
  // Backward compatibility fields so UI components do not break
  selectedNoteId: null,
  selectedProjectId: null,
  selectedSubprojectId: null,
  focusMode: false,
  searchQuery: '',
  activeTagId: null,
  sidebarOpen: true,
  selectedChecklistCategory: null,
  selectedWishlistFolderId: null,

  setActiveWorkspace: (workspaceId) =>
    set({
      activeWorkspace: workspaceId,
      selectedNoteId: null,
      selectedProjectId: null,
      selectedSubprojectId: null,
      selectedChecklistCategory: null,
      selectedWishlistFolderId: null,
      searchQuery: '',
      activeTagId: null,
    }),

  setActivePane: (pane) => set({ activePane: pane }),
  setActiveModal: (modal) => set({ activeModal: modal }),

  setSelectedChecklistCategory: (category) => set({ selectedChecklistCategory: category }),
  setSelectedWishlistFolderId: (id) => set({ selectedWishlistFolderId: id }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedNoteId: (noteId) => set({ selectedNoteId: noteId }),
  setSelectedProjectId: (projectId) => set({ selectedProjectId: projectId, selectedSubprojectId: null, selectedNoteId: null }),
  setSelectedSubprojectId: (subprojectId) => set({ selectedSubprojectId: subprojectId, selectedNoteId: null }),

  setIsFocusMode: (mode) => set((state) => {
    const newVal = typeof mode === 'boolean' ? mode : !state.isFocusMode;
    return { isFocusMode: newVal, focusMode: newVal };
  }),
  setFocusMode: (mode) => set((state) => {
    const newVal = typeof mode === 'boolean' ? mode : !state.focusMode;
    return { focusMode: newVal, isFocusMode: newVal };
  }),
  
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: nextTheme };
    }),

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveTagId: (tagId) => set((state) => ({ activeTagId: state.activeTagId === tagId ? null : tagId })),
  
  setIsSidebarCollapsed: (collapsed) => set((state) => {
    const newVal = typeof collapsed === 'boolean' ? collapsed : !state.isSidebarCollapsed;
    return { isSidebarCollapsed: newVal, sidebarOpen: !newVal };
  }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen, isSidebarCollapsed: state.sidebarOpen })),
}));
