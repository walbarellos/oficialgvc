import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemText?: string;
  confirmText?: string;
  confirmVariant?: 'danger' | 'primary';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  itemText,
  confirmText = "Confirmar",
  confirmVariant = 'danger'
}) => {
  
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-6 text-center"
        >
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} />
          </div>
          
          <h2 className="text-xl font-display font-bold text-slate-900 mb-2">{title}</h2>
          
          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <p className="text-slate-600 text-sm mb-1">{message}</p>
            {itemText && <p className="font-bold text-slate-900">{itemText}</p>}
          </div>

          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-6 italic">Esta ação não pode ser desfeita</p>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={onClose}
              className="py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }}
              className={`py-3 ${confirmVariant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-dark'} text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-100`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmModal;
