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
      className="bg-white dark:bg-gray-800 rounded-[1.5rem] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 dark:border-gray-700 group relative"
    >
      {/* Remove button */}
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 hover:bg-red-500 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          title="Remove from saved"
        >
          <X size={16} />
        </button>
      )}

      {/* Saved indicator */}
      {isSaved && !showRemove && (
        <div className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 shadow-lg">
          <Heart size={16} fill="currentColor" />
        </div>
      )}

      <div 
        onClick={() => onClick(recipe)}
        className="h-52 md:h-44 w-full bg-gray-100 dark:bg-gray-700 relative overflow-hidden"
      >
        {recipe.imageUrl ? (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-chef-100 to-chef-200 dark:from-chef-800 dark:to-chef-700 text-chef-500 dark:text-chef-300">
            <ChefHat size={40} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-3 left-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {recipe.cuisine && (
            <span className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-gray-800 dark:text-gray-200 shadow-sm">
              {recipe.cuisine}
            </span>
          )}
        </div>
      </div>
      
      <div className="p-4 md:p-5" onClick={() => onClick(recipe)}>
        <h3 className="font-bold text-gray-900 dark:text-white mb-1.5 line-clamp-1 group-hover:text-chef-600 dark:group-hover:text-chef-400 transition-colors text-xl md:text-lg">
          {recipe.title}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
          {recipe.description || 'A delicious recipe waiting to be explored.'}
        </p>
        
        <div className="flex items-center justify-between text-xs font-medium text-gray-400 dark:text-gray-500 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-chef-500" />
            <span>{recipe.cookTime || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-chef-500" />
            <span>{recipe.servings || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};