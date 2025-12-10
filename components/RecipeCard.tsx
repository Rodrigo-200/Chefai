import React from 'react';
import { Recipe } from '../types';
import { Clock, Users, ChefHat, Heart, X } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: (recipe: Recipe) => void;
  onRemove?: () => void;
  showRemove?: boolean;
  isSaved?: boolean;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick, onRemove, showRemove, isSaved }) => {
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
        <div className="absolute top-3 right-3 flex gap-2">
            {showRemove && onRemove && (
                <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md text-gray-900 dark:text-white shadow-sm hover:bg-red-500 hover:text-white transition-colors"
                >
                <X size={14} />
                </button>
            )}
            {isSaved && !showRemove && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md text-red-500 shadow-sm">
                <Heart size={14} fill="currentColor" />
                </div>
            )}
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
            <span>{recipe.cookTime || 'N/A'}</span>
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