
// Map of common ingredients in various languages to English (TheMealDB format)
const INGREDIENT_MAP: Record<string, string> = {
  // Spanish
  'pollo': 'Chicken',
  'carne': 'Beef',
  'res': 'Beef',
  'cerdo': 'Pork',
  'pescado': 'Fish',
  'huevo': 'Egg',
  'huevos': 'Egg',
  'leche': 'Milk',
  'queso': 'Cheese',
  'mantequilla': 'Butter',
  'aceite': 'Oil',
  'sal': 'Salt',
  'azucar': 'Sugar',
  'azúcar': 'Sugar',
  'harina': 'Flour',
  'arroz': 'Rice',
  'pasta': 'Pasta',
  'pan': 'Bread',
  'cebolla': 'Onion',
  'ajo': 'Garlic',
  'tomate': 'Tomato',
  'papa': 'Potato',
  'patata': 'Potato',
  'zanahoria': 'Carrot',
  'limon': 'Lemon',
  'limón': 'Lemon',
  'agua': 'Water',
  'pimienta': 'Pepper',
  
  // Portuguese
  'frango': 'Chicken',
  'carne bovina': 'Beef',
  'porco': 'Pork',
  'peixe': 'Fish',
  'ovo': 'Egg',
  'ovos': 'Egg',
  'leite': 'Milk',
  'queijo': 'Cheese',
  'manteiga': 'Butter',
  'oleo': 'Oil',
  'óleo': 'Oil',
  'farinha': 'Flour',
  'pao': 'Bread',
  'pão': 'Bread',
  'cebola': 'Onion',
  'alho': 'Garlic',
  'batata': 'Potato',
  'cenoura': 'Carrot',
  'pimenta': 'Pepper',
  
  // French
  'poulet': 'Chicken',
  'boeuf': 'Beef',
  'porc': 'Pork',
  'poisson': 'Fish',
  'oeuf': 'Egg',
  'oeufs': 'Egg',
  'lait': 'Milk',
  'fromage': 'Cheese',
  'beurre': 'Butter',
  'huile': 'Oil',
  'sel': 'Salt',
  'sucre': 'Sugar',
  'farine': 'Flour',
  'riz': 'Rice',
  'pain': 'Bread',
  'oignon': 'Onion',
  'ail': 'Garlic',
  'pomme de terre': 'Potato',
  'carotte': 'Carrot',
  'citron': 'Lemon',
  'eau': 'Water',
  'poivre': 'Pepper',

  // Italian
  'pollo': 'Chicken',
  'manzo': 'Beef',
  'maiale': 'Pork',
  'pesce': 'Fish',
  'uovo': 'Egg',
  'uova': 'Egg',
  'latte': 'Milk',
  'formaggio': 'Cheese',
  'burro': 'Butter',
  'olio': 'Oil',
  'sale': 'Salt',
  'zucchero': 'Sugar',
  'farina': 'Flour',
  'riso': 'Rice',
  'pane': 'Bread',
  'cipolla': 'Onion',
  'aglio': 'Garlic',
  'pomodoro': 'Tomato',
  'patata': 'Potato',
  'carota': 'Carrot',
  'limone': 'Lemon',
  'acqua': 'Water',
  'pepe': 'Pepper',

  // German
  'hahnchen': 'Chicken',
  'hähnchen': 'Chicken',
  'rindfleisch': 'Beef',
  'schweinefleisch': 'Pork',
  'fisch': 'Fish',
  'ei': 'Egg',
  'eier': 'Egg',
  'milch': 'Milk',
  'kase': 'Cheese',
  'käse': 'Cheese',
  'butter': 'Butter',
  'ol': 'Oil',
  'öl': 'Oil',
  'salz': 'Salt',
  'zucker': 'Sugar',
  'mehl': 'Flour',
  'reis': 'Rice',
  'brot': 'Bread',
  'zwiebel': 'Onion',
  'knoblauch': 'Garlic',
  'tomate': 'Tomato',
  'kartoffel': 'Potato',
  'karotte': 'Carrot',
  'zitrone': 'Lemon',
  'wasser': 'Water',
  'pfeffer': 'Pepper',

  // Common Variations / Plurals
  'eggs': 'Egg',
  'tomatoes': 'Tomato',
  'potatoes': 'Potato',
  'onions': 'Onion',
  'carrots': 'Carrot',
  'lemons': 'Lemon',
  'limes': 'Lime',
  'apples': 'Apple',
  'bananas': 'Banana',
  'strawberries': 'Strawberry',
  'cherries': 'Cherry',
  'blueberries': 'Blueberry',
  'mushrooms': 'Mushroom',
  'avocados': 'Avocado',
  'peppers': 'Pepper',
  'chilies': 'Chili',
  'leaves': 'Leaf',
  'breasts': 'Breast',
  'thighs': 'Thigh',
  'wings': 'Wing',
  'fillets': 'Fillet',
  'steaks': 'Steak',
  'chops': 'Chop',
  'slices': 'Slice',
  'pieces': 'Piece',
  'cloves': 'Clove',
  'bulbs': 'Bulb',
  'heads': 'Head',
  'stalks': 'Stalk',
  'sticks': 'Stick',
  'cans': 'Can',
  'tins': 'Tin',
  'jars': 'Jar',
  'bottles': 'Bottle',
  'cups': 'Cup',
  'tablespoons': 'Tablespoon',
  'teaspoons': 'Teaspoon',
  'pounds': 'Pound',
  'ounces': 'Ounce',
  'grams': 'Gram',
  'kilograms': 'Kilogram',
  'liters': 'Liter',
  'milliliters': 'Milliliter',
  
  // English Overrides & Common Fixes
  'chicken': 'whole-chicken',
  'egg': 'egg',
  'chocolate sugar': 'sugar',
  'vegetable oil': 'vegetable-oil',
  'olive oil': 'olive-oil',
  'milk': 'milk',
  'flour': 'flour',
  'sugar': 'sugar',
  'salt': 'salt',
  'pepper': 'pepper',
  'water': 'water',
};

