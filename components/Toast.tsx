import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { audio } from '../services/audioService';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: () => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(onRemove, 5000);
    
    // Play sound on mount
    if (toast.type === 'success') audio.playSuccess();
    else if (toast.type === 'error') audio.playError();
    else audio.playClick();

    return () => clearTimeout(timer);
  }, [toast.type, onRemove]);

  const icons = {
    success: <CheckCircle className="text-emerald-500" size={18} />,
    error: <AlertCircle className="text-red-500" size={18} />,
    info: <Info className="text-blue-500" size={18} />,
    warning: <AlertCircle className="text-amber-500" size={18} />,
  };

  const borders = {
    success: 'border-emerald-500/50 bg-emerald-950/90',
    error: 'border-red-500/50 bg-red-950/90',
    info: 'border-blue-500/50 bg-blue-950/90',
    warning: 'border-amber-500/50 bg-amber-950/90',
  };

  return (
    <div 
      className={`pointer-events-auto flex items-center gap-3 p-4 rounded border backdrop-blur-md shadow-2xl min-w-[300px] animate-in slide-in-from-right fade-in duration-300 ${borders[toast.type]}`}
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <div className="flex-1 font-mono text-xs font-bold tracking-tight text-white uppercase">
        {toast.message}
      </div>
      <button 
        onClick={onRemove}
        className="text-slate-400 hover:text-white transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};
