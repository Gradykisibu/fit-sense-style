export type ClothingCategory = 'hat' | 'top' | 'shirt' | 't-shirt' | 'blouse' | 'hoodie' | 'jacket' | 'dress' | 'skirt' | 'pants' | 'shorts' | 'socks' | 'shoes' | 'belt' | 'bag' | 'accessory';

export interface ClothingItem {
  id: string;
  category: ClothingCategory;
  colorHex?: string;
  colorName?: string;
  pattern?: string;
  brand?: string;
  fit?: string;
  imageUrl?: string;
  meta?: Record<string, any>;
}

export interface ItemNote {
  itemId: string;
  score?: number;
  issues?: string[];
  suggestions?: string[];
}

export interface ColorHarmony {
  score: number;
  palette: string[];
  rulesMatched: string[];
  clashes: string[];
}

export interface OutfitAnalysis {
  overallScore: number;
  verdict: 'great' | 'okay' | 'revise';
  comments: string[];
  detectedItems: ClothingItem[];
  perItem: ItemNote[];
  colorHarmony: ColorHarmony;
  suggestedSwaps: { replaceItemId: string; suggestion: string; exampleItem?: ClothingItem }[];
}

export interface OutfitSuggestion {
  id: string;
  title: string;
  rationale: string;
  items: ClothingItem[];
}

export interface TryOnJob {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  resultImageUrl?: string | null;
  message?: string | null;
}

export interface AppSettings {
  apiBaseUrl: string;
  apiKey: string;
  mockMode: boolean;
}

const SETTINGS_KEY = 'fitsense_settings_v1';
const CLOSET_KEY = 'fitsense_mock_closet_v1';
const TRYON_KEY = 'fitsense_mock_tryon_v1';
const SNAPSHOTS_KEY = 'fitsense_snapshots_v1';

export function getDefaultSettings(): AppSettings {
  return { apiBaseUrl: 'https://api.example.com', apiKey: '', mockMode: true };
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return getDefaultSettings();
    return { ...getDefaultSettings(), ...JSON.parse(raw) } as AppSettings;
  } catch {
    return getDefaultSettings();
  }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function getMockCloset(): ClothingItem[] {
  try {
    const raw = localStorage.getItem(CLOSET_KEY);
    if (raw) return JSON.parse(raw);
    const seed: ClothingItem[] = [
      { id: 'closet1', category: 't-shirt', colorHex: '#1ABC9C', colorName: 'Teal', brand: 'Uniqlo', imageUrl: 'https://example.com/teal.jpg' },
      { id: 'closet2', category: 'pants', colorHex: '#2C3E50', colorName: 'Midnight Blue', brand: 'Zara', imageUrl: 'https://example.com/pants.jpg' },
    ];
    localStorage.setItem(CLOSET_KEY, JSON.stringify(seed));
    return seed;
  } catch {
    return [];
  }
}

export function setMockCloset(items: ClothingItem[]) {
  localStorage.setItem(CLOSET_KEY, JSON.stringify(items));
}

export function getMockTryonJobs(): TryOnJob[] {
  try {
    const raw = localStorage.getItem(TRYON_KEY);
    if (raw) return JSON.parse(raw);
    return [];
  } catch {
    return [];
  }
}

export function setMockTryonJobs(items: TryOnJob[]) {
  localStorage.setItem(TRYON_KEY, JSON.stringify(items));
}

export function saveSnapshot(data: any) {
  const arr = getSnapshots();
  arr.unshift({ id: Date.now().toString(), createdAt: new Date().toISOString(), ...data });
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(arr.slice(0, 50)));
}

export function getSnapshots() {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (raw) return JSON.parse(raw);
    return [];
  } catch {
    return [];
  }
}
