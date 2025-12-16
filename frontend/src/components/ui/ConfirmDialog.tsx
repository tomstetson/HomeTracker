import { ReactNode, createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Trash2, Info, HelpCircle } from 'lucide-react';
import { Dialog, DialogFooter } from './Dialog';
import { Button } from './Button';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'question';

export interface ConfirmOptions {
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'question',
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'question',
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    state.resolve?.(result);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const variantConfig = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      confirmBtnClass: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      confirmBtnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      confirmBtnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    question: {
      icon: HelpCircle,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      confirmBtnClass: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    },
  };

  const config = variantConfig[state.variant || 'question'];
  const Icon = config.icon;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <Dialog open={state.isOpen} onClose={() => handleClose(false)} maxWidth="sm">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className={`p-3 rounded-full ${config.iconBg} mb-4`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {state.title}
          </h3>

          {/* Message */}
          <div className="text-sm text-muted-foreground">
            {state.message}
          </div>

          {/* Actions */}
          <DialogFooter className="w-full justify-center">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
            >
              {state.cancelText}
            </Button>
            <Button
              className={config.confirmBtnClass}
              onClick={() => handleClose(true)}
            >
              {state.confirmText}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  );
}



