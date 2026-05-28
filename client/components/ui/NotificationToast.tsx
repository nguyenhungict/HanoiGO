'use client';

import React from 'react';
import { 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  X 
} from 'lucide-react';
import { NotificationType, useNotification } from '@/hooks/use-notification';

interface NotificationToastProps {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ 
  id, 
  type, 
  title, 
  message 
}) => {
  const { hide } = useNotification();

  const styles = {
    info: {
      bg: 'bg-blue-50/80',
      border: 'border-blue-200/50',
      icon: <Info className="w-5 h-5 text-blue-500" />,
      title: 'text-blue-900',
      message: 'text-blue-700'
    },
    success: {
      bg: 'bg-emerald-50/80',
      border: 'border-emerald-200/50',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      title: 'text-emerald-900',
      message: 'text-emerald-700'
    },
    warning: {
      bg: 'bg-amber-50/80',
      border: 'border-amber-200/50',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      title: 'text-amber-900',
      message: 'text-amber-700'
    },
    error: {
      bg: 'bg-rose-50/80',
      border: 'border-rose-200/50',
      icon: <XCircle className="w-5 h-5 text-rose-500" />,
      title: 'text-rose-900',
      message: 'text-rose-700'
    }
  };

  const currentStyle = styles[type];

  return (
    <div 
      className={`
        pointer-events-auto flex w-full max-w-md overflow-hidden rounded-2xl 
        backdrop-blur-xl border ${currentStyle.border} ${currentStyle.bg}
        shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]
        animate-slide-in-right
      `}
    >
      <div className="flex w-full items-start gap-4 p-4">
        <div className="flex-shrink-0 pt-0.5">
          {currentStyle.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${currentStyle.title}`}>
            {title}
          </p>
          {message && (
            <p className={`mt-1 text-xs font-medium opacity-80 ${currentStyle.message}`}>
              {message}
            </p>
          )}
        </div>
        <button
          onClick={() => hide(id)}
          className="flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-black/5"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      
      {/* Progress Bar (Optional) */}
      <div className="absolute bottom-0 left-0 h-1 bg-black/5 w-full">
         <div 
           className={`h-full bg-current opacity-20 animate-toast-progress`} 
           style={{ animationDuration: '5000ms' }}
         />
      </div>
    </div>
  );
};
