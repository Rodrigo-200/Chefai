import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import ytdlp from 'yt-dlp-exec';
import dotenv from 'dotenv';
import { franc } from 'franc';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { promises as fs, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { jsonrepair } from 'jsonrepair';
import rateLimit from 'express-rate-limit';

const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) {
  console.warn('⚠️  GEMINI_API_KEY missing. Set it in .env.local to enable the server.');
}

const app = express();
const port = process.env.PORT || 4000;

// Rate limiting: Max 10 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 60 * 1024 * 1024,
    files: 6,
  }
});

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const ai = GEMINI_KEY ? new GoogleGenAI({ apiKey: GEMINI_KEY }) : null;
const multimodalModel = 'gemini-2.5-pro';
const transcriptModel = 'gemini-2.5-pro';

const recipeSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    cuisine: { type: 'string' },
    prepTime: { type: 'string' },
    cookTime: { type: 'string' },
    servings: { type: 'string' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'string' },
          unit: { type: 'string' },
          notes: { type: 'string' }
        }
      }
    },
    instructions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          stepNumber: { type: 'integer' },
          description: { type: 'string' },
          timerSeconds: { type: 'integer' }
        }
      }
    },
    nutrition: {
      type: 'object',
      properties: {
        calories: { type: 'string' },
        protein: { type: 'string' },
        carbs: { type: 'string' },
        fats: { type: 'string' }
      }
    },
    tags: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['title', 'ingredients', 'instructions']
};

const nutritionEstimateSchema = {
  type: 'object',
  properties: {
    portionCount: { type: 'number' },
    portionDescription: { type: 'string' },
    totalCalories: { type: 'number' },
    caloriesPerPortion: { type: 'number' },
    reasoning: { type: 'string' },
  },
  required: ['portionCount', 'totalCalories', 'caloriesPerPortion']
};

const extractResponseText = (response) => {
  if (!response) return '';
  try {
    if (typeof response.text === 'function') {
      const maybeText = response.text();
      if (maybeText) return maybeText;
    }
    if (typeof response.text === 'string' && response.text.trim()) {
      return response.text;
    }

    const fromCandidates = response.candidates
      ?.flatMap((candidate) => candidate.content ? candidate.content.parts || [] : [])
      ?.map((part) => part?.text)
      ?.filter(Boolean)
      ?.join('\n');
    if (fromCandidates) return fromCandidates;

    const fromOutput = response.output
      ?.flatMap((item) => item.content ? item.content.parts || [] : [])
      ?.map((part) => part?.text)
      ?.filter(Boolean)
      ?.join('\n');
    if (fromOutput) return fromOutput;
  } catch (err) {
    console.warn('Unable to read Gemini response text', err);
  }
  return '';
};

const bufferToBase64 = (buffer) => buffer.toString('base64');
const SUPPORTED_MEDIA_PREFIXES = ['video/', 'audio/', 'image/'];
const MIME_LOOKUP = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
};

const isSupportedMime = (mime) => SUPPORTED_MEDIA_PREFIXES.some(prefix => mime.startsWith(prefix));

const computeWarmthScore = (channels = []) => {
  if (!channels.length) return 0;
  const red = channels[0]?.mean || 0;
  const green = channels[1]?.mean || 0;
  const blue = channels[2]?.mean || 0;
  // Food is often warm (Red/Yellow). Blue is usually background/plates/shadows.
  // Boost Red and Green, penalize Blue to favor food tones over cool backgrounds.
  return Math.max(0, (red * 1.2 + green * 0.8) - blue * 1.5);
};

const captureVideoFrame = async (buffer, ext = 'mp4') => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chefai-'));
  const inputPath = path.join(tempDir, `source.${ext}`);
  await fs.writeFile(inputPath, buffer);

  // Sample more frames near the end where the final dish is usually shown
  const timestamps = ['40%', '60%', '75%', '85%', '90%', '95%', '99%'];
  const filename = 'frame-%i.png';

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .on('end', resolve)
      .on('error', reject)
      .screenshots({
        count: timestamps.length,
        timestamps,
        folder: tempDir,
        filename,
        size: '1280x?',
      });
  });

  let bestDataUrl = null;
  let bestScore = -Infinity;

  for (let i = 1; i <= timestamps.length; i += 1) {
    const framePath = path.join(tempDir, `frame-${i}.png`);
    try {
      const frameBuffer = await fs.readFile(framePath);
      const stats = await sharp(frameBuffer).stats();
      const channelStats = stats.channels || [];
      const channelCount = channelStats.length || 1;
      
      const red = channelStats[0]?.mean || 0;
      const green = channelStats[1]?.mean || 0;
      const blue = channelStats[2]?.mean || 0;
      
      const mean = (red + green + blue) / 3;
      const variance = channelStats.reduce((sum, channel) => sum + (channel.stdev || 0), 0) / channelCount;
      const warmth = computeWarmthScore(channelStats);
      
      // Estimate saturation (colorfulness) - food is usually more saturated than surroundings
      const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);

      // Heavily favor the end of the video for the "final result"
      const recencyBoost = (i / timestamps.length) * 40; 
      
      // Penalize very dark frames (fade outs) or very bright frames (flash/white screen)
      const brightnessPenalty = mean < 40 ? -100 : (mean > 230 ? -50 : 0);
      
      const wellLitBonus = mean > 60 && mean < 200 ? 20 : 0;
      
      // Adjusted weights to prioritize colorful, warm, detailed frames (food-like)
      const score = (stats.entropy || 0) * 40  // Detail/Texture
        + variance * 5                         // Contrast
        + warmth * 2.5                         // Warm colors (food tones)
        + saturation * 2.0                     // Colorfulness
        + recencyBoost                         // End of video preference
        + wellLitBonus
        + brightnessPenalty;
      
      if (score > bestScore) {
        bestScore = score;
        bestDataUrl = `data:image/png;base64,${frameBuffer.toString('base64')}`;
      }
    } catch (frameErr) {
      console.warn('Failed to process frame for cover image', frameErr.message);
    }
  }

  await fs.rm(tempDir, { recursive: true, force: true });
  return bestDataUrl || null;
};

