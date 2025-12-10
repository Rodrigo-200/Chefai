
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
};

export const getIngredientImage = (name: string): string => {
  if (!name) return '';

  // 1. Clean up the name
  let cleanName = name.toLowerCase().trim();
  
  // Remove common prefixes/suffixes that might confuse the match
  const removeWords = [
    'fresh', 'chopped', 'diced', 'sliced', 'minced', 'grated', 'peeled', 'crushed', 'ground', 'dried', 'frozen', 'raw', 'cooked', 'roasted', 'baked', 'fried', 'boiled', 'steamed', 'grilled', 'large', 'medium', 'small', 'whole', 'organic', 'extra', 'virgin', 'olive', 'vegetable', 'sunflower', 'canola', 'coconut', 'almond', 'soy', 'milk', 'white', 'brown', 'red', 'green', 'yellow', 'black', 'blue', 'sweet', 'sour', 'hot', 'spicy', 'mild', 'salt', 'pepper', 'powder', 'sauce', 'paste', 'extract', 'juice', 'zest', 'skin', 'boneless', 'skinless', 'fat-free', 'low-fat', 'full-fat', 'skimmed', 'heavy', 'whipping', 'double', 'single', 'sour', 'cream', 'cheese', 'yogurt', 'butter', 'margarine', 'oil', 'vinegar', 'wine', 'beer', 'cider', 'liquor', 'spirit', 'water', 'broth', 'stock', 'soup', 'bouillon', 'cube', 'granule', 'flake', 'leaf', 'sprig', 'bunch', 'pinch', 'dash', 'drop', 'handful', 'cup', 'tablespoon', 'teaspoon', 'pound', 'ounce', 'gram', 'kilogram', 'liter', 'milliliter', 'can', 'tin', 'jar', 'bottle', 'box', 'bag', 'packet', 'package', 'container', 'tub', 'stick', 'block', 'slice', 'piece', 'wedge', 'chunk', 'fillet', 'steak', 'chop', 'breast', 'thigh', 'wing', 'leg', 'drumstick', 'rib', 'loin', 'shoulder', 'rump', 'brisket', 'shank', 'flank', 'belly', 'liver', 'kidney', 'heart', 'tongue', 'tail', 'head', 'cheek', 'ear', 'foot', 'trotter', 'hock', 'knuckle', 'bone', 'marrow', 'skin', 'fat', 'suet', 'lard', 'dripping', 'tallow', 'grease', 'gelatin', 'agar', 'pectin', 'yeast', 'baking', 'soda', 'powder', 'cornstarch', 'arrowroot', 'tapioca', 'sago', 'flour', 'meal', 'bran', 'germ', 'gluten', 'starch', 'semolina', 'couscous', 'bulgur', 'quinoa', 'millet', 'barley', 'oat', 'rye', 'spelt', 'kamut', 'triticale', 'teff', 'sorghum', 'buckwheat', 'amaranth', 'rice', 'pasta', 'noodle', 'spaghetti', 'macaroni', 'lasagna', 'ravioli', 'tortellini', 'gnocchi', 'dumpling', 'wrapper', 'sheet', 'dough', 'batter', 'crust', 'pastry', 'bread', 'toast', 'bun', 'roll', 'bagel', 'muffin', 'scone', 'biscuit', 'cracker', 'cookie', 'cake', 'pie', 'tart', 'brownie', 'bar', 'pudding', 'custard', 'mousse', 'jelly', 'jam', 'preserve', 'marmalade', 'curd', 'spread', 'dip', 'dressing', 'mayonnaise', 'ketchup', 'mustard', 'relish', 'chutney', 'pickle', 'olive', 'caper', 'anchovy', 'sardine', 'tuna', 'salmon', 'cod', 'haddock', 'halibut', 'trout', 'bass', 'snapper', 'grouper', 'tilapia', 'catfish', 'carp', 'perch', 'pike', 'walleye', 'swordfish', 'marlin', 'shark', 'skate', 'ray', 'eel', 'squid', 'octopus', 'cuttlefish', 'clam', 'mussel', 'oyster', 'scallop', 'shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'snail', 'frog', 'turtle', 'alligator', 'crocodile', 'snake', 'insect', 'worm', 'grub', 'larva', 'pupa', 'egg', 'roe', 'caviar', 'tofu', 'tempeh', 'seitan', 'miso', 'natto', 'soy', 'bean', 'pea', 'lentil', 'chickpea', 'peanut', 'nut', 'seed', 'kernel', 'sprout', 'shoot', 'stalk', 'stem', 'root', 'tuber', 'bulb', 'corm', 'rhizome', 'flower', 'bud', 'fruit', 'berry', 'melon', 'gourd', 'squash', 'pumpkin', 'cucumber', 'zucchini', 'eggplant', 'pepper', 'chili', 'tomato', 'tomatillo', 'okra', 'corn', 'maize', 'wheat', 'rice', 'barley', 'oat', 'rye', 'millet', 'sorghum', 'teff', 'fonio', 'triticale', 'canary', 'grass', 'job', 'tear', 'wild', 'rice', 'bamboo', 'palm', 'heart', 'fern', 'fiddlehead', 'cactus', 'pad', 'aloe', 'vera', 'seaweed', 'algae', 'kelp', 'nori', 'dulse', 'wakame', 'kombu', 'hijiki', 'arame', 'irish', 'moss', 'carrageenan', 'agar', 'spirulina', 'chlorella', 'mushroom', 'fungus', 'truffle', 'yeast', 'mold', 'bacteria', 'probiotic', 'prebiotic', 'enzyme', 'vitamin', 'mineral', 'supplement', 'additive', 'preservative', 'color', 'flavor', 'sweetener', 'sugar', 'syrup', 'honey', 'molasses', 'agave', 'nectar', 'stevia', 'monk', 'fruit', 'erythritol', 'xylitol', 'sorbitol', 'mannitol', 'maltitol', 'isomalt', 'lactitol', 'glycerol', 'saccharin', 'aspartame', 'sucralose', 'acesulfame', 'neotame', 'advantame', 'cyclamate', 'thaumatin', 'brazzein', 'pentadin', 'monellin', 'curculin', 'miraculin', 'glycyrrhizin'
  ];
  
  // 2. Check direct mapping first (for exact matches like "pollo")
  if (INGREDIENT_MAP[cleanName]) {
    return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(INGREDIENT_MAP[cleanName])}.png`;
  }

  // 3. Try to find a mapped word inside the string
  // e.g. "pechuga de pollo" -> contains "pollo" -> "Chicken"
  for (const [key, value] of Object.entries(INGREDIENT_MAP)) {
    if (cleanName.includes(key)) {
       return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(value)}.png`;
    }
  }

  // 4. Fallback to original name (capitalized)
  const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(formattedName)}.png`;
};
