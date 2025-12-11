import localforage from 'localforage';
import { collection, deleteDoc, doc, getDocs, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { Recipe, Folder } from '../types';
import { db } from './firebase';

const recipeStore = localforage.createInstance({
  name: 'chefai',
  storeName: 'recipes',
  description: 'ChefAI saved recipe history',
});

const LEGACY_KEY = 'chef_ai_recipes';

const getLegacyRecipes = (): Recipe[] => {
  try {
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (!legacy) return [];
    const parsed = JSON.parse(legacy);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse legacy recipes from localStorage', error);
    return [];
  }
};

export const migrateLegacyRecipes = async () => {
  if (typeof window === 'undefined') return;
  const legacy = getLegacyRecipes();
  if (!legacy.length) return;
  try {
    await recipeStore.setItem(LEGACY_KEY, legacy);
    window.localStorage.removeItem(LEGACY_KEY);
  } catch (error) {
    console.warn('Could not migrate legacy recipes to IndexedDB', error);
  }
};

export const loadRecipes = async (): Promise<Recipe[]> => {
  try {
    const stored = await recipeStore.getItem<Recipe[]>(LEGACY_KEY);
    if (stored && Array.isArray(stored)) {
      return stored;
    }
  } catch (error) {
    console.error('Failed to load recipes from IndexedDB', error);
  }
  if (typeof window !== 'undefined') {
    return getLegacyRecipes();
  }
  return [];
};

export const saveRecipes = async (recipes: Recipe[]): Promise<void> => {
  try {
    await recipeStore.setItem(LEGACY_KEY, recipes);
  } catch (error) {
    console.error('Failed to persist recipes', error);
  }
};

const userRecipesCollection = (uid: string) => collection(db, 'users', uid, 'recipes');

export const loadUserRecipes = async (uid: string): Promise<Recipe[]> => {
  try {
    console.log(`Loading recipes for user ${uid}...`);
    const snap = await getDocs(userRecipesCollection(uid));
    console.log(`Loaded ${snap.size} recipes for user ${uid}`);
    return snap.docs.map(d => d.data() as Recipe);
  } catch (err) {
    console.error('Could not load recipes from Firestore', err);
    return [];
  }
};

export const saveRecipeForUser = async (uid: string, recipe: Recipe) => {
  try {
    console.log(`Saving recipe ${recipe.id} for user ${uid}...`);
    if (!recipe.id) throw new Error("Recipe ID is missing");
    
    // Ensure undefined values are converted to null so Firestore updates them
    const cleanRecipe: Record<string, any> = {};
    for (const [key, value] of Object.entries(recipe)) {
      cleanRecipe[key] = value === undefined ? null : value;
    }
    
    await setDoc(doc(userRecipesCollection(uid), recipe.id), cleanRecipe, { merge: true });
    console.log(`Successfully saved recipe ${recipe.id}`);
  } catch (err) {
    console.error('Could not save recipe to Firestore', err);
    throw err;
  }
};

export const saveRecipesForUser = async (uid: string, recipes: Recipe[]) => {
  await Promise.all(recipes.map(r => saveRecipeForUser(uid, r)));
};

export const deleteRecipeForUser = async (uid: string, recipeId: string) => {
  try {
    await deleteDoc(doc(userRecipesCollection(uid), recipeId));
  } catch (err) {
    console.warn('Could not delete recipe from Firestore', err);
  }
};

export const loadUserFolders = async (uid: string): Promise<Folder[]> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
        const data = userDoc.data();
        return (data.folders as Folder[]) || [];
    }
    return [];
  } catch (err) {
    console.error('Could not load folders from Firestore', err);
    return [];
  }
};

export const saveFolderForUser = async (uid: string, folder: Folder) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
        const data = userDoc.data();
        const folders = (data.folders as Folder[]) || [];
        const index = folders.findIndex((f: Folder) => f.id === folder.id);
        if (index >= 0) {
            folders[index] = folder;
        } else {
            folders.push(folder);
        }
        await updateDoc(userRef, { folders });
    }
  } catch (err) {
    console.error('Could not save folder to Firestore', err);
    throw err;
  }
};

export const deleteFolderForUser = async (uid: string, folderId: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
        const data = userDoc.data();
        const folders = (data.folders as Folder[]) || [];
        const newFolders = folders.filter((f: Folder) => f.id !== folderId);
        await updateDoc(userRef, { folders: newFolders });
    }
  } catch (err) {
    console.warn('Could not delete folder from Firestore', err);
  }
};
