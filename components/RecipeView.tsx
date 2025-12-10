import React, { useEffect, useRef, useState } from 'react';
import { Recipe } from '../types';
import { ArrowLeft, Clock, Printer, FileText, FileDown, Globe, ChevronDown, Copy, Download, Heart, Trash2, Edit3, X, Check, AlertCircle, Plus, ChefHat } from 'lucide-react';
import { downloadMarkdown, downloadPlainText, exportRecipeToPDF } from '../services/exportService';

interface RecipeViewProps {
  recipe: Recipe;
  onBack: () => void;
  onSave: (recipe: Recipe) => void;
  onUnsave: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => void;
  onUpdate: (recipe: Recipe) => void;
  isSaved: boolean;
  isLoggedIn: boolean;
}

export const RecipeView: React.FC<RecipeViewProps> = ({ recipe, onBack, onSave, onUnsave, onDelete, onUpdate, isSaved, isLoggedIn }) => {
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState<Recipe>(recipe);
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recipeTags = Array.isArray(recipe.tags) ? recipe.tags : [];
  const nutrition = recipe.nutrition || {};

  // Sync editedRecipe when recipe prop changes
  useEffect(() => {
    setEditedRecipe(recipe);
    setImageError(false);
  }, [recipe]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTimerSeconds = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return null;
    const minutes = Math.round(seconds / 60);
    if (minutes < 1) return '<1 min';
    if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'}`;
    const hours = minutes / 60;
    if (hours < 24) {
      const value = hours % 1 === 0 ? Math.round(hours) : Number(hours.toFixed(1));
      const suffix = value === 1 ? 'hr' : 'hrs';
      return `${value} ${suffix}`;
    }
    const days = hours / 24;
    return `${Number(days.toFixed(1))} days`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = `${recipe.title}\n\n${recipe.description}\n\nIngredients:\n${recipe.ingredients.map(i => `- ${i.amount} ${i.unit} ${i.name} ${i.notes ? `(${i.notes})` : ''}`).join('\n')}\n\nInstructions:\n${recipe.instructions.map(i => `${i.stepNumber}. ${i.description}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    alert("Recipe copied to clipboard!");
  };

  const handlePdf = () => exportRecipeToPDF(recipe);
  const handleMarkdown = () => downloadMarkdown(recipe);
  const handlePlainText = () => downloadPlainText(recipe);

  const handleStartEdit = () => {
    setEditedRecipe({ ...recipe });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedRecipe(recipe);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    onUpdate(editedRecipe);
    setIsEditing(false);
  };

  const updateField = (field: keyof Recipe, value: string) => {
    setEditedRecipe(prev => ({ ...prev, [field]: value }));
  };

  const handleIngredientChange = (index: number, field: string, value: string) => {
    const newIngredients = [...editedRecipe.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setEditedRecipe(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const handleAddIngredient = () => {
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: '', unit: '' }]
    }));
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngredients = editedRecipe.ingredients.filter((_, i) => i !== index);
    setEditedRecipe(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const handleInstructionChange = (index: number, field: string, value: string | number) => {
    const newInstructions = [...editedRecipe.instructions];
    newInstructions[index] = { ...newInstructions[index], [field]: value };
    setEditedRecipe(prev => ({ ...prev, instructions: newInstructions }));
  };

  const handleAddInstruction = () => {
    setEditedRecipe(prev => ({
      ...prev,
      instructions: [...prev.instructions, { stepNumber: prev.instructions.length + 1, description: '' }]
    }));
  };

  const handleRemoveInstruction = (index: number) => {
    const newInstructions = editedRecipe.instructions.filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, stepNumber: i + 1 })); // Re-number steps
    setEditedRecipe(prev => ({ ...prev, instructions: newInstructions }));
  };

  type DropdownItem =
    | { label: string; icon: React.ReactNode; action: () => void }
    | { type: 'divider' };

  const menuItems: DropdownItem[] = [
    { label: 'Download PDF', icon: <FileDown size={16} />, action: handlePdf },
    { label: 'Markdown', icon: <FileText size={16} />, action: handleMarkdown },
    { label: 'Plain text', icon: <FileText size={16} />, action: handlePlainText },
    { type: 'divider' },
    { label: 'Copy to clipboard', icon: <Copy size={16} />, action: handleCopy },
    { label: 'Print / Save as PDF', icon: <Printer size={16} />, action: handlePrint },
  ];

  return (
    <div className="max-w-5xl mx-auto bg-white dark:bg-gray-900 min-h-screen print:w-full pb-24 md:pb-12">
      {/* Hero Image - Full width on mobile, constrained on desktop */}
      <div className="relative w-full h-[40vh] md:h-[50vh] md:rounded-b-[2.5rem] overflow-hidden bg-gray-100 dark:bg-gray-800">
        {recipe.imageUrl && !imageError ? (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.title} 
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600">
            <ChefHat size={64} />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden" />

        {/* Back Button */}
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-md text-gray-900 dark:text-white shadow-sm hover:bg-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="px-5 md:px-0 max-w-4xl mx-auto -mt-8 md:mt-8 relative z-10">
        {/* Title Section */}
        <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-none p-6 md:p-0 shadow-lg md:shadow-none border-b border-gray-100 dark:border-gray-800 md:border-none mb-8">
            <div className="flex flex-wrap gap-2 mb-4">
               {recipeTags.map(tag => (
                 <span key={tag} className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase tracking-wider rounded-md">
                   {tag}
                 </span>
               ))}
            </div>
            
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    {isEditing ? (
                        <input
                        type="text"
                        value={editedRecipe.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        className="w-full text-3xl md:text-5xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-gray-200 focus:border-black outline-none"
                        />
                    ) : (
                        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-4">{recipe.title}</h1>
                    )}
                    
                    {isEditing ? (
                        <textarea
                            value={editedRecipe.description}
                            onChange={(e) => updateField('description', e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-base"
                            rows={3}
                        />
                    ) : (
                        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">{recipe.description}</p>
                    )}
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:flex flex-col gap-2">
                    {isLoggedIn && (
                        <button 
                            onClick={() => isSaved ? onUnsave(recipe) : onSave(recipe)}
                            className={`h-12 w-12 flex items-center justify-center rounded-full border transition-all ${
                            isSaved 
                                ? 'bg-red-50 border-red-100 text-red-500' 
                                : 'border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <Heart size={24} fill={isSaved ? 'currentColor' : 'none'} />
                        </button>
                    )}
                    <button 
                        onClick={handleStartEdit}
                        className="h-12 w-12 flex items-center justify-center rounded-full border border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600 transition-all"
                    >
                        <Edit3 size={20} />
                    </button>
                </div>
            </div>
        </div>

        {/* Stats Grid - Clean */}
        <div className="grid grid-cols-4 gap-4 py-6 border-y border-gray-100 dark:border-gray-800 mb-10">
            <div className="text-center">
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Prep</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{recipe.prepTime || '-'}</span>
            </div>
            <div className="text-center border-l border-gray-100 dark:border-gray-800">
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cook</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{recipe.cookTime || '-'}</span>
            </div>
            <div className="text-center border-l border-gray-100 dark:border-gray-800">
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Servings</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{recipe.servings || '-'}</span>
            </div>
            <div className="text-center border-l border-gray-100 dark:border-gray-800">
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cal</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{nutrition.calories || '-'}</span>
            </div>
        </div>

        {/* Small estimate note */}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-8 no-print text-center uppercase tracking-widest">*Estimates may vary</p>

        <div className="grid md:grid-cols-12 gap-12 pb-20">
          {/* Ingredients */}
          <div className="md:col-span-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-wider">
              Ingredients
            </h2>
            
            {isEditing ? (
              <div className="space-y-3">
                {editedRecipe.ingredients.map((ingredient, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Amount"
                        value={ingredient.amount}
                        onChange={(e) => handleIngredientChange(idx, 'amount', e.target.value)}
                        className="w-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={ingredient.unit}
                        onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                        className="w-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm dark:text-white"
                      />
                      <button onClick={() => handleRemoveIngredient(idx)} className="ml-auto text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Ingredient name"
                      value={ingredient.name}
                      onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm font-medium dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={ingredient.notes || ''}
                      onChange={(e) => handleIngredientChange(idx, 'notes', e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-500 dark:text-gray-400"
                    />
                  </div>
                ))}
                <button onClick={handleAddIngredient} className="w-full py-3 flex items-center justify-center gap-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors text-sm font-medium">
                  <Plus size={16} /> Add Ingredient
                </button>
              </div>
            ) : (
              <ul className="space-y-4">
                {recipe.ingredients.map((ingredient, idx) => (
                  <li key={idx} className="flex items-start gap-4 pb-4 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white mt-2 flex-shrink-0 opacity-20" />
                    <div className="flex-1">
                      <span className="font-bold text-gray-900 dark:text-white">{ingredient.amount} {ingredient.unit}</span>
                      <span className="text-gray-600 dark:text-gray-300"> {ingredient.name}</span>
                      {ingredient.notes && <span className="text-gray-400 dark:text-gray-500 text-sm block mt-0.5 italic">{ingredient.notes}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Instructions */}
          <div className="md:col-span-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wider">Instructions</h2>
            
            {isEditing ? (
              <div className="space-y-6">
                {editedRecipe.instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-sm mt-1">
                      {idx + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={step.description}
                        onChange={(e) => handleInstructionChange(idx, 'description', e.target.value)}
                        rows={3}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:border-black dark:focus:border-white outline-none text-sm resize-none dark:text-white"
                        placeholder="Step description..."
                      />
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-gray-400" />
                          <input
                            type="number"
                            placeholder="Seconds"
                            value={step.timerSeconds || ''}
                            onChange={(e) => handleInstructionChange(idx, 'timerSeconds', parseInt(e.target.value) || 0)}
                            className="w-24 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm dark:text-white"
                          />
                          <span className="text-xs text-gray-400">sec</span>
                        </div>
                        <button onClick={() => handleRemoveInstruction(idx)} className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1">
                          <Trash2 size={14} /> Remove step
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={handleAddInstruction} className="w-full py-3 flex items-center justify-center gap-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors font-medium">
                  <Plus size={18} /> Add Instruction Step
                </button>
              </div>
            ) : (
              <div className="space-y-8 md:space-y-10">
                {recipe.instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-4 md:gap-6 group">
                    <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 flex items-center justify-center font-bold text-sm md:text-base group-hover:border-black dark:group-hover:border-white group-hover:text-black dark:group-hover:text-white transition-colors">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-base md:text-lg">{step.description}</p>
                      {formatTimerSeconds(step.timerSeconds) && (
                         <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-full text-xs font-bold uppercase tracking-wide border border-gray-100 dark:border-gray-700">
                           <Clock size={12} />
                           <span>{formatTimerSeconds(step.timerSeconds)}</span>
                         </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer source - clean clickable link */}
        {recipe.sourceUrl && (
          <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            <Globe size={12} />
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black dark:hover:text-white transition-colors truncate max-w-xs"
              title={recipe.sourceUrl}
            >
              {(() => {
                try {
                  const url = new URL(recipe.sourceUrl);
                  return url.hostname.replace('www.', '');
                } catch {
                  return 'View source';
                }
              })()}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
