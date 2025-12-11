import React, { useState, useRef, useEffect } from 'react';
import { Recipe } from '../types';
import { Clock, Users, ChefHat, Heart, X, MoreVertical, FolderInput, Trash2 } from 'lucide-react';

const formatDuration = (value?: string | null) => {
  if (!value) return '';
  const trimmed = value.trim();
  const iso = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(trimmed);
  if (iso) {
    const hours = iso[1] ? parseInt(iso[1], 10) : 0;
    const mins = iso[2] ? parseInt(iso[2], 10) : 0;
    const secs = iso[3] ? parseInt(iso[3], 10) : 0;
    const parts = [] as string[];
    if (hours) parts.push(`${hours} hr${hours === 1 ? '' : 's'}`);
    if (mins) parts.push(`${mins} min${mins === 1 ? '' : 's'}`);
    if (secs && !hours && !mins) parts.push(`${secs} sec${secs === 1 ? '' : 's'}`);
    return parts.join(' ') || `${mins} min`;
  }
  const numeric = /^\d+(?:\.\d+)?$/.test(trimmed);
  if (numeric) return `${trimmed} min`;
  return trimmed;
};

interface RecipeCardProps {
  recipe: Recipe;
  onClick: (recipe: Recipe) => void;
  onRemove?: () => void;
  onMove?: () => void;
  showRemove?: boolean;
  isSaved?: boolean;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick, onRemove, onMove, showRemove, isSaved }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      onClick={() => onClick(recipe)}
      className="group relative flex flex-col gap-3 cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 shadow-sm transition-all duration-300 group-hover:shadow-md">
        {recipe.imageUrl ? (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.title} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600">
            <ChefHat size={40} />
          </div>
        )}
        
        {/* Overlay Gradient - Subtle */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
           {recipe.cuisine && (
            <span className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-gray-900 dark:text-white shadow-sm">
              {recipe.cuisine}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Save/Heart Button - First */}
            {isSaved && !showRemove && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md text-red-500 shadow-sm">
                    <Heart size={14} fill="currentColor" />
                </div>
            )}

            {/* Context Menu - Second */}
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md text-gray-900 dark:text-white shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <MoreVertical size={16} />
                </button>
                
                {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                        {onMove && (
                            <button
                                onClick={() => { setShowMenu(false); onMove(); }}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                            >
                                <FolderInput size={16} />
                                Move to Folder
                            </button>
                        )}
                        {onRemove && (
                            <button
                                onClick={() => { setShowMenu(false); onRemove(); }}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
                            >
                                <Trash2 size={16} />
                                Delete
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex flex-col gap-1">
        <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight group-hover:text-chef-600 dark:group-hover:text-chef-400 transition-colors">
          {recipe.title}
        </h3>
        
        <div className="flex items-center gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{formatDuration(recipe.cookTime) || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={12} />
            <span>{recipe.servings || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};