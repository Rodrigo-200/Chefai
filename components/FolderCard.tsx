import React from 'react';
import { Folder } from '../types';
import { Folder as FolderIcon } from 'lucide-react';

interface FolderCardProps {
  folder: Folder;
  onClick: (folder: Folder) => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folder, onClick }) => {
  return (
    <div 
      onClick={() => onClick(folder)}
      className="group relative flex flex-col gap-3 cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 shadow-sm transition-all duration-300 group-hover:shadow-md">
        {folder.coverImage ? (
          <img 
            src={folder.coverImage} 
            alt={folder.name} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600">
            <FolderIcon size={40} />
          </div>
        )}
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-orange-500 transition-colors">
          {folder.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {folder.recipeCount} {folder.recipeCount === 1 ? 'recipe' : 'recipes'}
        </p>
      </div>
    </div>
  );
};
