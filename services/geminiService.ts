import { Recipe } from "../types";

export interface GenerateRecipeParams {
  mediaFiles?: File[];
  textInput?: string;
  userInstructions?: string;
  languageHint?: string;
  sourceUrl?: string;
  remoteUrl?: string;
}

export interface GenerateRecipeResponse {
  recipe: Recipe;
  metadata: {
    transcript?: string;
    ocrText?: string;
    languageCode?: string;
    coverImage?: string | null;
  };
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '';

export const generateRecipe = async (params: GenerateRecipeParams): Promise<GenerateRecipeResponse> => {
  const form = new FormData();

  params.mediaFiles?.forEach((file) => {
    form.append('media', file);
  });

  if (params.textInput) form.append('textInput', params.textInput);
  if (params.userInstructions) form.append('userInstructions', params.userInstructions);
  if (params.languageHint) form.append('languageHint', params.languageHint);
  if (params.sourceUrl) form.append('sourceUrl', params.sourceUrl);
  if (params.remoteUrl) form.append('remoteUrl', params.remoteUrl);

  const endpoint = `${API_BASE}/api/recipes`;
  const response = await fetch(endpoint, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to generate recipe');
  }

  return response.json();
};
