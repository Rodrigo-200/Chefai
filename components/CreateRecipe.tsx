import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Link as LinkIcon,
  AlertCircle,
  X,
  Languages,
  ChevronDown,
  FileText,
  Sparkles,
} from 'lucide-react';
import { generateRecipe } from '../services/geminiService';
import { Recipe } from '../types';

const ROTATING_WORDS = [
  { text: 'TikTok videos', color: 'text-pink-500' },
  { text: 'Instagram reels', color: 'text-purple-500' },
  { text: 'YouTube tutorials', color: 'text-red-500' },
  { text: 'recipe blogs', color: 'text-blue-500' },
  { text: 'food photos', color: 'text-amber-500' },
  { text: 'handwritten notes', color: 'text-emerald-500' },
  { text: 'voice memos', color: 'text-cyan-500' },
];

interface CreateRecipeProps {
  onRecipeCreated: (recipe: Recipe) => void;
}

type LanguageOption = {
  label: string;
  value: string;
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { label: 'Auto detect', value: 'auto' },
  { label: 'Português (pt-PT)', value: 'pt-PT' },
  { label: 'Español (es-ES)', value: 'es-ES' },
  { label: 'English (en-US)', value: 'en-US' },
  { label: 'Français (fr-FR)', value: 'fr-FR' },
  { label: 'Deutsch (de-DE)', value: 'de-DE' },
  { label: 'Italiano (it-IT)', value: 'it-IT' },
  { label: '日本語 (ja-JP)', value: 'ja-JP' },
  { label: '中文 (zh-CN)', value: 'zh-CN' },
  { label: '한국어 (ko-KR)', value: 'ko-KR' },
];

const isLikelyUrl = (value: string) => {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) || /^(www\.)?[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed);
};

