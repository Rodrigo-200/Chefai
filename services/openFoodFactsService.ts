export interface OffIngredientInfo {
  ingredient_name: string;
  matched_product_name: string;
  image_url: string;
  calories_per_100g: number | null;
  source_attribution: string;
}

interface OffProduct {
  product_name?: string;
  image_front_url?: string;
  image_url?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kj_100g'?: number;
  } | null;
}

interface OffSearchResponse {
  products: OffProduct[];
}

const OFF_ENDPOINT = 'https://world.openfoodfacts.org/cgi/search.pl';

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const parsed = typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

const kjToKcal = (kj: number | null): number | null => {
  if (!kj) return null;
  return kj / 4.184;
};

const pickBestProduct = (products: OffProduct[]): OffProduct | null => {
  for (const product of products) {
    if (!product) continue;
    const hasImage = Boolean(product.image_front_url || product.image_url);
    const hasNutriments = Boolean(product.nutriments && Object.keys(product.nutriments).length > 0);
    if (hasImage && hasNutriments) return product;
  }
  return null;
};

export const fetchIngredientInfoFromOFF = async (ingredientName: string): Promise<OffIngredientInfo | null> => {
  if (!ingredientName || !ingredientName.trim()) return null;

  const params = new URLSearchParams({
    search_terms: ingredientName,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '20',
    sort_by: 'unique_scans_n',
  });

  const url = `${OFF_ENDPOINT}?${params.toString()}`;
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    console.warn('Open Food Facts request failed', response.status, response.statusText);
    return null;
  }

  const data = (await response.json()) as OffSearchResponse;
  if (!data?.products?.length) return null;

  const product = pickBestProduct(data.products);
  if (!product) return null;

  const kcal = toNumberOrNull(product.nutriments?.['energy-kcal_100g']);
  const kj = toNumberOrNull(product.nutriments?.['energy-kj_100g']);
  const calories = kcal ?? (kjToKcal(kj) ?? null);

  const imageUrl = product.image_front_url || product.image_url;
  if (!imageUrl) return null;

  return {
    ingredient_name: ingredientName,
    matched_product_name: product.product_name || ingredientName,
    image_url: imageUrl,
    calories_per_100g: calories,
    source_attribution: 'Data from Open Food Facts, ODbL License',
  };
};