const iso3ToBcp = {
  por: 'pt-PT',
  spa: 'es-ES',
  eng: 'en-US',
  fra: 'fr-FR',
  deu: 'de-DE',
  ita: 'it-IT',
  jpn: 'ja-JP',
  zho: 'zh-CN',
  kor: 'ko-KR',
};

const detectLanguage = (text, userHint = 'auto') => {
  if (userHint && userHint !== 'auto') return userHint;
  if (!text) return 'auto';
  const detection = franc(text, { minLength: 20 });
  if (detection === 'und') return 'auto';
  return iso3ToBcp[detection] || detection;
};

const languageLabel = (code) => {
  const map = {
    'pt-PT': 'Portuguese',
    'es-ES': 'Spanish',
    'en-US': 'English',
    'fr-FR': 'French',
    'de-DE': 'German',
    'it-IT': 'Italian',
    'ja-JP': 'Japanese',
    'zh-CN': 'Chinese',
    'ko-KR': 'Korean',
  };
  if (map[code]) return map[code];
  if (iso3ToBcp[code]) {
    return map[iso3ToBcp[code]] || 'source language';
  }
  return 'source language';
};

const MAX_TIMER_SECONDS = 4 * 60 * 60; // 4 hours
const FILLER_PATTERNS = [/haha/gi, /hehe/gi, /lol/gi, /caralho/gi, /foda-se/gi, /puta que pariu/gi];
const LONG_REST_KEYWORDS = ['overnight', 'durante a noite', 'noite toda', 'pernoite', 'descansar a noite', 'rest overnight'];
const HOURS_INTERVAL_REGEX = /(\d+(?:[.,]\d+)?)\s*(?:-|–|a|à|to)\s*(\d+(?:[.,]\d+)?)\s*(?:hours?|hrs?|horas?|h)\b/i;
const HOURS_REGEX = /(\d+(?:[.,]\d+)?)\s*(?:hours?|hrs?|horas?|h)\b/i;
const FRACTION_CHAR_MAP = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};
const UNIT_ALIASES = {
  g: ['g', 'gram', 'grams', 'grama', 'gramas'],
  kg: ['kg', 'kilogram', 'kilograms', 'quilo', 'quilos'],
  mg: ['mg', 'milligram', 'milligrams'],
  lb: ['lb', 'lbs', 'pound', 'pounds', 'libra', 'libras'],
  oz: ['oz', 'ounce', 'ounces', 'onza'],
  ml: ['ml', 'mililitro', 'mililitros', 'milliliter', 'milliliters'],
  l: ['l', 'litro', 'litros', 'liter', 'liters'],
  cup: ['cup', 'cups', 'xícara', 'xicaras', 'xícaras', 'xicara', 'caneca'],
  tbsp: ['tbsp', 'tablespoon', 'tablespoons', 'colher de sopa', 'colheres de sopa', 'cda'],
  tsp: ['tsp', 'teaspoon', 'teaspoons', 'colher de chá', 'colheres de chá', 'colher de cha', 'colheres de cha', 'cdt', 'cdita'],
  pinch: ['pinch', 'pitada', 'pitadas'],
  unit: ['unit', 'units', 'unidade', 'unidades', 'whole', 'inteiro'],
  can: ['lata', 'latinha', 'can'],
};
const UNIT_FACTORS = {
  g: { type: 'weight', factor: 1 },
  kg: { type: 'weight', factor: 1000 },
  mg: { type: 'weight', factor: 0.001 },
  lb: { type: 'weight', factor: 453.592 },
  oz: { type: 'weight', factor: 28.3495 },
  cup: { type: 'volume', factor: 240 },
  tbsp: { type: 'volume', factor: 15 },
  tsp: { type: 'volume', factor: 5 },
  ml: { type: 'volume', factor: 1 },
  l: { type: 'volume', factor: 1000 },
  pinch: { type: 'weight', factor: 0.36 },
};
const DEFAULT_CALORIES_PER_GRAM = 1.2;
const DEFAULT_UNIT_MASS = 60;
const COOKING_METHOD_MULTIPLIERS = [
  { regex: /(frit|deep\s?fry|fried|óleo quente|saltear|sauté)/i, multiplier: 1.12 },
  { regex: /(assar|forno|bake|roast|oven)/i, multiplier: 1.02 },
];
const SMALL_TREAT_PORTIONS = [
  { regex: /(bombones?|brigadeir[oa]s?|trufas?|truffles?|bites?|bolinhas|docinhos|brigadiers)/i, gramsPerUnit: 22 },
  { regex: /(cookies?|gallet[ai]tas?|biscuits?)/i, gramsPerUnit: 32 },
  { regex: /(muffins?|cupcakes?)/i, gramsPerUnit: 60 },
  { regex: /(bars?|barras?|brownies?)/i, gramsPerUnit: 45 },
];
const CALORIE_PROFILES = [
  { keywords: ['sugar', 'açúcar'], caloriesPerGram: 3.87, density: 0.85 },
  { keywords: ['sweetened condensed milk', 'leite condensado'], caloriesPerGram: 3.2, gramsPerUnit: 395 },
  { keywords: ['milk', 'leite integral', 'whole milk', 'leite'], caloriesPerMl: 0.64, density: 1.03 },
  { keywords: ['cream', 'creme de leite', 'nata'], caloriesPerMl: 3.4, density: 1.01 },
  { keywords: ['butter', 'manteiga', 'ghee'], caloriesPerGram: 7.17 },
  { keywords: ['flour', 'farinha', 'farinha de trigo'], caloriesPerGram: 3.64 },
  { keywords: ['egg', 'ovo'], caloriesPerUnit: 72, gramsPerUnit: 50 },
  { keywords: ['oil', 'óleo', 'azeite'], caloriesPerMl: 8.0, density: 0.91 },
  { keywords: ['chocolate', 'cacau'], caloriesPerGram: 5.46 },
  { keywords: ['coconut milk', 'leite de coco'], caloriesPerMl: 2.3, density: 1 },
  { keywords: ['cream cheese', 'requeijão', 'queijo creme'], caloriesPerGram: 3.5 },
  { keywords: ['doce de leite', 'dulce de leche'], caloriesPerGram: 3.2 },
];

