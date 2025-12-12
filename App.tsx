import React, { useState, useEffect } from 'react';
import { ChefHat, BookOpen, PlusCircle, LogOut, Search, Moon, Sun, Shield, Mail, Lock, ArrowRight, Home, User as UserIcon, FolderPlus, ChevronLeft, Folder as FolderIcon, Settings } from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from 'firebase/auth';
import { Recipe, AppView, User, Folder } from './types';
import { CreateRecipe } from './components/CreateRecipe';
import { RecipeView } from './components/RecipeView';
import { RecipeCard } from './components/RecipeCard';
import { FolderCard } from './components/FolderCard';
import { FolderModal } from './components/FolderModal';
import { MoveToFolderModal } from './components/MoveToFolderModal';
import { FloatingActionMenu } from './components/FloatingActionMenu';
import { AddFromSavedModal } from './components/AddFromSavedModal';
import { loadRecipes, saveRecipes, migrateLegacyRecipes, loadUserRecipes, saveRecipeForUser, deleteRecipeForUser, loadUserFolders, saveFolderForUser, deleteFolderForUser } from './services/storageService';
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
  const [mobileTab, setMobileTab] = useState<'saved' | 'all'>('all');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Handle PWA Share Target
  useEffect(() => {
    // Check for server-injected share data (POST method)
    const serverShareData = (window as any).__SHARE_DATA__;
    if (serverShareData) {
      const { url, text, title } = serverShareData;
      const content = url || text || title;
      if (content) {
        const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          setSharedUrl(urlMatch[0]);
          setView('create');
          // Clear the global to prevent re-triggering
          (window as any).__SHARE_DATA__ = null;
        }
      }
    }

    // Check for URL params (GET method fallback)
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

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [recipeToMove, setRecipeToMove] = useState<Recipe | null>(null);

  // Load recipes for the current user (cloud) or fallback to local for guests
  useEffect(() => {
    let mounted = true;
    (async () => {
      await migrateLegacyRecipes();
      if (user) {
        console.log("User logged in, loading cloud recipes for:", user.uid);
        try {
          const cloudRecipes = await loadUserRecipes(user.uid);
          const cloudFolders = await loadUserFolders(user.uid);
          if (mounted) {
            console.log("Cloud recipes loaded:", cloudRecipes.length);
            setRecipes(cloudRecipes);
            setFolders(cloudFolders);
          }
        } catch (e) {
          console.error("Error loading cloud recipes:", e);
        }
      } else {
        console.log("No user, loading local recipes");
        const localRecipes = await loadRecipes();
        if (mounted) {
          setRecipes(localRecipes);
          setFolders([]);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const handleCreateFolder = (name: string) => {
    if (!user) return;
    
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      recipeCount: 0,
    };

    saveFolderForUser(user.uid, newFolder).then(() => {
      setFolders([...folders, newFolder]);
    }).catch(error => {
      console.error("Failed to create folder:", error);
      alert("Failed to create folder.");
    });
  };

  const handleMoveRecipe = async (folderId: string | undefined) => {
      if (!user || !recipeToMove) return;
      
      // Use null instead of undefined to ensure Firestore clears the field
      const updatedRecipe = { ...recipeToMove, folderId: folderId || null };
      
      // Optimistic update
      setRecipes(recipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
      setRecipeToMove(null);
      
      try {
          await saveRecipeForUser(user.uid, updatedRecipe);
      } catch (error) {
          console.error("Failed to move recipe:", error);
          // Revert on failure
          setRecipes(recipes.map(r => r.id === recipeToMove.id ? recipeToMove : r));
          alert("Failed to move recipe.");
      }
  };

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!confirm("Are you sure you want to delete this folder? Recipes inside will be moved to 'All Recipes'.")) return;

    try {
      await deleteFolderForUser(user.uid, folderId);
      setFolders(folders.filter(f => f.id !== folderId));
      
      // Update recipes to remove folderId
      const recipesInFolder = recipes.filter(r => r.folderId === folderId);
      const updatedRecipes = recipesInFolder.map(r => ({ ...r, folderId: undefined }));
      
      // Optimistically update local state
      setRecipes(recipes.map(r => r.folderId === folderId ? { ...r, folderId: undefined } : r));

      // Update in firestore
      await Promise.all(updatedRecipes.map(r => saveRecipeForUser(user.uid, r)));

    } catch (error) {
      console.error("Failed to delete folder:", error);
      alert("Failed to delete folder.");
    }
  };

  const [isAddFromSavedModalOpen, setIsAddFromSavedModalOpen] = useState(false);

  const handleAddFromSaved = async (recipeIds: string[]) => {
    if (!user || !currentFolderId) return;

    const updatedRecipes = recipes.map(r => {
      if (recipeIds.includes(r.id)) {
        return { ...r, folderId: currentFolderId };
      }
      return r;
    });

    setRecipes(updatedRecipes);

    try {
      const recipesToUpdate = updatedRecipes.filter(r => recipeIds.includes(r.id));
      await Promise.all(recipesToUpdate.map(r => saveRecipeForUser(user.uid, r)));
    } catch (error) {
      console.error("Failed to add recipes to folder:", error);
      alert("Failed to add recipes to folder.");
    }
  };

  const handleRecipeCreated = async (recipe: Recipe) => {
    // If created while in a folder, assign it to that folder
    if (currentFolderId) {
        recipe.folderId = currentFolderId;
    }

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
      if (!searchQuery) return true;
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
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 print:hidden hidden md:block">
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
                 <div className="hidden md:flex items-center gap-4">
                  <button 
                    onClick={() => setView('create')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'create' ? 'bg-chef-50 dark:bg-chef-900/50 text-chef-700 dark:text-chef-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <div className="flex items-center gap-1">
                        <PlusCircle size={18} />
                        <span>New Recipe</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => setView('dashboard')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-chef-50 dark:bg-chef-900/50 text-chef-700 dark:text-chef-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                     <div className="flex items-center gap-1">
                        <BookOpen size={18} />
                        <span>My Cookbook ({savedRecipes.length})</span>
                    </div>
                  </button>
                  <div className="h-6 w-px bg-gray-200 dark:bg-gray-600 mx-2"></div>
                  <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.displayName || user.email || 'You'}</span>
                      <button onClick={logout} className="text-gray-400 hover:text-red-500">
                          <LogOut size={18} />
                      </button>
                  </div>
                 </div>
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

      {/* Mobile Header */}
      <div className="md:hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40 px-4 h-16 flex items-center justify-between transition-all duration-300">
          <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-br from-chef-500 to-chef-600 p-2 rounded-xl text-white shadow-lg shadow-chef-500/20">
                <ChefHat size={20} />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Recipe<span className="text-chef-600">Snap</span>
              </span>
          </div>
          <button
            onClick={toggleDark}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {view === 'create' && (
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 pb-24 md:pb-12">
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
            folders={folders}
          />
        )}

        {view === 'dashboard' && (
             <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 pb-40 md:pb-12">
                
                {/* Search Bar - Always at top */}
                <div className="mb-4 max-w-3xl mx-auto">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search recipes..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full focus:ring-2 focus:ring-chef-500 focus:border-chef-500 outline-none text-base shadow-sm dark:text-white dark:placeholder-gray-400"
                        />
                    </div>
                </div>

                {/* Simple recipe count */}
                <div className="flex items-center justify-between mb-4 px-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {searchQuery ? `${filteredRecipes.length} results` : `${recipes.length} recipes`}
                    </span>
                </div>

                {/* Recipe Grid - Clean, simple, all recipes */}
                {recipes.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
                        {(searchQuery ? filteredRecipes : recipes).map(recipe => (
                            <RecipeCard 
                                key={recipe.id} 
                                recipe={recipe} 
                                onClick={(r) => { setActiveRecipe(r); setView('recipe-detail'); }}
                                isSaved={user ? user.savedRecipeIds.includes(recipe.id) : false}
                                onRemove={() => handleDeleteRecipe(recipe.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 dark:text-gray-600">
                            <ChefHat size={40} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            No recipes yet
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                            Add your first recipe to get started
                        </p>
                        <button 
                            onClick={() => setView('create')}
                            className="inline-flex items-center gap-2 bg-chef-600 text-white px-6 py-3 rounded-full font-medium hover:bg-chef-700 transition-colors"
                        >
                            <PlusCircle size={18} />
                            Add Recipe
                        </button>
                    </div>
                )}

                {/* No results state */}
                {searchQuery && filteredRecipes.length === 0 && recipes.length > 0 && (
                    <div className="text-center py-12">
                        <Search size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="text-gray-500 dark:text-gray-400">No recipes found for "{searchQuery}"</p>
                    </div>
                )}
             </div>
        )}

        {/* Collections View */}
        {view === 'collections' && (
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 pb-40 md:pb-12">
                {!currentFolderId ? (
                    <>
                        {/* Collections Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Collections</h1>
                            <button
                                onClick={() => setIsFolderModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-chef-600 text-white rounded-full text-sm font-medium hover:bg-chef-700 transition-colors"
                            >
                                <FolderPlus size={18} />
                                New
                            </button>
                        </div>

                        {/* Collections Grid */}
                        {folders.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
                                {folders.map(folder => {
                                    const count = recipes.filter(r => r.folderId === folder.id).length;
                                    const folderRecipes = recipes.filter(r => r.folderId === folder.id);
                                    const coverImage = folderRecipes[0]?.imageUrl;
                                    
                                    return (
                                        <div
                                            key={folder.id}
                                            onClick={() => setCurrentFolderId(folder.id)}
                                            className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 group text-left cursor-pointer"
                                        >
                                            {coverImage ? (
                                                <img src={coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <FolderIcon size={40} className="text-gray-300 dark:text-gray-600" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                                <p className="font-semibold text-white text-lg">{folder.name}</p>
                                                <p className="text-white/70 text-sm">{count} recipe{count !== 1 ? 's' : ''}</p>
                                            </div>
                                            {/* Delete button */}
                                            <button
                                                onClick={(e) => handleDeleteFolder(folder.id, e)}
                                                className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                                            >
                                                <LogOut size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FolderIcon size={40} className="text-gray-300 dark:text-gray-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No collections yet</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Organize your recipes into collections</p>
                                <button 
                                    onClick={() => setIsFolderModalOpen(true)}
                                    className="inline-flex items-center gap-2 bg-chef-600 text-white px-6 py-3 rounded-full font-medium hover:bg-chef-700 transition-colors"
                                >
                                    <FolderPlus size={18} />
                                    Create Collection
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Inside a Collection */}
                        <div className="flex items-center gap-3 mb-6">
                            <button 
                                onClick={() => setCurrentFolderId(null)}
                                className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {folders.find(f => f.id === currentFolderId)?.name}
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {recipes.filter(r => r.folderId === currentFolderId).length} recipes
                                </p>
                            </div>
                        </div>

                        {/* Add to collection button */}
                        <button
                            onClick={() => setIsAddFromSavedModalOpen(true)}
                            className="w-full mb-6 p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-500 dark:text-gray-400 hover:border-chef-400 hover:text-chef-600 dark:hover:text-chef-400 transition-colors flex items-center justify-center gap-2"
                        >
                            <PlusCircle size={20} />
                            Add recipes to this collection
                        </button>

                        {/* Recipes in collection */}
                        {recipes.filter(r => r.folderId === currentFolderId).length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
                                {recipes.filter(r => r.folderId === currentFolderId).map(recipe => (
                                    <RecipeCard 
                                        key={recipe.id} 
                                        recipe={recipe} 
                                        onClick={(r) => { setActiveRecipe(r); setView('recipe-detail'); }}
                                        isSaved={user ? user.savedRecipeIds.includes(recipe.id) : false}
                                        onRemove={() => handleDeleteRecipe(recipe.id)}
                                        onMove={() => { setRecipeToMove(recipe); setIsMoveModalOpen(true); }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500 dark:text-gray-400">No recipes in this collection yet</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        )}
      </main>

      {/* Bottom Navigation for Mobile - Samsung Food style */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 pb-safe">
          <div className="flex items-center justify-around h-16">
            <button 
              onClick={() => { setView('dashboard'); setCurrentFolderId(null); }}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${view === 'dashboard' && !currentFolderId ? 'text-chef-600 dark:text-chef-400' : 'text-gray-400 dark:text-gray-500'}`}
            >
              <BookOpen size={22} strokeWidth={view === 'dashboard' && !currentFolderId ? 2.5 : 1.5} />
              <span className="text-[10px] mt-1 font-medium">Recipes</span>
            </button>

            <button 
              onClick={() => { setView('collections'); }}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${view === 'collections' ? 'text-chef-600 dark:text-chef-400' : 'text-gray-400 dark:text-gray-500'}`}
            >
              <FolderIcon size={22} strokeWidth={view === 'collections' ? 2.5 : 1.5} />
              <span className="text-[10px] mt-1 font-medium">Collections</span>
            </button>
            
            <button 
              onClick={() => setView('create')}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${view === 'create' ? 'text-chef-600 dark:text-chef-400' : 'text-gray-400 dark:text-gray-500'}`}
            >
              <PlusCircle size={22} strokeWidth={view === 'create' ? 2.5 : 1.5} />
              <span className="text-[10px] mt-1 font-medium">Add</span>
            </button>

            <button 
              onClick={() => setShowAccountMenu(true)}
              className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 dark:text-gray-500"
            >
              <UserIcon size={22} strokeWidth={1.5} />
              <span className="text-[10px] mt-1 font-medium">Account</span>
            </button>
          </div>
        </div>
      )}

      {/* Account Menu Modal */}
      {showAccountMenu && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowAccountMenu(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div 
            className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6" />
            
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 bg-chef-100 dark:bg-chef-900/50 rounded-full flex items-center justify-center text-chef-600 dark:text-chef-400">
                <UserIcon size={28} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{user?.displayName || 'User'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
            </div>

            <button
              onClick={() => { toggleDark(); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors mb-2"
            >
              {isDark ? <Sun size={22} /> : <Moon size={22} />}
              <span className="font-medium text-gray-700 dark:text-gray-200">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <button
              onClick={() => { setShowAccountMenu(false); logout(); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
            >
              <LogOut size={22} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8 mt-auto print:hidden hidden md:block">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm">
                &copy; 2025 RecipeSnap
            </p>
        </div>
      </footer>
      {/* Modals */}
      <FolderModal 
        isOpen={isFolderModalOpen} 
        onClose={() => setIsFolderModalOpen(false)} 
        onSave={handleCreateFolder} 
        mode="create" 
      />
      
      <MoveToFolderModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onMove={handleMoveRecipe}
        folders={folders}
        currentFolderId={recipeToMove?.folderId}
      />

      <AddFromSavedModal
        isOpen={isAddFromSavedModalOpen}
        onClose={() => setIsAddFromSavedModalOpen(false)}
        onAdd={handleAddFromSaved}
        savedRecipes={recipes}
        currentFolderId={currentFolderId || ''}
      />
    </div>
  );
}
