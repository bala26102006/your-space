import { create } from 'zustand';

export const useToastStore = create((set, get) => ({
  toasts: [],
  
  showToast: ({ message, action = null, duration = 4000 }) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    const toast = { id, message, action, duration };
    
    set((state) => ({
      toasts: [...state.toasts.slice(-4), toast], // Keep max 5 toasts
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }

    return id;
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
