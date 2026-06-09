import React from 'react';
import { Icon }  from './Icon';
import { Modal } from './Modal';

interface Props {
  title:     string;
  message:   string;
  onConfirm: () => void;
  onCancel:  () => void;
  danger?:   boolean;
}

export function ConfirmDialog({ title, message, onConfirm, onCancel, danger = true }: Props) {
  return (
    <Modal title={title} onClose={onCancel} size="sm">
      <div className="flex items-start gap-3 mb-6">
        <div className={`p-2 rounded-xl flex-shrink-0 ${danger ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
          <Icon name="warning" size={18} />
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 bg-slate-700 hover:bg-slate-600 transition-colors">
          Annuler
        </button>
        <button onClick={onConfirm}
          className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors
            ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'}`}>
          Confirmer
        </button>
      </div>
    </Modal>
  );
}