const cleanInstructionDescription = (text = '') => {
  if (!text) return '';
  let cleaned = text.replace(/\s+/g, ' ').trim();
  FILLER_PATTERNS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, '').trim();
  });
  return cleaned.replace(/\s{2,}/g, ' ').replace(/\s([,.;])/g, '$1').trim();
};

const mentionsLongRest = (description = '') => {
  if (!description) return false;
  const lower = description.toLowerCase();
  if (LONG_REST_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return true;
  }
  const intervalMatch = description.match(HOURS_INTERVAL_REGEX);
  if (intervalMatch) {
    const first = parseFloat(intervalMatch[1].replace(',', '.'));
    const second = parseFloat(intervalMatch[2].replace(',', '.'));
    if (first >= 5 || second >= 5) return true;
  }
  const singleMatch = description.match(HOURS_REGEX);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1].replace(',', '.'));
    if (value >= 5) return true;
  }
  return false;
};

const stripDiacritics = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const replaceUnicodeFractions = (value = '') => {
  return value
    .split('')
    .map((char) => (FRACTION_CHAR_MAP[char] ? ` ${FRACTION_CHAR_MAP[char]} ` : char))
    .join(' ');
};

const parseAmountValue = (value = '') => {
  if (!value) return null;
  let normalized = replaceUnicodeFractions(value).replace(/,/g, '.').trim();
  if (!normalized) return null;
  const rangeMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:-|–|a|à|to)\s*(\d+(?:\.\d+)?)$/i);
  if (rangeMatch) {
    return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
  }
  normalized = normalized.replace(/(\d+)\s+(\d+)\/(\d+)/g, (_, whole, num, den) => (Number(whole) + Number(num) / Number(den)).toString());
  normalized = normalized.replace(/(\d+)\/(\d+)/g, (_, num, den) => (Number(num) / Number(den)).toString());
  const matches = normalized.match(/-?\d+(?:\.\d+)?/g);
  if (!matches) return null;
  const total = matches.slice(0, 2).reduce((sum, token) => sum + parseFloat(token), 0);
  return Number.isFinite(total) && total > 0 ? total : null;
};

const normalizeUnit = (unit = '') => {
  const trimmed = unit.toLowerCase().trim();
  if (!trimmed) return '';
  const normalizedSource = stripDiacritics(trimmed);
  const alias = Object.entries(UNIT_ALIASES).find(([, values]) =>
    values.some((candidate) => {
      const normalizedCandidate = stripDiacritics(candidate);
      if (normalizedSource === normalizedCandidate) return true;
      return normalizedCandidate.length > 1 && normalizedSource.includes(normalizedCandidate);
    })
  );
  if (alias) return alias[0];
  return trimmed;
};

const findCalorieProfile = (name = '') => {
  const lower = name.toLowerCase();
  return CALORIE_PROFILES.find((profile) => profile.keywords.some((keyword) => lower.includes(keyword))) || null;
};

