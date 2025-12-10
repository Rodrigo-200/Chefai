import React, { useEffect, useRef, useState } from 'react';
import { Recipe } from '../types';
import { ArrowLeft, Clock, Printer, FileText, FileDown, Globe, ChevronDown, Copy, Download, Heart, Trash2, Edit3, X, Check, AlertCircle, Plus, ChefHat, Users, Flame, Utensils, ExternalLink } from 'lucide-react';
import { downloadMarkdown, downloadPlainText, exportRecipeToPDF } from '../services/exportService';
import { getIngredientImageCandidates } from '../services/ingredientUtils';

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

const IngredientRow: React.FC<{ ingredient: { name: string; amount: string; unit: string; notes?: string } }> = ({ ingredient }) => {
    const sources = getIngredientImageCandidates(ingredient.name);
    const [activeIdx, setActiveIdx] = useState(0);
    const currentSrc = sources[activeIdx];

    const handleImageError = () => {
        setActiveIdx((idx) => (idx + 1 < sources.length ? idx + 1 : idx));
    };

    return (
        <div className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
                <div className="h-14 w-14 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm flex items-center justify-center">
                    {currentSrc ? (
                        <img
                            src={currentSrc}
                            alt={ingredient.name}
                            className="h-full w-full object-cover"
                            onError={handleImageError}
                            loading="lazy"
                        />
                    ) : (
                        <ChefHat size={20} className="text-gray-300 dark:text-gray-600" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">
                                {ingredient.amount} <span className="text-chef-600 dark:text-chef-400">{ingredient.unit}</span>
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 text-sm truncate capitalize">
                                {ingredient.name}
                        </p>
                        {ingredient.notes && <p className="text-xs text-gray-400 mt-0.5 italic truncate">{ingredient.notes}</p>}
                </div>
        </div>
    );
};

export const RecipeView: React.FC<RecipeViewProps> = ({ recipe, onBack, onSave, onUnsave, onDelete, onUpdate, isSaved, isLoggedIn }) => {
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState<Recipe>(recipe);
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recipeTags = Array.isArray(recipe.tags) ? recipe.tags : [];
  const nutrition = recipe.nutrition || {};

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
    <div className="bg-white dark:bg-gray-900 min-h-screen pb-20 animate-in slide-in-from-bottom-4 duration-300">
      {/* Immersive Hero */}
      <div className="relative h-[50vh] md:h-[60vh] w-full bg-gray-100 dark:bg-gray-800">
        {recipe.imageUrl && !imageError ? (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.title} 
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
            <ChefHat size={64} strokeWidth={1} />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent pointer-events-none" />

        {/* Navigation Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-10 pointer-events-none">
            <button 
              onClick={onBack}
              className="pointer-events-auto h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            
            <div className="flex gap-3 pointer-events-auto">
                {isLoggedIn && (
                    <button 
                        onClick={() => isSaved ? onUnsave(recipe) : onSave(recipe)}
                        className={`h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-full backdrop-blur-md transition-colors shadow-sm ${
                            isSaved ? 'bg-red-500 text-white' : 'bg-black/20 text-white hover:bg-black/40'
                        }`}
                    >
                        <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
                    </button>
                )}
                <div className="relative" ref={dropdownRef}>
                    <button 
                        onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                        className="h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors shadow-sm"
                    >
                        <Download size={20} />
                    </button>
                    {/* Dropdown Menu */}
                    {downloadMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden z-20 border border-gray-100 dark:border-gray-700">
                            {menuItems.map((item, idx) => (
                                'type' in item ? <div key={idx} className="border-t border-gray-100 dark:border-gray-700 my-1" /> :
                                <button key={idx} onClick={() => { item.action(); setDownloadMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-3">
                                    {item.icon} {item.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {!isEditing && (
                    <button 
                        onClick={handleStartEdit}
                        className="h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors shadow-sm"
                    >
                        <Edit3 size={20} />
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-12 relative z-10">
        {/* Title Card - Floating slightly but minimal */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-xl shadow-gray-200/50 dark:shadow-none mb-12 text-center">
            {isEditing ? (
                <div className="space-y-4">
                    <input
                        type="text"
                        value={editedRecipe.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        className="w-full text-center text-3xl font-bold bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-chef-500 outline-none pb-2 dark:text-white"
                    />
                    <textarea
                        value={editedRecipe.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        className="w-full text-center bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm dark:text-white"
                        rows={2}
                    />
                </div>
            ) : (
                <>
                    {recipe.cuisine && (
                        <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest uppercase text-chef-600 dark:text-chef-400 bg-chef-50 dark:bg-chef-900/30 rounded-full">
                            {recipe.cuisine}
                        </span>
                    )}
                    <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                        {recipe.title}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto mb-8 font-serif">
                        {recipe.description}
                    </p>

                    {recipe.sourceUrl && (
                        <a 
                            href={recipe.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-chef-600 dark:text-chef-400 hover:text-chef-700 dark:hover:text-chef-300 font-medium mb-8 transition-colors"
                        >
                            <ExternalLink size={16} />
                            <span>View Original Source</span>
                        </a>
                    )}
                </>
            )}

            {/* Stats Row */}
            <div className="flex flex-wrap justify-center gap-8 md:gap-12 pt-8 border-t border-gray-100 dark:border-gray-800">
                <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-1">
                        <Clock size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Prep</span>
                    </div>
                    {isEditing ? (
                        <input type="text" value={editedRecipe.prepTime} onChange={(e) => updateField('prepTime', e.target.value)} className="w-20 text-center font-bold text-xl border-b border-gray-300 dark:bg-transparent dark:text-white focus:border-chef-500 outline-none" />
                    ) : (
                        <span className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(recipe.prepTime) || '-'}</span>
                    )}
                </div>
                
                <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-1">
                        <Utensils size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Cook</span>
                    </div>
                    {isEditing ? (
                        <input type="text" value={editedRecipe.cookTime} onChange={(e) => updateField('cookTime', e.target.value)} className="w-20 text-center font-bold text-xl border-b border-gray-300 dark:bg-transparent dark:text-white focus:border-chef-500 outline-none" />
                    ) : (
                        <span className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(recipe.cookTime) || '-'}</span>
                    )}
                </div>

                <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-1">
                        <Users size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Servings</span>
                    </div>
                    {isEditing ? (
                        <input type="text" value={editedRecipe.servings} onChange={(e) => updateField('servings', e.target.value)} className="w-20 text-center font-bold text-xl border-b border-gray-300 dark:bg-transparent dark:text-white focus:border-chef-500 outline-none" />
                    ) : (
                        <span className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{recipe.servings || '-'}</span>
                    )}
                </div>

                <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-1">
                        <Flame size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Cal</span>
                    </div>
                    <span className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{nutrition.calories || '-'}</span>
                </div>
            </div>
            
            {isEditing && (
                <div className="flex justify-center gap-3 mt-6">
                    <button onClick={handleSaveEdit} className="px-6 py-2 bg-chef-600 text-white rounded-full font-medium hover:bg-chef-700 transition-colors">
                        Save Changes
                    </button>
                    <button onClick={handleCancelEdit} className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full font-medium hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                </div>
            )}
        </div>

        {/* Ingredients & Instructions */}
        <div className="grid md:grid-cols-[1fr_1.5fr] gap-12 pb-12">
            {/* Ingredients */}
            <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    Ingredients
                    <span className="text-sm font-normal text-gray-400 ml-auto">{recipe.ingredients.length} items</span>
                </h3>
                
                {isEditing ? (
                    <div className="space-y-3">
                        {editedRecipe.ingredients.map((ingredient, idx) => (
                            <div key={idx} className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <div className="flex gap-2">
                                    <input type="text" value={ingredient.amount} onChange={(e) => handleIngredientChange(idx, 'amount', e.target.value)} className="w-20 p-1 border rounded dark:bg-gray-700 dark:text-white" placeholder="Amt" />
                                    <input type="text" value={ingredient.unit} onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)} className="w-20 p-1 border rounded dark:bg-gray-700 dark:text-white" placeholder="Unit" />
                                    <button onClick={() => handleRemoveIngredient(idx)} className="ml-auto text-red-500"><Trash2 size={16} /></button>
                                </div>
                                <input type="text" value={ingredient.name} onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)} className="w-full p-1 border rounded dark:bg-gray-700 dark:text-white" placeholder="Name" />
                            </div>
                        ))}
                        <button onClick={handleAddIngredient} className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-chef-500 hover:text-chef-500">Add Ingredient</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {recipe.ingredients.map((ingredient, idx) => (
                            <IngredientRow key={idx} ingredient={ingredient} />
                        ))}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2">
                    Instructions
                    <span className="text-sm font-normal text-gray-400 ml-auto">{recipe.instructions.length} steps</span>
                </h3>
                
                {isEditing ? (
                    <div className="space-y-6">
                        {editedRecipe.instructions.map((step, idx) => (
                            <div key={idx} className="flex gap-4">
                                <span className="font-bold text-gray-400">{idx + 1}</span>
                                <div className="flex-1 space-y-2">
                                    <textarea value={step.description} onChange={(e) => handleInstructionChange(idx, 'description', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" rows={3} />
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} />
                                        <input type="number" value={step.timerSeconds || ''} onChange={(e) => handleInstructionChange(idx, 'timerSeconds', parseInt(e.target.value) || 0)} className="w-20 p-1 border rounded dark:bg-gray-700 dark:text-white" placeholder="Sec" />
                                        <button onClick={() => handleRemoveInstruction(idx)} className="ml-auto text-red-500 text-sm">Remove</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button onClick={handleAddInstruction} className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-chef-500 hover:text-chef-500">Add Step</button>
                    </div>
                ) : (
                    <div className="space-y-0 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-100 dark:before:bg-gray-800">
                        {recipe.instructions.map((step, idx) => (
                            <div key={idx} className="relative pl-12 pb-10 last:pb-0 group">
                                {/* Step Number Bubble */}
                                <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white dark:bg-gray-900 border-4 border-gray-100 dark:border-gray-800 flex items-center justify-center z-10 group-hover:border-chef-100 dark:group-hover:border-chef-900 transition-colors">
                                    <span className="font-bold text-sm text-gray-900 dark:text-white">{step.stepNumber}</span>
                                </div>
                                
                                {/* Content */}
                                <div className="pt-1">
                                    <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
                                        {step.description}
                                    </p>
                                    {step.timerSeconds && step.timerSeconds > 0 && (
                                        <div className="mt-3 inline-flex items-center gap-2 text-chef-600 dark:text-chef-400 font-bold text-xs uppercase tracking-wider bg-chef-50 dark:bg-chef-900/20 px-3 py-1.5 rounded-lg">
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
      </div>
    </div>
  );
};
