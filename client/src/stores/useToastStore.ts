import { create } from 'zustand';

const MAX_TOAST_COUNT = 5;
const TOAST_DURATION_MS = 4000;

type ToastType = 'success' | 'error' | 'warning' | 'info';

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastStore = {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: number) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
};

export const useToastStore = create<ToastStore>((set) => {
  let nextId = 0;

  const removeToast = (id: number) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  };

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = nextId;
    nextId += 1;

    set((state) => ({
      toasts: [...state.toasts, { id, message, type }].slice(-MAX_TOAST_COUNT),
    }));

    if (type !== 'error') {
      setTimeout(() => removeToast(id), TOAST_DURATION_MS);
    }
  };

  return {
    toasts: [],
    addToast,
    removeToast,
    showError: (message) => addToast(message, 'error'),
    showSuccess: (message) => addToast(message, 'success'),
    showWarning: (message) => addToast(message, 'warning'),
  };
});
