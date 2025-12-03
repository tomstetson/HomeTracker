import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { create } from 'zustand';
import { cn } from '../../lib/utils';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    
    // Auto-remove after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

// Hook for easy toast usage
export const useToast = () => {
  const addToast = useToastStore((state) => state.addToast);
  
  return {
    success: (title: string, message?: string) => addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) => addToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) => addToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) => addToast({ type: 'info', title, message }),
  };
};

// Toast container component
export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

// Individual toast component
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const styles = {
    success: {
      container: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
      icon: 'text-emerald-600 dark:text-emerald-400',
      title: 'text-emerald-900 dark:text-emerald-100',
      message: 'text-emerald-700 dark:text-emerald-300',
    },
    error: {
      container: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-900 dark:text-red-100',
      message: 'text-red-700 dark:text-red-300',
    },
    warning: {
      container: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
      icon: 'text-amber-600 dark:text-amber-400',
      title: 'text-amber-900 dark:text-amber-100',
      message: 'text-amber-700 dark:text-amber-300',
    },
    info: {
      container: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-900 dark:text-blue-100',
      message: 'text-blue-700 dark:text-blue-300',
    },
  };

  const Icon = icons[toast.type];
  const style = styles[toast.type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-slide-in pointer-events-auto',
        'backdrop-blur-sm',
        style.container
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', style.icon)} />
      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold text-sm', style.title)}>{toast.title}</p>
        {toast.message && (
          <p className={cn('text-sm mt-1', style.message)}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className={cn(
          'p-1 rounded-lg transition-colors flex-shrink-0 -m-1',
          'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10'
        )}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