const estimateIngredientContribution = (ingredient) => {
  const rawAmountText = (ingredient.amount || '').toString().trim();
  let amount = parseAmountValue(rawAmountText);
  if (amount === null) {
    amount = parseAmountValue(ingredient.name || '');
  }
  if (amount === null) {
    const combined = `${ingredient.amount || ''} ${ingredient.unit || ''}`.toLowerCase();
    amount = /a gosto|a seu gosto|q\.?b\.?/i.test(combined) ? 0 : 1;
  }
  if (!amount) {
    return { calories: 0, grams: 0 };
  }
  const profile = findCalorieProfile(ingredient.name || '');
  const normalizedUnit = normalizeUnit(ingredient.unit || '');
  const unitInfo = UNIT_FACTORS[normalizedUnit];
  let grams = 0;
  let calories = 0;

  if (normalizedUnit === 'unit' && profile?.caloriesPerUnit) {
    const gramsPerUnit = profile.gramsPerUnit || DEFAULT_UNIT_MASS;
    grams = gramsPerUnit * amount;
    calories = profile.caloriesPerUnit * amount;
  } else if (normalizedUnit === 'can') {
    grams = (profile?.gramsPerUnit || 395) * amount;
    const caloriesPerGram = profile?.caloriesPerGram || DEFAULT_CALORIES_PER_GRAM;
    calories = grams * caloriesPerGram;
  } else if (unitInfo) {
    if (unitInfo.type === 'weight') {
      grams = amount * unitInfo.factor;
      const caloriesPerGram = profile?.caloriesPerGram || DEFAULT_CALORIES_PER_GRAM;
      calories = grams * caloriesPerGram;
    } else if (unitInfo.type === 'volume') {
      const ml = amount * unitInfo.factor;
      const density = profile?.density || profile?.gramsPerMl || 1;
      grams = ml * density;
      if (profile?.caloriesPerMl) {
        calories = ml * profile.caloriesPerMl;
      } else {
        const caloriesPerGram = profile?.caloriesPerGram || DEFAULT_CALORIES_PER_GRAM;
        calories = grams * caloriesPerGram;
      }
    }
  } else if (profile?.caloriesPerUnit) {
    const gramsPerUnit = profile.gramsPerUnit || DEFAULT_UNIT_MASS;
    grams = gramsPerUnit * amount;
    calories = profile.caloriesPerUnit * amount;
  }

  if (!grams) {
    grams = amount * (profile?.gramsPerUnit || DEFAULT_UNIT_MASS);
  }
  if (!calories) {
    const caloriesPerGram = profile?.caloriesPerGram || DEFAULT_CALORIES_PER_GRAM;
    calories = grams * caloriesPerGram;
  }

  return {
    calories,
    grams,
  };
};

