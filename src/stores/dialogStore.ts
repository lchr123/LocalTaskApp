/**
 * Dialog Store
 *
 * Global state management for in-app dialogs.
 * Replaces window.alert / window.confirm with a unified app-internal dialog.
 */

import { create } from 'zustand';

export interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'alert' | 'confirm';
}

interface DialogState {
  visible: boolean;
  options: DialogOptions;
  resolve: ((value: boolean) => void) | null;
}

interface DialogActions {
  showAlert: (options: Omit<DialogOptions, 'type'>) => Promise<void>;
  showConfirm: (options: Omit<DialogOptions, 'type'>) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const useDialogStore = create<DialogState & DialogActions>((set, get) => ({
  visible: false,
  options: { message: '' },
  resolve: null,

  showAlert: (options) => {
    return new Promise<void>((resolve) => {
      set({
        visible: true,
        options: { ...options, type: 'alert' },
        resolve: () => resolve(),
      });
    });
  },

  showConfirm: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        visible: true,
        options: { ...options, type: 'confirm' },
        resolve,
      });
    });
  },

  handleConfirm: () => {
    const { resolve } = get();
    set({ visible: false, resolve: null });
    resolve?.(true);
  },

  handleCancel: () => {
    const { resolve } = get();
    set({ visible: false, resolve: null });
    resolve?.(false);
  },
}));

/**
 * Convenience functions for use outside React components.
 */
export const appDialog = {
  alert: (options: Omit<DialogOptions, 'type'>) => useDialogStore.getState().showAlert(options),
  confirm: (options: Omit<DialogOptions, 'type'>) => useDialogStore.getState().showConfirm(options),
};
