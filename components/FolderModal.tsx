import React, { useState } from 'react';
import { Modal } from './Modal';
import { Folder } from '../types';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  initialName?: string;
  mode: 'create' | 'edit';
}

export const FolderModal: React.FC<FolderModalProps> = ({ isOpen, onClose, onSave, initialName = '', mode }) => {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      setName('');
      onClose();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={mode === 'create' ? 'New Folder' : 'Rename Folder'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Folder Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Desserts, Italian, Quick Meals"
            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-chef-500 outline-none transition-all"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-4 py-2 rounded-xl bg-chef-600 text-white hover:bg-chef-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === 'create' ? 'Create Folder' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
