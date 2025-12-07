import localforage from 'localforage';
import { Recipe } from '../types';

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
