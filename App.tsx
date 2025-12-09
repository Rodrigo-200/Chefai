import React, { useState, useEffect } from 'react';
import { ChefHat, BookOpen, PlusCircle, LogOut, Search, Moon, Sun, Shield, Mail, Lock, ArrowRight } from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from 'firebase/auth';
import { Recipe, AppView, User } from './types';
import { CreateRecipe } from './components/CreateRecipe';
import { RecipeView } from './components/RecipeView';
import { RecipeCard } from './components/RecipeCard';
import { loadRecipes, saveRecipes, migrateLegacyRecipes, loadUserRecipes, saveRecipeForUser, deleteRecipeForUser } from './services/storageService';
import { auth, googleProvider } from './services/firebase';
import { addSavedRecipeId, ensureUserProfile, removeSavedRecipeId } from './services/userService';

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

// Firebase Authentication
const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          setUser(null);
          setAuthLoading(false);
          return;
        }
        const profile = await ensureUserProfile(fbUser);
        setUser(profile);
        setAuthError(null);
      } catch (err: any) {
        setAuthError(err?.message || 'Authentication unavailable');
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    }, (err) => {
      setAuthError(err?.message || 'Authentication unavailable');
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    await signInWithPopup(auth, googleProvider);
  };

  const loginWithEmail = async (email: string, password: string, mode: 'signin' | 'signup' = 'signin', displayName?: string) => {
    setAuthError(null);
    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName && userCredential.user) {
            await updateProfile(userCredential.user, { displayName });
            // Force refresh user to get the new display name
            await userCredential.user.reload();
            const updatedUser = auth.currentUser;
            if (updatedUser) {
                const profile = await ensureUserProfile(updatedUser);
                setUser(profile);
            }
        }
        return;
      }
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setAuthError(err?.message || 'Login failed');
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const saveUserRecipe = async (recipeId: string) => {
    if (!user) return;
    await addSavedRecipeId(user.uid, recipeId);
    setUser({ ...user, savedRecipeIds: Array.from(new Set([...user.savedRecipeIds, recipeId])) });
  };

  const unsaveUserRecipe = async (recipeId: string) => {
    if (!user) return;
    await removeSavedRecipeId(user.uid, recipeId);
    setUser({ ...user, savedRecipeIds: user.savedRecipeIds.filter(id => id !== recipeId) });
  };

  return { user, authLoading, authError, loginWithGoogle, loginWithEmail, logout, saveUserRecipe, unsaveUserRecipe };
};

