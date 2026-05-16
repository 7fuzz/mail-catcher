'use client'

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children, footer }: ModalProps) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-bg-card border border-border-subtle rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <h2 className="text-xl font-bold text-text-main">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full h-8 w-8 p-0">
            <X size={18} />
          </Button>
        </div>
        
        <div className="p-6">
          {children}
        </div>

        {footer && (
          <div className="flex justify-end gap-3 p-6 border-t border-border-subtle bg-bg-sidebar/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
