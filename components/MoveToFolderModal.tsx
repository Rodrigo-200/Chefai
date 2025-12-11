import React, { useState } from 'react';
import { Modal } from './Modal';
import { Folder, Recipe } from '../types';
import { Folder as FolderIcon, Check } from 'lucide-react';

interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (folderId: string | undefined) => void;
  folders: Folder[];
  currentFolderId?: string;
}

export const MoveToFolderModal: React.FC<MoveToFolderModalProps> = ({ isOpen, onClose, onMove, folders, currentFolderId }) => {
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Move to Folder"
    >
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
        <button
            onClick={() => { onMove(undefined); onClose(); }}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                !currentFolderId 
                ? 'bg-chef-50 dark:bg-chef-900/30 text-chef-700 dark:text-chef-300' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
        >
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <FolderIcon size={20} className="text-gray-500" />
            </div>
            <span className="flex-1 text-left font-medium">All Recipes (No Folder)</span>
            {!currentFolderId && <Check size={18} />}
        </button>

        {folders.map(folder => (
            <button
                key={folder.id}
                onClick={() => { onMove(folder.id); onClose(); }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    currentFolderId === folder.id
                    ? 'bg-chef-50 dark:bg-chef-900/30 text-chef-700 dark:text-chef-300' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
            >
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <FolderIcon size={20} className="text-gray-500" />
                </div>
                <span className="flex-1 text-left font-medium">{folder.name}</span>
                {currentFolderId === folder.id && <Check size={18} />}
            </button>
        ))}
      </div>
    </Modal>
  );
};
