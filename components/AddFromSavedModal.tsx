import React, { useState } from 'react';
import { Modal } from './Modal';
import { Recipe } from '../types';
import { Search, Check, ChefHat } from 'lucide-react';

interface AddFromSavedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (recipeIds: string[]) => void;
  savedRecipes: Recipe[];
  currentFolderId: string;
}

export const AddFromSavedModal: React.FC<AddFromSavedModalProps> = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  savedRecipes,
  currentFolderId
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter out recipes that are already in this folder
  const availableRecipes = savedRecipes.filter(r => r.folderId !== currentFolderId);
  
  const filteredRecipes = availableRecipes.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleAdd = () => {
    onAdd(selectedIds);
    setSelectedIds([]);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Add from Saved"
    >
      <div className="flex flex-col h-[60vh] md:h-[500px]">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search recipes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-chef-500 outline-none dark:text-white"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-2">
          {filteredRecipes.length > 0 ? (
            filteredRecipes.map(recipe => (
              <div 
                key={recipe.id}
                onClick={() => toggleSelection(recipe.id)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                  selectedIds.includes(recipe.id)
                    ? 'bg-chef-50 dark:bg-chef-900/20 border-chef-200 dark:border-chef-800'
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-chef-200 dark:hover:border-chef-800'
                }`}
              >
                <div className={`h-12 w-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 flex items-center justify-center`}>
                  {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ChefHat size={20} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">{recipe.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{recipe.cuisine || 'No cuisine'}</p>
                </div>
                <div className={`h-6 w-6 rounded-full border flex items-center justify-center transition-colors ${
                  selectedIds.includes(recipe.id)
                    ? 'bg-chef-600 border-chef-600 text-white'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedIds.includes(recipe.id) && <Check size={14} />}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No recipes found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleAdd}
            disabled={selectedIds.length === 0}
            className="px-6 py-2.5 text-sm font-medium bg-chef-600 text-white rounded-xl hover:bg-chef-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-chef-500/20"
          >
            Add Selected ({selectedIds.length})
          </button>
        </div>
      </div>
    </Modal>
  );
};