const parseServingsCount = (value = '') => {
  if (!value) return null;
  const match = value.toString().replace(/,/g, '.').match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Math.round(parseFloat(match[1]));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const formatServingsLabel = (count, languageCode) => {
  if (languageCode?.startsWith('pt')) return `~${count} porções`;
  if (languageCode?.startsWith('es')) return `~${count} porciones`;
  if (languageCode?.startsWith('fr')) return `~${count} portions`;
  return `~${count} servings`;
};

const formatCaloriesLabel = (perServing, servingsCount, languageCode) => {
  if (languageCode?.startsWith('pt')) return `${perServing} kcal por porção (~${servingsCount} porções)`;
  if (languageCode?.startsWith('es')) return `${perServing} kcal por porción (~${servingsCount} porciones)`;
  if (languageCode?.startsWith('fr')) return `${perServing} kcal par portion (~${servingsCount} portions)`;
  return `${perServing} kcal per serving (~${servingsCount} servings)`;
};

const formatTotalCaloriesLabel = (total, languageCode) => {
  if (languageCode?.startsWith('pt')) return `${total} kcal no total`;
  if (languageCode?.startsWith('es')) return `${total} kcal en total`;
  if (languageCode?.startsWith('fr')) return `${total} kcal au total`;
  return `${total} kcal total`;
};

const detectTreatPortionMass = (recipe) => {
  const haystack = `${recipe.title || ''} ${((recipe.tags || []).join(' '))} ${(recipe.instructions || [])
    .map((step) => step.description || '')
    .join(' ')}`.toLowerCase();
  const match = SMALL_TREAT_PORTIONS.find(({ regex }) => regex.test(haystack));
  return match?.gramsPerUnit || null;
};

const estimateCaloriesAndServings = (recipe) => {
  const contributions = (recipe.ingredients || []).map(estimateIngredientContribution);
  const totals = contributions.reduce((acc, current) => {
    acc.calories += current.calories;
    acc.mass += current.grams;
    return acc;
  }, { calories: 0, mass: 0 });

  const instructionsText = (recipe.instructions || [])
    .map((step) => step.description || '')
    .join(' ') || '';
  const methodBoost = COOKING_METHOD_MULTIPLIERS.reduce((acc, { regex, multiplier }) => (
    regex.test(instructionsText) ? acc * multiplier : acc
  ), 1);
  const totalCalories = totals.calories * methodBoost;
  const massBasedServings = totals.mass > 0 ? Math.max(1, Math.round(totals.mass / 250)) : null;
  const treatPortionMass = detectTreatPortionMass(recipe);
  const treatBasedServings = (treatPortionMass && totals.mass > 0)
    ? Math.max(1, Math.round(totals.mass / treatPortionMass))
    : null;
  return {
    totalCalories,
    totalMass: totals.mass,
    massBasedServings,
    treatBasedServings,
  };
};

const enhanceNutritionAndServings = (recipe, languageCode, aiNutrition) => {
  const heuristicSnapshot = estimateCaloriesAndServings(recipe);

  if (aiNutrition?.portionCount && aiNutrition.portionCount > 0) {
    const servingsCount = Math.max(1, Math.round(aiNutrition.portionCount));
    const perServingFromAi = aiNutrition.caloriesPerPortion && aiNutrition.caloriesPerPortion > 0
      ? Math.round(aiNutrition.caloriesPerPortion)
      : null;
    let totalCalories = aiNutrition.totalCalories && aiNutrition.totalCalories > 0
      ? Math.round(aiNutrition.totalCalories)
      : null;

    if (!perServingFromAi && totalCalories) {
      const fallback = Math.max(1, Math.round(totalCalories / servingsCount));
      totalCalories = Math.max(1, totalCalories);
      return {
        ...recipe,
        servings: aiNutrition.portionDescription?.trim() || formatServingsLabel(servingsCount, languageCode),
        nutrition: {
          ...recipe.nutrition,
          calories: formatCaloriesLabel(fallback, servingsCount, languageCode),
          totalCalories: formatTotalCaloriesLabel(totalCalories, languageCode),
        },
      };
    }

    let caloriesPerServing = perServingFromAi;
    if (!caloriesPerServing && heuristicSnapshot.totalCalories) {
      caloriesPerServing = Math.max(1, Math.round(heuristicSnapshot.totalCalories / servingsCount));
    }
    if (!totalCalories && perServingFromAi) {
      totalCalories = Math.max(1, Math.round(perServingFromAi * servingsCount));
    }
    if (!caloriesPerServing) {
      const fallback = heuristicSnapshot.totalCalories && servingsCount
        ? Math.max(1, Math.round(heuristicSnapshot.totalCalories / servingsCount))
        : 200;
      caloriesPerServing = fallback;
    }
    totalCalories = totalCalories || Math.max(1, caloriesPerServing * servingsCount);

    return {
      ...recipe,
      servings: aiNutrition.portionDescription?.trim() || formatServingsLabel(servingsCount, languageCode),
      nutrition: {
        ...recipe.nutrition,
        calories: formatCaloriesLabel(caloriesPerServing, servingsCount, languageCode),
        totalCalories: formatTotalCaloriesLabel(totalCalories, languageCode),
      },
    };
  }

  const {
    totalCalories: heuristicTotalCalories,
    massBasedServings,
    treatBasedServings
  } = heuristicSnapshot;
  const parsedServings = parseServingsCount(recipe.servings);
  const servingsCount = treatBasedServings || massBasedServings || parsedServings || 4;
  const totalCalories = Math.max(1, Math.round(heuristicTotalCalories || servingsCount * 200));
  const caloriesPerServing = Math.max(1, Math.round(totalCalories / servingsCount));
  return {
    ...recipe,
    servings: formatServingsLabel(servingsCount, languageCode),
    nutrition: {
      ...recipe.nutrition,
      calories: formatCaloriesLabel(caloriesPerServing, servingsCount, languageCode),
      totalCalories: formatTotalCaloriesLabel(totalCalories, languageCode),
    },
  };
};

const validateAndRepairRecipe = (recipe) => {
  if (!recipe) return recipe;
  let repaired = false;

  // Log raw recipe structure for debugging
  console.log('=== RAW RECIPE FROM GEMINI ===');
  console.log('Instructions:', JSON.stringify(recipe.instructions, null, 2));
  console.log('Ingredients:', JSON.stringify(recipe.ingredients?.slice(0, 3), null, 2));

  // Check and repair instructions
  if (recipe.instructions && Array.isArray(recipe.instructions)) {
    recipe.instructions = recipe.instructions.map((step, idx) => {
      const desc = step.description;
      const isEmpty = !desc || (typeof desc === 'string' && desc.trim() === '');
      console.log(`Step ${idx + 1} description: "${desc}" (type: ${typeof desc}, isEmpty: ${isEmpty})`);
      
      if (isEmpty) {
        console.warn(`Recipe instruction step ${idx + 1} has empty description - repairing`);
        repaired = true;
        return {
          ...step,
          stepNumber: step.stepNumber || idx + 1,
          description: `Passo ${idx + 1}: [Detalhes não extraídos - por favor edite este passo]`,
        };
      }
      return step;
    });
  }

  // Check and repair ingredients
  if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    recipe.ingredients = recipe.ingredients.map((item, idx) => {
      const isEmpty = !item.name || (typeof item.name === 'string' && item.name.trim() === '');
      if (isEmpty) {
        console.warn(`Recipe ingredient ${idx + 1} has empty name - repairing`);
        repaired = true;
        return {
          ...item,
          name: `Ingrediente ${idx + 1} [por favor edite]`,
          amount: item.amount || '',
          unit: item.unit || '',
        };
      }
      return item;
    });
  }

  if (repaired) {
    console.warn('Recipe was repaired due to empty fields');
  }
  
  console.log('=== REPAIRED RECIPE ===');
  console.log('Instructions after repair:', JSON.stringify(recipe.instructions, null, 2));

  return recipe;
};

const normalizeRecipe = (recipe) => {
  if (!recipe) return recipe;
  
  // First validate and repair any empty fields
  recipe = validateAndRepairRecipe(recipe);
  
  const instructions = (recipe.instructions || []).map((step, idx) => {
    const cleanedDescription = cleanInstructionDescription(step.description);
    const hasLongRest = mentionsLongRest(cleanedDescription);
    const validTimer = step.timerSeconds && step.timerSeconds > 0 && step.timerSeconds <= MAX_TIMER_SECONDS
      ? Math.round(step.timerSeconds)
      : null;
    return {
      ...step,
      stepNumber: step.stepNumber || idx + 1,
      description: cleanedDescription,
      timerSeconds: hasLongRest ? null : validTimer,
    };
  });

  const ingredients = (recipe.ingredients || []).map((item) => ({
    ...item,
    amount: item.amount || '',
    unit: item.unit || '',
  }));

  return {
    ...recipe,
    ingredients,
    instructions,
    prepTime: recipe.prepTime || '',
    cookTime: recipe.cookTime || '',
    servings: recipe.servings || '',
  };
};

