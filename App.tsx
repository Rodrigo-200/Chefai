import React, { useState, useEffect } from 'react';
import { ChefHat, BookOpen, PlusCircle, LogOut, Search, Moon, Sun } from 'lucide-react';
import { Recipe, AppView, User } from './types';
import { CreateRecipe } from './components/CreateRecipe';
import { RecipeView } from './components/RecipeView';
import { RecipeCard } from './components/RecipeCard';
import { loadRecipes, saveRecipes, migrateLegacyRecipes } from './services/storageService';

// Dark mode hook
const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('recipesnap_dark_mode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('recipesnap_dark_mode', String(isDark));
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return { isDark, toggleDark: () => setIsDark(!isDark) };
};

// Mock Authentication
const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('chef_ai_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const login = (username: string) => {
    const newUser = { username, savedRecipeIds: [] };
    // Check if existing user data to merge saved recipes (mock DB)
    const existing = localStorage.getItem(`user_data_${username}`);
    if (existing) {
        newUser.savedRecipeIds = JSON.parse(existing).savedRecipeIds;
    }
    
    setUser(newUser);
    localStorage.setItem('chef_ai_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('chef_ai_user');
  };

  const saveUserRecipe = (recipeId: string) => {
      if(!user) return;
      const updatedIds = [...new Set([...user.savedRecipeIds, recipeId])];
      const updatedUser = { ...user, savedRecipeIds: updatedIds };
      setUser(updatedUser);
      localStorage.setItem('chef_ai_user', JSON.stringify(updatedUser));
      localStorage.setItem(`user_data_${user.username}`, JSON.stringify(updatedUser));
  };

  const unsaveUserRecipe = (recipeId: string) => {
      if(!user) return;
      const updatedIds = user.savedRecipeIds.filter(id => id !== recipeId);
      const updatedUser = { ...user, savedRecipeIds: updatedIds };
      setUser(updatedUser);
      localStorage.setItem('chef_ai_user', JSON.stringify(updatedUser));
      localStorage.setItem(`user_data_${user.username}`, JSON.stringify(updatedUser));
  };

  return { user, login, logout, saveUserRecipe, unsaveUserRecipe };
};

