import React, { useState, useRef, useEffect } from 'react';
import { Plus, FolderPlus, ChefHat, BookOpen, X } from 'lucide-react';

interface FloatingActionMenuProps {
  onCreateRecipe: () => void;
  onCreateFolder: () => void;
  onAddFromSaved?: () => void;
  currentFolderId?: string | null;
}

export const FloatingActionMenu: React.FC<FloatingActionMenuProps> = ({ 
  onCreateRecipe, 
  onCreateFolder, 
  onAddFromSaved,
  currentFolderId 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="fixed bottom-28 right-4 md:bottom-8 md:right-8 z-50 flex flex-col items-end" ref={menuRef}>
      {/* Menu Items */}
      <div className={`flex flex-col gap-3 mb-4 transition-all duration-200 origin-bottom-right ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}`}>
        
        {currentFolderId && onAddFromSaved && (
           <button 
            onClick={() => { onAddFromSaved(); setIsOpen(false); }}
            className="flex items-center gap-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            <span className="font-medium text-sm">Add from Saved</span>
            <div className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-xl text-pink-600 dark:text-pink-400">
              <BookOpen size={20} />
            </div>
          </button>
        )}

        <button 
          onClick={() => { onCreateFolder(); setIsOpen(false); }}
          className="flex items-center gap-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
        >
          <span className="font-medium text-sm">New Collection</span>
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600 dark:text-blue-400">
            <FolderPlus size={20} />
          </div>
        </button>

        <button 
          onClick={() => { onCreateRecipe(); setIsOpen(false); }}
          className="flex items-center gap-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
        >
          <span className="font-medium text-sm">New Recipe</span>
          <div className="bg-chef-100 dark:bg-chef-900/30 p-2 rounded-xl text-chef-600 dark:text-chef-400">
            <ChefHat size={20} />
          </div>
        </button>
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-14 w-14 md:h-16 md:w-16 flex items-center justify-center rounded-full shadow-xl transition-all duration-300 ${
          isOpen 
            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 rotate-45' 
            : 'bg-chef-600 text-white hover:bg-chef-700 hover:scale-105'
        }`}
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
};