const transcribeMedia = async (file, languagePreference = 'auto') => {
  if (!ai) return '';
  const languageDirective = languagePreference === 'auto'
    ? 'in the detected source language'
    : `in ${languageLabel(languagePreference)} (${languagePreference})`;
  const parts = [
    {
      inlineData: {
        mimeType: file.mimetype,
        data: bufferToBase64(file.buffer)
      }
    },
    {
      text: `Transcribe every spoken or on-screen instruction with full sentences, natural casing, and proper punctuation ${languageDirective}. Preserve the chronological order, include connective words, and mark unclear passages as [inaudible]. Output transcript text only, no lists.`
    }
  ];

  const response = await ai.models.generateContent({
    model: transcriptModel,
    contents: [{ role: 'user', parts }],
    config: {
      temperature: 0.2,
      topK: 32,
      responseMimeType: 'text/plain',
      systemInstruction: 'You are a professional culinary transcriptionist. Produce complete, polished transcripts with clear sentences and punctuation.',
    }
  });

  return extractResponseText(response).trim();
};

const extractOcr = async (file) => {
  if (!ai) return '';
  const parts = [
    {
      inlineData: {
        mimeType: file.mimetype,
        data: bufferToBase64(file.buffer)
      }
    },
    {
      text: 'Read all visible text from this image, keeping order and formatting. Respond with raw text only.'
    }
  ];
  const response = await ai.models.generateContent({
    model: transcriptModel,
    contents: [{ role: 'user', parts }],
    config: { responseMimeType: 'text/plain' }
  });
  return extractResponseText(response).trim();
};

const buildPrompt = ({
  languageCode,
  languageName,
  userInstructions,
  transcriptText,
  ocrText,
  textInput,
  sourceUrl,
}) => {
  const newline = (label, value) => value ? `\n${label}:\n${value}` : '';
  return `You are a world-class culinary R&D chef. Analyze every media sample, combine information from transcript, OCR, and raw text, and craft a structured recipe.

CRITICAL REQUIREMENTS:
- Output must be written entirely in ${languageCode === 'auto' ? 'the detected source language' : languageName}.
- Every instruction step MUST have a non-empty "description" field with the FULL cooking instruction text. Never leave description empty or null.
- Every ingredient MUST have "name", "amount", and "unit" filled in. Use "to taste" or "as needed" if quantity is unclear.
- If inputs mix languages, prefer the one most used in instructions.
- Rewrite any comedic or chaotic narration into clear, professional cookbook instructions.
- CRITICAL for servings: Search the source for EXPLICIT mentions like "serves 4", "makes 12", "rende 6 porções", "faz 24 brigadeiros". Use that exact number.
- Provide realistic durations. Never set timerSeconds longer than 4 hours.
- Include culturally accurate measurements and plated presentation tips.
${newline('Transcript Notes', transcriptText)}${newline('OCR Notes', ocrText)}${newline('Raw Text Notes', textInput)}${newline('User Instructions', userInstructions)}${newline('Source URL', sourceUrl)}
Return valid JSON only.`;
};

const contextBlock = (label, value) => (value ? `\n${label}:\n${value}` : '');

const requestNutritionEstimates = async (recipe, languageCode, context = {}) => {
  if (!ai) return null;
  const prompt = `You are a culinary nutrition analyst with live web search. Given the recipe JSON and source context below:

PORTION DETECTION (PRIORITY):
- Search the Transcript/OCR/Text for EXPLICIT serving mentions: "serves X", "makes X", "yields X", "rende X", "faz X", "for X people", etc.
- If found, use that EXACT number as portion count.
- Only estimate from ingredient quantities if no explicit mention exists.

NUTRITION:
- Estimate total kilocalories by summing ingredient contributions, using web search for accurate values.
- Calculate calories per portion (total ÷ portion count).
- Describe portion in ${languageCode || 'auto'} language (e.g., "~24 brigadeiros", "serves 4").

Return strict JSON matching the schema. Keep reasoning concise.

Recipe JSON:
${JSON.stringify(recipe, null, 2)}
${contextBlock('Transcript Notes', context.transcriptText)}
${contextBlock('OCR Notes', context.ocrText)}
${contextBlock('User Text Input', context.textInput)}
${contextBlock('User Instructions', context.userInstructions)}
${contextBlock('Source URL', context.sourceUrl)}
`;

  const response = await ai.models.generateContent({
    model: multimodalModel,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: nutritionEstimateSchema,
      useSearch: true,
    }
  });

  const text = extractResponseText(response);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('Unable to parse nutrition enrichment response', error.message);
    return null;
  }
};