const ADJECTIVES = [
  'fresh', 'raw', 'cooked', 'dried', 'ground', 'whole', 'chopped', 'sliced', 'diced', 'minced', 'grated', 'crushed',
  'large', 'medium', 'small', 'organic', 'sweet', 'sour', 'hot', 'spicy', 'boneless', 'skinless', 'fat-free', 'low-fat',
  'frozen', 'canned', 'prepared', 'mixed'
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/-/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(' ');

const sanitizeName = (name: string) => {
  const lowered = name.toLowerCase().trim();
  let stripped = lowered;
  ADJECTIVES.forEach(adj => {
    stripped = stripped.replace(new RegExp(`\\b${adj}\\b`, 'gi'), ' ');
  });
  return stripped.replace(/\s+/g, ' ').trim();
};

export const getIngredientImageCandidates = (name: string): string[] => {
  if (!name) return [];

  const cleaned = sanitizeName(name);
  const mapped = INGREDIENT_MAP[cleaned];

  const mappedMatch = mapped
    ? mapped
    : Object.entries(INGREDIENT_MAP).find(([key]) => new RegExp(`\\b${key}\\b`, 'i').test(cleaned))?.[1];

  const baseName = mappedMatch || cleaned || name.trim();
  const slug = slugify(baseName);
  const title = titleCase(baseName);

  if (!slug) return [];

  const candidates = [
    `https://img.spoonacular.com/ingredients_500x500/${slug}.jpg`,
    `https://spoonacular.com/cdn/ingredients_250x250/${slug}.jpg`,
    `https://img.spoonacular.com/ingredients_100x100/${slug}.jpg`,
    `https://www.themealdb.com/images/ingredients/${title}.png`,
    `https://www.themealdb.com/images/ingredients/${title}-Small.png`,
  ];

  const unique = Array.from(new Set(candidates.filter(Boolean)));
  return unique;
};

export const getIngredientImage = (name: string): string => {
  const [first] = getIngredientImageCandidates(name);
  return first || '';
};
