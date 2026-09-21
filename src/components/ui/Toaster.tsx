import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

const iconMap = {
  success: <CheckCircle2 className="size-5 text-success-400" />,
  warning: <AlertTriangle className="size-5 text-warning-400" />,
  error: <XCircle className="size-5 text-danger-400" />,
  info: <Info className="size-5 text-azure-400" />,
};

export function Toaster() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2.5 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'glass pointer-events-auto flex items-start gap-3 rounded-xl p-4 shadow-soft-lg',
            )}
          >
            {iconMap[toast.variant]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-base-50">{toast.title}</p>
              {toast.description && <p className="mt-0.5 text-xs text-base-300">{toast.description}</p>}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-base-400 hover:text-base-50 focus-ring rounded"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