const generateRecipe = async ({ files, prompt, languageCode }) => {
  if (!ai) throw new Error('Gemini client not configured');
  const parts = [];
  files.forEach((file) => {
    parts.push({
      inlineData: {
        mimeType: file.mimetype,
        data: bufferToBase64(file.buffer)
      }
    });
  });
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: multimodalModel,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: 'Always respond with valid JSON that matches the provided schema. Maintain the requested output language.',
      responseMimeType: 'application/json',
      responseSchema: recipeSchema,
    }
  });

  const text = extractResponseText(response);
  if (!text) {
    const responseKeys = response ? Object.keys(response) : [];
    console.error('Gemini returned empty response payload. Keys:', responseKeys);
    if (response?.candidates) {
      console.error('Gemini candidates snapshot:', JSON.stringify(response.candidates.slice(0, 1), null, 2));
    }
    if (response?.output) {
      console.error('Gemini output snapshot:', JSON.stringify(response.output.slice(0, 1), null, 2));
    }
    throw new Error('Empty response from Gemini');
  }
  try {
    return JSON.parse(text);
  } catch (parseError) {
    console.error('Unable to parse Gemini JSON. Prompt:', prompt.substring(0, 400));
    console.error('Raw response snippet:', text.slice(0, 1000));
    try {
      const repaired = jsonrepair(text);
      const repairedJson = JSON.parse(repaired);
      console.warn('Gemini JSON was repaired after initial parse failure:', parseError.message);
      return repairedJson;
    } catch (repairError) {
      console.error('JSON repair failed', repairError);
      throw new Error(`Gemini returned malformed JSON: ${parseError.message}`);
    }
  }
};

