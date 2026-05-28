import { create } from 'zustand';

export type ConfirmType = 'danger' | 'warning' | 'success' | 'info';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmType;
}

interface ConfirmStore {
  isOpen: boolean;
  options: ConfirmOptions;
  resolve: ((value: boolean) => void) | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  onConfirm: () => void;
  onCancel: () => void;
}

const DEFAULT_OPTIONS: ConfirmOptions = {
  title: 'Confirm',
  message: 'Are you sure?',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  type: 'danger',
};

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  isOpen: false,
  options: DEFAULT_OPTIONS,
  resolve: null,
  confirm: (options) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        options: { ...DEFAULT_OPTIONS, ...options },
        resolve,
      });
    });
  },
  onConfirm: () => {
    const { resolve } = get();
    if (resolve) resolve(true);
    set({ isOpen: false, resolve: null });
  },
  onCancel: () => {
    const { resolve } = get();
    if (resolve) resolve(false);
    set({ isOpen: false, resolve: null });
  },
}));