type LoginScreenProps = {
  onGoogle: () => Promise<void>;
  onEmail: (email: string, password: string, mode: 'signin' | 'signup', displayName?: string) => Promise<void>;
  isDark: boolean;
  toggleDark: () => void;
  authError: string | null;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ onGoogle, onEmail, isDark, toggleDark, authError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await onEmail(email, password, mode, displayName);
      setMessage(mode === 'signup' ? 'Account created, redirecting...' : 'Signed in!');
    } catch {
      // authError already set in hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${isDark ? 'bg-gray-950 text-gray-100' : 'bg-gradient-to-br from-chef-50 via-white to-amber-50 text-gray-900'}`}>
      <button
        onClick={toggleDark}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/70 dark:bg-gray-800 shadow hover:shadow-lg transition"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-3 px-3 py-2 bg-white/80 dark:bg-gray-800 rounded-full shadow">
            <div className="bg-chef-600 text-white p-2 rounded-full"><ChefHat size={18} /></div>
            <span className="font-semibold">RecipeSnap</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">Sign in to save and sync your cookbook</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-lg">Use Google or email to keep your recipes synced across devices. Creating an account is free and instant.</p>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <Shield size={18} />
            <span>Secure Firebase Auth · Your recipes stay private to your account</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
          <button
            onClick={onGoogle}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-chef-600 hover:bg-chef-700 text-white font-semibold py-3 rounded-xl shadow transition disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 533.5 544.3" aria-hidden="true"><path fill="#4285F4" d="M533.5 278.4c0-17.4-1.5-34.1-4.3-50.4H272v95.4h147.3c-6.4 34.8-25.7 64.3-54.8 84v69h88.5c51.6-47.6 80.5-117.8 80.5-198z"/><path fill="#34A853" d="M272 544.3c73.7 0 135.6-24.5 180.8-66.3l-88.5-69c-24.6 16.5-56 26.2-92.3 26.2-71 0-131.1-47.9-152.5-112.2H27.4v70.5c45 89.1 137.4 150.8 244.6 150.8z"/><path fill="#FBBC05" d="M119.5 322.9c-10.8-32.5-10.8-67.6 0-100.1V152.3H27.4c-36.6 72.9-36.6 159.2 0 232.1l92.1-61.5z"/><path fill="#EA4335" d="M272 107.7c39.9-.6 77.8 14.1 106.8 40.8l80-80C412.9 24.6 347.9-.6 272 0 164.8 0 72.4 61.7 27.4 152.3l92.1 70.5C140.9 155.6 201 107.7 272 107.7z"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
            <span className="text-xs uppercase tracking-wide text-gray-500">or</span>
            <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
          </div>

          <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-4">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form className="space-y-3" onSubmit={handleEmailSubmit}>
            {mode === 'signup' && (
              <div className="relative">
                <div className="absolute left-3 top-3 text-gray-400">
                  <ChefHat size={18} />
                </div>
                <input
                  type="text"
                  required={mode === 'signup'}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Username"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-chef-500 outline-none"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-chef-500 outline-none"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-chef-500 outline-none"
              />
            </div>
            {authError && <p className="text-red-500 text-sm">{authError}</p>}
            {message && <p className="text-chef-700 text-sm">{message}</p>}
            
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold py-3 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition disabled:opacity-60 mt-2"
            >
              {submitting ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<AppView>('create');
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const { user, authLoading, authError, loginWithGoogle, loginWithEmail, logout, saveUserRecipe, unsaveUserRecipe } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark, toggleDark } = useDarkMode();
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);

  // Handle PWA Share Target
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const text = params.get('text');
    const url = params.get('url');
    const title = params.get('title');

    const content = url || text || title;
    if (content) {
      const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        setSharedUrl(urlMatch[0]);
        setView('create');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Clear shared URL when leaving create view
  useEffect(() => {
    if (view !== 'create') {
      setSharedUrl(null);
    }
  }, [view]);

  // Load recipes for the current user (cloud) or fallback to local for guests
  useEffect(() => {
    let mounted = true;
    (async () => {
      await migrateLegacyRecipes();
      if (user) {
        console.log("User logged in, loading cloud recipes for:", user.uid);
        try {
          const cloudRecipes = await loadUserRecipes(user.uid);
          if (mounted) {
            console.log("Cloud recipes loaded:", cloudRecipes.length);
            setRecipes(cloudRecipes);
          }
        } catch (e) {
          console.error("Error loading cloud recipes:", e);
        }
      } else {
        console.log("No user, loading local recipes");
        const localRecipes = await loadRecipes();
        if (mounted) setRecipes(localRecipes);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const handleRecipeCreated = async (recipe: Recipe) => {
    // Add to local state and storage
    const newRecipes = [recipe, ...recipes];
    setRecipes(newRecipes);
    
    setActiveRecipe(recipe);
    setView('recipe-detail');

    try {
      if (user) {
        await saveRecipeForUser(user.uid, recipe);
        // Automatically bookmark created recipes
        await saveUserRecipe(recipe.id);
      } else {
        await saveRecipes(newRecipes);
      }
    } catch (error) {
      console.error("Failed to save created recipe:", error);
      alert("Failed to save recipe. Please try again.");
    }
  };

  const handleSaveRecipe = async (recipe: Recipe) => {
      if (!user) {
          alert("Please login to save recipes!");
          return;
      }
      try {
        await saveRecipeForUser(user.uid, recipe);
        await saveUserRecipe(recipe.id);
      } catch (error) {
        console.error("Failed to save recipe:", error);
        alert("Failed to save recipe. Please try again.");
      }
  };

  const handleUnsaveRecipe = async (recipe: Recipe) => {
      try {
        await unsaveUserRecipe(recipe.id);
      } catch (error) {
        console.error("Failed to unsave recipe:", error);
        alert("Failed to unsave recipe. Please try again.");
      }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
      const newRecipes = recipes.filter(r => r.id !== recipeId);
      setRecipes(newRecipes);
      if (user) {
        await deleteRecipeForUser(user.uid, recipeId);
      } else {
        await saveRecipes(newRecipes);
      }
      if (activeRecipe?.id === recipeId) {
          setActiveRecipe(null);
          setView('dashboard');
      }
  };

  const handleUpdateRecipe = async (updatedRecipe: Recipe) => {
      const newRecipes = recipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r);
      setRecipes(newRecipes);
      setActiveRecipe(updatedRecipe);
      try {
        if (user) {
          await saveRecipeForUser(user.uid, updatedRecipe);
        } else {
          await saveRecipes(newRecipes);
        }
      } catch (error) {
        console.error("Failed to update recipe:", error);
        alert("Failed to update recipe. Please try again.");
      }
  };

  const filteredRecipes = recipes.filter(r => {
      // If logged in and in dashboard, show saved only? 
      // For this demo, we show all "Global" recipes in dashboard, but highlight saved ones.
      // Or lets just show all recipes stored in browser.
      return r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             r.cuisine.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const savedRecipes = user ? recipes.filter(r => user.savedRecipeIds.includes(r.id)) : [];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200">
        <p className="text-lg font-medium">Loading your cookbook...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onGoogle={loginWithGoogle}
        onEmail={loginWithEmail}
        isDark={isDark}
        toggleDark={toggleDark}
        authError={authError}
      />
    );
  }

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
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.displayName || user.email || 'You'}</span>
                      <button onClick={logout} className="text-gray-400 hover:text-red-500">
                          <LogOut size={18} />
                      </button>
                  </div>
                 </>
              ) : (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => loginWithGoogle()}
                      className="bg-chef-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-chef-700 transition-colors"
                    >
                      Google Login
                    </button>
                    <button 
                      onClick={async () => {
                        const email = prompt('Enter email');
                        if (!email) return;
                        const password = prompt('Enter password (min 6 chars)');
                        if (!password) return;
                        try {
                          await loginWithEmail(email, password, 'signin');
                        } catch (err) {
                          if (confirm('No account found. Create one?')) {
                            await loginWithEmail(email, password, 'signup');
                          }
                        }
                      }}
                      className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                    >
                      Email Login
                    </button>
                  </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {view === 'create' && (
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <CreateRecipe 
                onRecipeCreated={handleRecipeCreated} 
                initialUrl={sharedUrl}
              />
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