const loadRemoteMediaDirect = async (remoteUrl) => {
  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error(`Remote URL responded with status ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = (response.headers.get('content-type') || 'application/octet-stream').toLowerCase();
  if (!isSupportedMime(contentType)) {
    throw new Error(`Remote URL returned unsupported content-type ${contentType}`);
  }
  const fallbackName = new URL(remoteUrl).pathname.split('/').pop() || 'remote-media';
  return [{
    buffer,
    mimetype: contentType,
    originalname: fallbackName,
  }];
};

const downloadViaYtDlp = async (remoteUrl) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chefai-social-'));
  const outputTemplate = path.join(tempDir, 'capture.%(ext)s');
  const commonHeaders = [
    `referer:${remoteUrl}`,
    'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36',
  ];
  try {
    await ytdlp(remoteUrl, {
      output: outputTemplate,
      format: 'bv+ba/best',
      mergeOutputFormat: 'mp4',
      addHeader: commonHeaders,
      noCheckCertificates: true,
      noWarnings: true,
      geoBypass: true,
      noCallHome: true,
      quiet: true,
      preferFreeFormats: true,
    });

    const files = await fs.readdir(tempDir);
    const mediaFile = files.find((name) => /(mp4|m4v|mov|webm|mp3|m4a|wav)$/i.test(name));
    if (!mediaFile) {
      throw new Error('Downloader finished but no media file was produced');
    }
    const filePath = path.join(tempDir, mediaFile);
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(mediaFile).replace('.', '').toLowerCase();
    const mimetype = MIME_LOOKUP[ext] || 'video/mp4';
    return [{
      buffer,
      mimetype,
      originalname: mediaFile,
    }];
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

const loadRemoteMedia = async (remoteUrl) => {
  if (!remoteUrl) return [];
  const errors = [];
  try {
    return await loadRemoteMediaDirect(remoteUrl);
  } catch (directErr) {
    errors.push(directErr.message);
    console.info('Direct fetch could not stream media, falling back to yt-dlp:', directErr.message);
  }

  try {
    const result = await downloadViaYtDlp(remoteUrl);
    console.info('yt-dlp download succeeded');
    return result;
  } catch (ytErr) {
    errors.push(ytErr.message);
    console.warn('yt-dlp download failed', ytErr.message);
    throw new Error(`Unable to download media from URL. ${errors.join(' | ')}`);
  }
};

const fetchWebpageContent = async (url) => {
  if (!url) return null;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,pt;q=0.8,es;q=0.7',
      },
    });
    if (!response.ok) return null;
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return null;
    }
    const html = await response.text();

    // Extract main image from Open Graph, Twitter, or JSON-LD
    let extractedImage = null;
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogImageMatch) {
      extractedImage = ogImageMatch[1];
    }
    if (!extractedImage) {
      const twitterImageMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
      if (twitterImageMatch) {
        extractedImage = twitterImageMatch[1];
      }
    }
    if (!extractedImage) {
      // Try JSON-LD recipe schema
      const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      if (jsonLdMatch) {
        for (const match of jsonLdMatch) {
          try {
            const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
            const data = JSON.parse(jsonContent);
            const recipeData = Array.isArray(data) ? data.find(d => d['@type'] === 'Recipe') : (data['@type'] === 'Recipe' ? data : null);
            if (recipeData?.image) {
              extractedImage = Array.isArray(recipeData.image) ? recipeData.image[0] : (typeof recipeData.image === 'string' ? recipeData.image : recipeData.image?.url);
              if (extractedImage) break;
            }
          } catch { /* ignore parse errors */ }
        }
      }
    }
    // Resolve relative URLs
    if (extractedImage && !extractedImage.startsWith('http')) {
      try {
        extractedImage = new URL(extractedImage, url).href;
      } catch { extractedImage = null; }
    }

    // Extract text content, removing scripts, styles, and excessive whitespace
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
      .replace(/\s+/g, ' ')
      .trim();
    // Truncate if too long (keep first ~15k chars which is plenty for a recipe)
    if (text.length > 15000) {
      text = text.substring(0, 15000) + '...';
    }
    return { text: text || null, image: extractedImage };
  } catch (err) {
    console.warn('Webpage fetch failed:', err.message);
    return null;
  }
};

app.post('/api/recipes', upload.array('media'), async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: 'Server missing GEMINI_API_KEY' });
    }

    const files = req.files || [];
    const {
      userInstructions = '',
      textInput = '',
      languageHint = 'auto',
      sourceUrl = '',
      remoteUrl = ''
    } = req.body;

    let remoteFiles = [];
    let webpageText = null;
    let webpageImage = null;
    let remoteErrorMessage = null;

    if (remoteUrl) {
      try {
        remoteFiles = await loadRemoteMedia(remoteUrl);
      } catch (remoteErr) {
        console.warn('Remote media fetch failed, trying webpage scrape:', remoteErr.message);
        // If media download fails, try scraping the webpage for recipe text
        const webpageData = await fetchWebpageContent(remoteUrl);
        if (!webpageData?.text) {
          remoteErrorMessage = remoteErr.message;
        } else {
          webpageText = webpageData.text;
          webpageImage = webpageData.image;
          console.info('Webpage content extracted successfully', webpageImage ? '(with image)' : '(no image)');
        }
      }
    }

    const combinedFiles = [...files, ...remoteFiles];
    const effectiveTextInput = [textInput, webpageText].filter(Boolean).join('\n\n');

    if (!combinedFiles.length && !effectiveTextInput) {
      if (remoteErrorMessage) {
        return res.status(400).json({ error: remoteErrorMessage });
      }
      return res.status(400).json({ error: 'No media or text content was provided.' });
    }

    const videoOrAudio = combinedFiles.filter(f => f.mimetype.startsWith('video/') || f.mimetype.startsWith('audio/'));
    const images = combinedFiles.filter(f => f.mimetype.startsWith('image/'));

    const [transcripts, ocrBlocks] = await Promise.all([
      Promise.all(videoOrAudio.map((media) => transcribeMedia(media, languageHint))),
      Promise.all(images.map(extractOcr)),
    ]);

    const transcriptText = transcripts.filter(Boolean).join('\n');
    const ocrText = ocrBlocks.filter(Boolean).join('\n');
    const combinedText = [effectiveTextInput, transcriptText, ocrText].filter(Boolean).join('\n');

    const detectedCode = detectLanguage(combinedText, languageHint);
    const prompt = buildPrompt({
      languageCode: detectedCode,
      languageName: languageLabel(detectedCode),
      userInstructions,
      transcriptText,
      ocrText,
      textInput: effectiveTextInput,
      sourceUrl: sourceUrl || remoteUrl,
    });

    const rawRecipe = await generateRecipe({ files: combinedFiles, prompt, languageCode: detectedCode });
    const normalizedRecipe = normalizeRecipe(rawRecipe);
    let aiNutrition = null;
    try {
      aiNutrition = await requestNutritionEstimates(normalizedRecipe, detectedCode, {
        transcriptText,
        ocrText,
        textInput: effectiveTextInput,
        userInstructions,
        sourceUrl: sourceUrl || remoteUrl,
      });
    } catch (nutritionErr) {
      console.warn('AI nutrition estimate failed', nutritionErr.message);
    }
    const recipe = enhanceNutritionAndServings(normalizedRecipe, detectedCode, aiNutrition);

    let coverImage = null;
    const video = combinedFiles.find(f => f.mimetype.startsWith('video/'));
    if (video) {
      const ext = video.originalname.split('.').pop() || 'mp4';
      try {
        coverImage = await captureVideoFrame(video.buffer, ext);
      } catch (frameError) {
        console.warn('Unable to capture frame', frameError.message);
      }
    }
    // Use webpage image as fallback cover
    if (!coverImage && webpageImage) {
      coverImage = webpageImage;
    }

    res.json({
      recipe,
      metadata: {
        transcript: transcriptText,
        ocrText,
        languageCode: detectedCode,
        coverImage,
      }
    });
  } catch (error) {
    console.error('Recipe generation failed', error);
    res.status(500).json({ error: error.message || 'Failed to generate recipe' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(GEMINI_KEY) });
});

// Handle Share Target POST requests
app.post('/share-target', upload.any(), async (req, res) => {
  try {
    console.log('Received share data:', req.body);
    const shareData = {
      title: req.body.title,
      text: req.body.text,
      url: req.body.url,
    };
    
    if (existsSync(path.join(distPath, 'index.html'))) {
      let html = await fs.readFile(path.join(distPath, 'index.html'), 'utf-8');
      html = html.replace(
        'window.__SHARE_DATA__ = null;',
        `window.__SHARE_DATA__ = ${JSON.stringify(shareData)};`
      );
      res.send(html);
    } else {
      res.redirect('/');
    }
  } catch (error) {
    console.error('Share target error:', error);
    res.redirect('/');
  }
});

// Serve static files from the dist directory if it exists
const distPath = path.join(process.cwd(), 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // Handle SPA routing by serving index.html for unknown routes
  app.get(/.*/, (req, res, next) => {
      if (req.path.startsWith('/api')) {
          return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`ChefAI server running on http://localhost:${port}`);
});