export const CreateRecipe: React.FC<CreateRecipeProps> = ({ onRecipeCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);

  const [mainInput, setMainInput] = useState('');
  const [userInstructions, setUserInstructions] = useState('');
  const [languageHint, setLanguageHint] = useState('auto');
  const [showOptions, setShowOptions] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  // Rotate placeholder text
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
        setIsAnimating(false);
      }, 200);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const resetMediaState = useCallback(() => {
    setSelectedFiles([]);
    setPreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setCapturedFrame(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const captureFrameFromVideo = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const videoEl = document.createElement('video');
      videoEl.src = URL.createObjectURL(file);
      videoEl.preload = 'metadata';
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
        URL.revokeObjectURL(videoEl.src);
      };
      videoEl.onerror = (err) => reject(err);
    });
  };

  const processFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const maxSize = 80 * 1024 * 1024;
    const validFiles = files.filter((file) => file.size <= maxSize);
    if (!validFiles.length) {
      setError('All selected files exceed the maximum size (80 MB).');
      return;
    }
    setSelectedFiles(validFiles);
    const previews = validFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return previews;
    });
    const firstVideo = validFiles.find((f) => f.type.startsWith('video/'));
    if (firstVideo) {
      try {
        const frame = await captureFrameFromVideo(firstVideo);
        setCapturedFrame(frame);
      } catch {
        // ignore
      }
    } else {
      setCapturedFrame(null);
    }
    setError(null);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        processFiles(Array.from(e.target.files));
      }
    },
    [processFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.dataTransfer.files?.length) {
        processFiles(Array.from(e.dataTransfer.files));
      }
    },
    [processFiles]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClear = useCallback(() => {
    resetMediaState();
    setMainInput('');
    setUserInstructions('');
    setError(null);
  }, [resetMediaState]);

  const hasContent = selectedFiles.length > 0 || mainInput.trim().length > 0;
  const submitDisabled = isLoading || !hasContent;

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setLoadingStep('Processing your input...');

      const inputIsUrl = isLikelyUrl(mainInput);
      const response = await generateRecipe({
        mediaFiles: selectedFiles.length ? selectedFiles : undefined,
        textInput: inputIsUrl ? undefined : mainInput.trim() || undefined,
        userInstructions: userInstructions.trim() || undefined,
        languageHint,
        sourceUrl: inputIsUrl ? mainInput.trim() : undefined,
        remoteUrl: inputIsUrl ? mainInput.trim() : undefined,
      });

      setLoadingStep('Building your recipe card...');

      const now = Date.now();
      const recipe: Recipe = {
        id: now.toString(),
        createdAt: now,
        title: response.recipe.title || 'Untitled Recipe',
        description: response.recipe.description || '',
        cuisine: response.recipe.cuisine || 'International',
        prepTime: response.recipe.prepTime || 'N/A',
        cookTime: response.recipe.cookTime || 'N/A',
        servings: response.recipe.servings || 'N/A',
        ingredients: response.recipe.ingredients || [],
        instructions: response.recipe.instructions || [],
        nutrition: response.recipe.nutrition || {},
        tags: response.recipe.tags || [],
        sourceUrl: inputIsUrl ? mainInput.trim() : response.recipe.sourceUrl,
        imageUrl:
          response.metadata.coverImage ||
          capturedFrame ||
          previewUrls[0] ||
          response.recipe.imageUrl ||
          undefined,
        languageCode: response.metadata.languageCode || languageHint,
        transcript: response.metadata.transcript,
        ocrText: response.metadata.ocrText,
      };

      onRecipeCreated(recipe);
      handleClear();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to generate recipe.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const renderPreview = () => {
    if (!selectedFiles.length) return null;
    const file = selectedFiles[0];
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isImage = file.type.startsWith('image/');

    return (
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={handleClear}
          className="absolute top-3 right-3 z-10 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white p-2 rounded-full transition-colors"
        >
          <X size={18} />
        </button>
        {isVideo && previewUrls[0] && (
          <video src={previewUrls[0]} controls className="w-full h-64 object-contain bg-black" />
        )}
        {isAudio && previewUrls[0] && (
          <div className="p-8 text-center text-white space-y-4 bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="w-16 h-16 mx-auto bg-white/10 rounded-2xl flex items-center justify-center">
              <FileText size={32} />
            </div>
            <p className="font-medium truncate">{file.name}</p>
            <audio controls src={previewUrls[0]} className="w-full" />
          </div>
        )}
        {isImage && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 bg-gray-50 dark:bg-gray-800">
            {previewUrls.map((src, idx) => (
              <img key={idx} src={src} className="w-full h-32 object-cover rounded-xl shadow-sm" alt={`Preview ${idx + 1}`} />
            ))}
          </div>
        )}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} ready to process</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-xl mx-auto px-4">
      {/* Hero Section */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-chef-100 dark:bg-chef-900/50 text-chef-700 dark:text-chef-300 rounded-full text-xs font-medium mb-4">
          <Sparkles size={14} />
          <span>Smart Recipe Extraction</span>
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
          Turn your{' '}
          <span className="relative inline-block">
            <span
              className={`inline-block transition-all duration-200 ${ROTATING_WORDS[currentWordIndex].color} ${
                isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
              }`}
            >
              {ROTATING_WORDS[currentWordIndex].text}
            </span>
            <span className="absolute bottom-0 left-0 w-full h-1 bg-current opacity-30 rounded-full" />
          </span>
          <br />
          into perfect recipes
        </h1>
        
        <p className="text-base text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
          Drop any cooking content and get a beautiful, structured recipe card in seconds.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-5 sm:p-6">
          {/* Unified Drop Zone / Upload */}
          {!selectedFiles.length ? (
            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-chef-400 hover:bg-chef-50/50 dark:hover:bg-chef-900/30 transition-all group mb-5"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-chef-100 to-chef-200 dark:from-chef-800 dark:to-chef-700 rounded-xl flex items-center justify-center mb-3 text-chef-600 dark:text-chef-300 group-hover:scale-110 transition-transform shadow-lg shadow-chef-200/50 dark:shadow-chef-900/50">
                <Upload size={22} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Drop your files here</h3>
              <p className="text-gray-400 dark:text-gray-500 text-xs">
                Video, images, or audio · Max 80MB
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="video/*,image/*,audio/*"
                multiple
                onChange={handleFileChange}
              />
            </div>
          ) : (
            renderPreview()
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">or paste a link</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
          </div>

          {/* Main Input (URL or Text) */}
          <div className="mb-4">
            <div className="relative">
              <LinkIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={mainInput}
                onChange={(e) => setMainInput(e.target.value)}
                placeholder="Paste URL or recipe text..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-chef-500 focus:border-chef-500 outline-none text-sm bg-gray-50 dark:bg-gray-700 dark:text-white hover:bg-white dark:hover:bg-gray-600 transition-colors"
              />
            </div>
          </div>

          {/* Toggle for extra options */}
          <button
            type="button"
            onClick={() => setShowOptions((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-chef-600 dark:hover:text-chef-400 mb-4 transition-colors"
          >
            <ChevronDown size={16} className={`transition-transform ${showOptions ? 'rotate-180' : ''}`} />
            {showOptions ? 'Hide options' : 'Advanced options'}
          </button>

          {showOptions && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Extra instructions</label>
                <input
                  type="text"
                  value={userInstructions}
                  onChange={(e) => setUserInstructions(e.target.value)}
                  placeholder="e.g., vegan swaps, metric units…"
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-chef-500 outline-none text-sm bg-white dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5 flex items-center gap-1">
                  <Languages size={14} /> Output language
                </label>
                <select
                  value={languageHint}
                  onChange={(e) => setLanguageHint(e.target.value)}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-chef-500 outline-none text-sm bg-white dark:bg-gray-800 dark:text-white"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl flex items-start gap-2 text-sm border border-red-100 dark:border-red-800">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={submitDisabled}
            className={`w-full py-3 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all
              ${submitDisabled
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-chef-600 to-chef-500 text-white hover:from-chef-700 hover:to-chef-600 shadow-xl shadow-chef-500/25 hover:shadow-chef-500/40 hover:-translate-y-0.5'
              }`}
          >
            {isLoading ? (
              <>
                <CookingAnimation />
                <span>{loadingStep}</span>
              </>
            ) : (
              <>
                <ChefHatIcon />
                <span>Generate Recipe</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Supports TikTok, Instagram, YouTube, blogs & more
          </p>
        </div>
      </div>
    </div>
  );
};

const ChefHatIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
    <line x1="6" y1="17" x2="18" y2="17" />
  </svg>
);

const CookingAnimation = () => (
  <div className="relative w-8 h-8 flex items-center justify-center">
    {/* Pot */}
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12h16v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M2 12h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 12V9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M18 12V9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
    {/* Steam bubbles */}
    <span className="absolute -top-1 left-2 w-1.5 h-1.5 bg-white/80 rounded-full animate-steam1" />
    <span className="absolute -top-0.5 left-4 w-1 h-1 bg-white/60 rounded-full animate-steam2" />
    <span className="absolute -top-1.5 right-3 w-1.5 h-1.5 bg-white/70 rounded-full animate-steam3" />
    <style>{`
      @keyframes steam1 {
        0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; }
        50% { transform: translateY(-6px) scale(1.2); opacity: 0; }
      }
      @keyframes steam2 {
        0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
        50% { transform: translateY(-8px) scale(1.3); opacity: 0; }
      }
      @keyframes steam3 {
        0%, 100% { transform: translateY(0) scale(1); opacity: 0.7; }
        50% { transform: translateY(-5px) scale(1.1); opacity: 0; }
      }
      .animate-steam1 { animation: steam1 1.2s ease-in-out infinite; }
      .animate-steam2 { animation: steam2 1.5s ease-in-out infinite 0.3s; }
      .animate-steam3 { animation: steam3 1.3s ease-in-out infinite 0.6s; }
    `}</style>
  </div>
);