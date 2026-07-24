import { useToastStore } from '@stores/useToastStore';
import { cn } from '@utils/cn';
import { AnimatePresence, motion } from 'motion/react';

const DOT_COLOR = {
  error: 'bg-terracotta',
  warning: 'bg-gold',
  success: 'bg-mist/60',
  info: 'bg-mist/60',
};

export function ToastList() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className='pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2'>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            type='button'
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            onClick={() => removeToast(toast.id)}
            className='pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-marine px-4 py-3 text-sm text-mist shadow-lg'
          >
            <span
              aria-hidden
              className={cn('size-2 shrink-0 rounded-full', DOT_COLOR[toast.type])}
            />
            {toast.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
