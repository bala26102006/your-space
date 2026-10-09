import { create } from 'zustand';

export const useConfirmStore = create((set) => ({
  isOpen: false,
  type: 'soft', // 'soft' | 'permanent'
  title: '',
  count: 1,
  onConfirm: null,
  onCancel: null,

  openSoftDelete: ({ title, count = 1, onConfirm, onCancel }) =>
    set({
      isOpen: true,
      type: 'soft',
      title: title || 'Untitled',
      count,
      onConfirm,
      onCancel,
    }),

  openPermanentDelete: ({ title, count = 1, onConfirm, onCancel }) =>
    set({
      isOpen: true,
      type: 'permanent',
      title: title || 'Untitled',
      count,
      onConfirm,
      onCancel,
    }),

  close: () => set({ isOpen: false, onConfirm: null, onCancel: null }),
}));
