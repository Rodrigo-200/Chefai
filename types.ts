export enum MeasurementUnit {
  Grams = 'g',
  Kilograms = 'kg',
  Milliliters = 'ml',
  Liters = 'l',
  Teaspoon = 'tsp',
  Tablespoon = 'tbsp',
  Cup = 'cup',
  Piece = 'pc',
  Slice = 'slice',
  Pinch = 'pinch',
  None = ''
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  notes?: string;
}

export interface InstructionStep {
  stepNumber: number;
  description: string;
  timerSeconds?: number; // Estimated time for this step if applicable
}

export interface NutritionInfo {
  calories?: string;
  protein?: string;
  carbs?: string;
  fats?: string;
  totalCalories?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: Ingredient[];
  instructions: InstructionStep[];
  nutrition: NutritionInfo;
  imageUrl?: string; // Base64 or URL
  sourceUrl?: string; // If from URL
  languageCode?: string;
  transcript?: string;
  ocrText?: string;
  createdAt: number;
  tags: string[];
}

export interface User {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  provider?: string;
  savedRecipeIds: string[];
}

export type AppView = 'dashboard' | 'create' | 'recipe-detail' | 'login';