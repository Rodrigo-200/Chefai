import React, { useEffect, useRef, useState } from 'react';
import { Recipe } from '../types';
import { ArrowLeft, Clock, Printer, FileText, FileDown, Globe, ChevronDown, Copy, Download, Heart, Trash2, Edit3, X, Check, AlertCircle, Plus } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 min-h-screen shadow-2xl overflow-hidden print:shadow-none print:w-full pb-24 md:pb-0">
      {/* Hero Image */}
      <div className="relative h-[45vh] md:h-96 w-full bg-gray-900 group print:h-64">
        {recipe.imageUrl && !imageError ? (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.title} 
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-chef-700 to-chef-900 text-chef-200">
            <div className="text-center">
              <div className="text-6xl mb-2">🍳</div>
              <span className="text-sm opacity-75">No image</span>
            </div>
          </div>
        )}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/60 to-transparent no-print"></div>
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 md:top-6 md:left-6 text-white hover:text-chef-200 transition-colors flex items-center justify-center gap-2 font-medium bg-black/30 backdrop-blur-md w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 rounded-full no-print"
        >
          <ArrowLeft size={20} />
          <span className="hidden md:inline">Back</span>
        </button>
      </div>

      <div className="px-5 py-8 md:px-8 md:py-10 -mt-12 relative z-10 bg-white dark:bg-gray-800 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] print:px-0 print:py-4 print:mt-0 print:shadow-none min-h-[60vh]">
        {/* Drag Handle for Mobile Sheet feel */}
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6 md:hidden" />

        {/* Header */}
        <div className="flex justify-between items-start mb-6 md:mb-8 print:block">
          <div className="flex-1">
            <div className="flex gap-2 mb-3 flex-wrap">
               {recipeTags.map(tag => (
                 <span key={tag} className="px-3 py-1 bg-chef-100 dark:bg-chef-900/50 text-chef-800 dark:text-chef-300 text-xs font-bold uppercase tracking-wider rounded-full">
                   {tag}
                 </span>
               ))}
               {recipe.languageCode && (
                 <span className="px-3 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs font-semibold rounded-full inline-flex items-center gap-1">
                   <Globe size={14} /> {recipe.languageCode.toUpperCase()}
                 </span>
               )}
            </div>
            <div className="flex items-start gap-2 mb-4">
              {isEditing ? (
                <input
                  type="text"
                  value={editedRecipe.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="flex-1 text-2xl md:text-4xl font-serif font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-chef-300 dark:border-chef-600 focus:border-chef-600 outline-none"
                />
              ) : (
                <h1 className="text-2xl md:text-4xl font-serif font-bold text-gray-900 dark:text-white text-balance leading-tight">{recipe.title}</h1>
              )}
              {!isEditing && (
                <button 
                  onClick={handleStartEdit}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-chef-600 hover:bg-chef-50 dark:hover:bg-chef-900/50 rounded-lg transition-colors no-print"
                  title="Edit recipe"
                >
                  <Edit3 size={20} />
                </button>
              )}
            </div>
            {isEditing ? (
              <textarea
                value={editedRecipe.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-2 focus:border-chef-500 outline-none text-sm resize-none mb-2 dark:text-white"
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">{recipe.description}</p>
            )}
            {isEditing && (
              <div className="flex gap-2 mt-2 no-print">
                <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-chef-600 text-white rounded-lg text-sm font-medium hover:bg-chef-700 transition-colors flex items-center gap-1">
                  <Check size={14} /> Save
                </button>
                <button onClick={handleCancelEdit} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2 no-print ml-4">
            {isLoggedIn && (
              <button 
                onClick={() => isSaved ? onUnsave(recipe) : onSave(recipe)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
                  isSaved 
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50' 
                    : 'bg-chef-600 text-white hover:bg-chef-700'
                }`}
              >
                <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
                <span className="hidden md:inline">{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            )}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDownloadMenuOpen((prev) => !prev)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-colors text-xs font-medium w-full"
                title="Downloads and exports"
              >
                <Download size={16} />
                <span className="hidden md:inline">Export</span>
                <ChevronDown size={14} className={`transition-transform ${downloadMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {downloadMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden">
                  {menuItems.map((item, idx) => {
                    if ('type' in item) {
                      return <div key={`divider-${idx}`} className="my-1 border-t border-gray-100 dark:border-gray-700" />;
                    }
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          item.action();
                          setDownloadMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center justify-center gap-1 px-2 py-2 text-gray-400 hover:text-red-500 transition-colors text-xs hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="text-red-600 dark:text-red-400" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">Delete Recipe?</h3>
                <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6">
                  This will permanently remove "{recipe.title}" from your cookbook.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onDelete(recipe.id);
                      setShowDeleteConfirm(false);
                    }}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 md:gap-4 py-4 md:py-6 border-y border-gray-100 dark:border-gray-700 mb-8 md:mb-10">
          <div className="flex flex-col items-center justify-center p-2 md:p-3 bg-chef-50 dark:bg-chef-900/30 rounded-2xl">
             <span className="text-chef-400 dark:text-chef-500 text-[10px] uppercase font-bold tracking-widest mb-1">Prep</span>
             {isEditing ? (
               <input
                 type="text"
                 value={editedRecipe.prepTime}
                 onChange={(e) => updateField('prepTime', e.target.value)}
                 className="w-full text-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 text-gray-900 dark:text-white font-bold text-sm focus:border-chef-500 outline-none"
               />
             ) : (
               <span className="text-gray-900 dark:text-white font-bold text-sm md:text-base">{recipe.prepTime}</span>
             )}
          </div>
          <div className="flex flex-col items-center justify-center p-2 md:p-3 bg-chef-50 dark:bg-chef-900/30 rounded-2xl">
             <span className="text-chef-400 dark:text-chef-500 text-[10px] uppercase font-bold tracking-widest mb-1">Cook</span>
             {isEditing ? (
               <input
                 type="text"
                 value={editedRecipe.cookTime}
                 onChange={(e) => updateField('cookTime', e.target.value)}
                 className="w-full text-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 text-gray-900 dark:text-white font-bold text-sm focus:border-chef-500 outline-none"
               />
             ) : (
               <span className="text-gray-900 dark:text-white font-bold text-sm md:text-base">{recipe.cookTime}</span>
             )}
          </div>
          <div className="flex flex-col items-center justify-center p-2 md:p-3 bg-chef-50 dark:bg-chef-900/30 rounded-2xl">
             <span className="text-chef-400 dark:text-chef-500 text-[10px] uppercase font-bold tracking-widest mb-1">Servings</span>
             {isEditing ? (
               <input
                 type="text"
                 value={editedRecipe.servings}
                 onChange={(e) => updateField('servings', e.target.value)}
                 className="w-full text-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 text-gray-900 dark:text-white font-bold text-sm focus:border-chef-500 outline-none"
               />
             ) : (
               <span className="text-gray-900 dark:text-white font-bold text-sm md:text-base">{recipe.servings}</span>
             )}
          </div>
           <div className="flex flex-col items-center justify-center p-2 md:p-3 bg-chef-50 dark:bg-chef-900/30 rounded-2xl text-center">
             <span className="text-chef-400 dark:text-chef-500 text-[10px] uppercase font-bold tracking-widest mb-1">Cal</span>
             <span className="text-gray-900 dark:text-white font-bold text-sm md:text-base">{nutrition.calories || 'N/A'}</span>
          </div>
        </div>

        {/* Small estimate note */}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-6 no-print">*Estimates may vary. Click Edit to adjust.</p>

        <div className="grid md:grid-cols-12 gap-12">
          {/* Ingredients */}
          <div className="md:col-span-4">
            <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              Ingredients
            </h2>
            
            {isEditing ? (
              <div className="space-y-3">
                {editedRecipe.ingredients.map((ingredient, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Amount"
                        value={ingredient.amount}
                        onChange={(e) => handleIngredientChange(idx, 'amount', e.target.value)}
                        className="w-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={ingredient.unit}
                        onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                        className="w-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm dark:text-white"
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
                      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm font-medium dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={ingredient.notes || ''}
                      onChange={(e) => handleIngredientChange(idx, 'notes', e.target.value)}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs text-gray-500 dark:text-gray-400"
                    />
                  </div>
                ))}
                <button onClick={handleAddIngredient} className="w-full py-2 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 hover:border-chef-500 hover:text-chef-500 transition-colors text-sm font-medium">
                  <Plus size={16} /> Add Ingredient
                </button>
              </div>
            ) : (
              <ul className="space-y-3">
                {recipe.ingredients.map((ingredient, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-chef-400 mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-bold text-gray-900 dark:text-white">{ingredient.amount} {ingredient.unit}</span>
                      <span className="text-gray-700 dark:text-gray-300"> {ingredient.name}</span>
                      {ingredient.notes && <span className="text-gray-500 dark:text-gray-400 text-sm block mt-0.5">{ingredient.notes}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Instructions */}
          <div className="md:col-span-8">
            <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-6">Instructions</h2>
            
            {isEditing ? (
              <div className="space-y-6">
                {editedRecipe.instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-chef-100 dark:bg-chef-900/50 text-chef-700 dark:text-chef-300 flex items-center justify-center font-bold text-sm mt-1">
                      {idx + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={step.description}
                        onChange={(e) => handleInstructionChange(idx, 'description', e.target.value)}
                        rows={3}
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 focus:border-chef-500 outline-none text-sm resize-none dark:text-white"
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
                            className="w-24 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm dark:text-white"
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
                <button onClick={handleAddInstruction} className="w-full py-3 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 hover:border-chef-500 hover:text-chef-500 transition-colors font-medium">
                  <Plus size={18} /> Add Instruction Step
                </button>
              </div>
            ) : (
              <div className="space-y-6 md:space-y-8">
                {recipe.instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-chef-100 dark:bg-chef-900/50 text-chef-700 dark:text-chef-300 flex items-center justify-center font-bold font-serif text-base md:text-lg group-hover:bg-chef-600 group-hover:text-white transition-colors shadow-sm">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 pt-0.5 md:pt-1">
                      <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-base md:text-lg">{step.description}</p>
                      {formatTimerSeconds(step.timerSeconds) && (
                         <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium">
                           <Clock size={14} />
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
          <div className="mt-10 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <Globe size={12} />
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-chef-600 hover:underline transition-colors truncate max-w-xs"
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
