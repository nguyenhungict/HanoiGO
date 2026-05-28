'use client';

import React from 'react';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';
import { useConfirm } from '@/hooks/use-confirm';

export const ConfirmDialog: React.FC = () => {
  const { isOpen, options, onConfirm, onCancel } = useConfirm();

  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      icon: <Trash2 className="w-6 h-6 text-rose-500" />,
      bg: 'bg-rose-50',
      button: 'bg-rose-500 hover:bg-rose-600 shadow-rose-200',
      border: 'border-rose-100',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
      bg: 'bg-amber-50',
      button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200',
      border: 'border-amber-100',
    },
    info: {
      icon: <Info className="w-6 h-6 text-blue-500" />,
      bg: 'bg-blue-50',
      button: 'bg-blue-500 hover:bg-blue-600 shadow-blue-200',
      border: 'border-blue-100',
    },
    success: {
      icon: <Info className="w-6 h-6 text-green-500" />,
      bg: 'bg-green-50',
      button: 'bg-green-500 hover:bg-green-600 shadow-green-200',
      border: 'border-green-100',
    },
  };

  const currentStyle = typeStyles[options.type || 'warning'];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-on-background/40 backdrop-blur-md" 
        onClick={onCancel}
      />
      
      {/* Dialog Card */}
      <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-outline/5">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className={`w-14 h-14 rounded-2xl ${currentStyle.bg} flex items-center justify-center border ${currentStyle.border}`}>
              {currentStyle.icon}
            </div>
            <button 
              onClick={onCancel}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-background transition-colors text-outline"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h3 className="text-xl font-black tracking-tighter text-on-surface uppercase italic">
              {options.title}
            </h3>
            <p className="text-sm font-medium text-outline leading-relaxed">
              {options.message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 h-12 rounded-2xl bg-background text-[11px] font-black uppercase tracking-widest hover:bg-outline/5 transition-all"
            >
              {options.cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 h-12 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-lg ${currentStyle.button} active:scale-95`}
            >
              {options.confirmText}
            </button>
          </div>
        </div>
        
        {/* Subtle Bottom Accent */}
        <div className={`h-1.5 w-full ${
          options.type === 'danger' ? 'bg-rose-500' : 
          options.type === 'warning' ? 'bg-amber-500' : 
          options.type === 'success' ? 'bg-green-500' :
          'bg-blue-500'
        }`} />
      </div>
    </div>
  );
};
