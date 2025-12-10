
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

export const getIngredientImage = (name: string): string => {
  if (!name) return '';

  // 1. Clean up the name
  let cleanName = name.toLowerCase().trim();
  
  // Common adjectives to remove for better matching
  const ADJECTIVES = [
    'fresh', 'raw', 'cooked', 'dried', 'ground', 'whole', 'chopped', 'sliced', 'diced', 'minced', 'grated', 'crushed',
    'large', 'medium', 'small', 'organic', 'sweet', 'sour', 'hot', 'spicy', 'boneless', 'skinless', 'fat-free', 'low-fat',
    'frozen', 'canned', 'prepared', 'mixed'
  ];

  // 2. Check direct mapping first
  if (INGREDIENT_MAP[cleanName]) {
    const mappedSlug = INGREDIENT_MAP[cleanName].toLowerCase().replace(/\s+/g, '-');
    return `https://spoonacular.com/cdn/ingredients_250x250/${mappedSlug}.jpg`;
  }

  // 3. Try to find a mapped word inside the string
  for (const [key, value] of Object.entries(INGREDIENT_MAP)) {
    // Only match if it's a whole word
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(cleanName)) {
       const mappedSlug = value.toLowerCase().replace(/\s+/g, '-');
       return `https://spoonacular.com/cdn/ingredients_250x250/${mappedSlug}.jpg`;
    }
  }

  // 4. Clean adjectives and try again
  let strippedName = cleanName;
  ADJECTIVES.forEach(adj => {
      strippedName = strippedName.replace(new RegExp(`\\b${adj}\\b`, 'gi'), '').trim();
  });
  strippedName = strippedName.replace(/\s+/g, ' ').trim();

  if (strippedName && strippedName !== cleanName) {
      const slug = strippedName.replace(/\s+/g, '-');
      return `https://spoonacular.com/cdn/ingredients_250x250/${slug}.jpg`;
  }

  // 5. Fallback to original name (slugified)
  const slug = cleanName.replace(/\s+/g, '-');
  return `https://spoonacular.com/cdn/ingredients_250x250/${slug}.jpg`;
};