export default function App() {
  const [view, setView] = useState<AppView>('create');
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const { user, login, logout, saveUserRecipe, unsaveUserRecipe } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark, toggleDark } = useDarkMode();

  // Load recipes from local storage on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      await migrateLegacyRecipes();
      const stored = await loadRecipes();
      if (mounted && stored.length) {
        setRecipes(stored);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRecipeCreated = (recipe: Recipe) => {
    // Add to local state and storage
    const newRecipes = [recipe, ...recipes];
    setRecipes(newRecipes);
    void saveRecipes(newRecipes);
    
    setActiveRecipe(recipe);
    setView('recipe-detail');
  };

  const handleSaveRecipe = (recipe: Recipe) => {
      if (!user) {
          alert("Please login to save recipes!");
          return;
      }
      saveUserRecipe(recipe.id);
  };

  const handleUnsaveRecipe = (recipe: Recipe) => {
      unsaveUserRecipe(recipe.id);
  };

  const handleDeleteRecipe = async (recipeId: string) => {
      const newRecipes = recipes.filter(r => r.id !== recipeId);
      setRecipes(newRecipes);
      await saveRecipes(newRecipes);
      if (activeRecipe?.id === recipeId) {
          setActiveRecipe(null);
          setView('dashboard');
      }
  };

  const handleUpdateRecipe = async (updatedRecipe: Recipe) => {
      const newRecipes = recipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r);
      setRecipes(newRecipes);
      setActiveRecipe(updatedRecipe);
      await saveRecipes(newRecipes);
  };

  const filteredRecipes = recipes.filter(r => {
      // If logged in and in dashboard, show saved only? 
      // For this demo, we show all "Global" recipes in dashboard, but highlight saved ones.
      // Or lets just show all recipes stored in browser.
      return r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             r.cuisine.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const savedRecipes = user ? recipes.filter(r => user.savedRecipeIds.includes(r.id)) : [];

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col transition-colors`}>
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer" onClick={() => setView('create')}>
              <div className="bg-chef-600 p-2 rounded-lg text-white mr-3">
                <ChefHat size={24} />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Recipe<span className="text-chef-600">Snap</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDark}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              {user ? (
                 <>
                  <button 
                    onClick={() => setView('create')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'create' ? 'bg-chef-50 dark:bg-chef-900/50 text-chef-700 dark:text-chef-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <div className="flex items-center gap-1">
                        <PlusCircle size={18} />
                        <span className="hidden sm:inline">New Recipe</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => setView('dashboard')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-chef-50 dark:bg-chef-900/50 text-chef-700 dark:text-chef-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                     <div className="flex items-center gap-1">
                        <BookOpen size={18} />
                        <span className="hidden sm:inline">My Cookbook ({savedRecipes.length})</span>
                    </div>
                  </button>
                  <div className="h-6 w-px bg-gray-200 dark:bg-gray-600 mx-2"></div>
                  <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.username}</span>
                      <button onClick={logout} className="text-gray-400 hover:text-red-500">
                          <LogOut size={18} />
                      </button>
                  </div>
                 </>
              ) : (
                  <button 
                    onClick={() => {
                        const name = prompt("Enter a username to login (Mock Auth):");
                        if(name) login(name);
                    }}
                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                  >
                    Login / Sign Up
                  </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {view === 'create' && (
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <CreateRecipe onRecipeCreated={handleRecipeCreated} />
           </div>
        )}

        {view === 'recipe-detail' && activeRecipe && (
          <RecipeView 
            recipe={activeRecipe} 
            onBack={() => setView(recipes.length > 0 ? 'dashboard' : 'create')} 
            onSave={handleSaveRecipe}
            onUnsave={handleUnsaveRecipe}
            onDelete={handleDeleteRecipe}
            onUpdate={handleUpdateRecipe}
            isSaved={user ? user.savedRecipeIds.includes(activeRecipe.id) : false}
            isLoggedIn={!!user}
          />
        )}

        {view === 'dashboard' && (
             <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-chef-600 via-chef-500 to-amber-500 rounded-3xl p-8 md:p-12 mb-10 text-white">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTItNCAxLTQgMSAwLTMgMi01IDItMiA0LTIgNCAyIDQgMnMwIDItMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold">My Cookbook</h1>
                                <p className="text-white/80 text-sm">{recipes.length} recipe{recipes.length !== 1 ? 's' : ''} created · {savedRecipes.length} saved</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search your recipes..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-chef-500 focus:border-chef-500 outline-none text-base shadow-sm dark:text-white dark:placeholder-gray-400"
                    />
                </div>

                {/* Saved Recipes Section */}
                {user && (
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-2xl">❤️</span>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Saved Recipes</h2>
                            <span className="ml-2 px-2.5 py-0.5 bg-chef-100 dark:bg-chef-900/50 text-chef-700 dark:text-chef-300 text-sm font-semibold rounded-full">{savedRecipes.length}</span>
                        </div>
                        {savedRecipes.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {savedRecipes.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase())).map(recipe => (
                                    <RecipeCard 
                                        key={recipe.id} 
                                        recipe={recipe} 
                                        onClick={(r) => { setActiveRecipe(r); setView('recipe-detail'); }}
                                        onRemove={() => unsaveUserRecipe(recipe.id)}
                                        showRemove
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
                                    <BookOpen size={28} />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No saved recipes yet</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Click the heart on any recipe to save it here</p>
                            </div>
                        )}
                    </div>
                )}

                {/* All Recipes / History */}
                {recipes.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-2xl">📖</span>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Recipes</h2>
                            <span className="ml-2 px-2.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-full">{recipes.length}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredRecipes.map(recipe => (
                                <RecipeCard 
                                    key={recipe.id} 
                                    recipe={recipe} 
                                    onClick={(r) => { setActiveRecipe(r); setView('recipe-detail'); }}
                                    isSaved={user ? user.savedRecipeIds.includes(recipe.id) : false}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {recipes.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <div className="w-20 h-20 bg-gradient-to-br from-chef-100 to-chef-200 dark:from-chef-800 dark:to-chef-700 rounded-3xl flex items-center justify-center mx-auto mb-6 text-chef-600 dark:text-chef-300">
                            <ChefHat size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Your cookbook is empty</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">Create your first recipe from a video, image, or blog URL</p>
                        <button 
                            onClick={() => setView('create')}
                            className="inline-flex items-center gap-2 bg-chef-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-chef-700 transition-colors shadow-lg shadow-chef-500/25"
                        >
                            <PlusCircle size={20} />
                            Create Recipe
                        </button>
                    </div>
                )}
             </div>
        )}
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8 mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm">
                &copy; 2025 RecipeSnap
            </p>
        </div>
      </footer>
    </div>
  );
}
