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

// Generate sample closet items
export function generateSampleClosetData(): ClothingItem[] {
  // Generate UUIDs for compatibility with database
  const generateUUID = () => crypto.randomUUID();
  
  return [
    // Blazers (multiple options for testing)
    { id: generateUUID(), category: 'jacket', colorHex: '#1a1a2e', colorName: 'Navy', brand: 'Hugo Boss', imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400' },
    { id: generateUUID(), category: 'jacket', colorHex: '#2c2c2c', colorName: 'Charcoal', brand: 'Zara', imageUrl: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400' },
    { id: generateUUID(), category: 'jacket', colorHex: '#4a4a4a', colorName: 'Gray', brand: 'The North Face', imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400' },
    { id: generateUUID(), category: 'jacket', colorHex: '#1a1a2e', colorName: 'Navy', brand: 'Patagonia', imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400' },
    { id: generateUUID(), category: 'jacket', colorHex: '#654321', colorName: 'Brown', brand: 'Massimo Dutti', imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400' },
    
    // Shirts & Tops
    { id: generateUUID(), category: 'shirt', colorHex: '#ffffff', colorName: 'White', brand: 'Brooks Brothers', imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400' },
    { id: generateUUID(), category: 'shirt', colorHex: '#4169e1', colorName: 'Blue', brand: 'Ralph Lauren', imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400' },
    { id: generateUUID(), category: 't-shirt', colorHex: '#ffffff', colorName: 'White', brand: 'Uniqlo', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
    { id: generateUUID(), category: 't-shirt', colorHex: '#000000', colorName: 'Black', brand: 'H&M', imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400' },
    { id: generateUUID(), category: 't-shirt', colorHex: '#e8e8e8', colorName: 'Light Gray', brand: 'Gap', imageUrl: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400' },
    
    // Pants & Bottoms
    { id: generateUUID(), category: 'pants', colorHex: '#1c3a52', colorName: 'Navy Blue', brand: 'Dockers', imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400' },
    { id: generateUUID(), category: 'pants', colorHex: '#4a4a4a', colorName: 'Dark Gray', brand: 'Levi\'s', imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400' },
    { id: generateUUID(), category: 'pants', colorHex: '#2b4c3f', colorName: 'Forest Green', brand: 'Banana Republic', imageUrl: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400' },
    { id: generateUUID(), category: 'pants', colorHex: '#1c3a52', colorName: 'Dark Denim', brand: 'Levi\'s 501', imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400' },
    
    // Shoes
    { id: generateUUID(), category: 'shoes', colorHex: '#3b2621', colorName: 'Brown Leather', brand: 'Clarks', imageUrl: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=400' },
    { id: generateUUID(), category: 'shoes', colorHex: '#000000', colorName: 'Black', brand: 'Nike', imageUrl: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400' },
    { id: generateUUID(), category: 'shoes', colorHex: '#ffffff', colorName: 'White Sneakers', brand: 'Adidas', imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400' },
    
    // Hoodies
    { id: generateUUID(), category: 'hoodie', colorHex: '#8b4513', colorName: 'Camel', brand: 'J.Crew', imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400' },
    { id: generateUUID(), category: 'hoodie', colorHex: '#2c5f7c', colorName: 'Teal', brand: 'COS', imageUrl: 'https://images.unsplash.com/photo-1583743089695-4b816a340f82?w=400' },
    
    // Accessories
    { id: generateUUID(), category: 'belt', colorHex: '#654321', colorName: 'Brown Leather', brand: 'Timberland', imageUrl: 'https://images.unsplash.com/photo-1624222247344-70e7e4c6c987?w=400' },
  ];
}

// Generate sample try-on jobs
export function generateSampleTryOnJobs(): TryOnJob[] {
  const generateUUID = () => crypto.randomUUID();
  
  return [
    { id: generateUUID(), status: 'done', resultImageUrl: 'https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=600' },
    { id: generateUUID(), status: 'done', resultImageUrl: 'https://images.unsplash.com/photo-1581791538302-03537b9e1235?w=600' },
    { id: generateUUID(), status: 'done', resultImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600' },
    { id: generateUUID(), status: 'done', resultImageUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600' },
    { id: generateUUID(), status: 'processing', resultImageUrl: undefined },
    { id: generateUUID(), status: 'done', resultImageUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600' },
    { id: generateUUID(), status: 'done', resultImageUrl: 'https://images.unsplash.com/photo-1492447166138-50c3889fccb1?w=600' },
    { id: generateUUID(), status: 'done', resultImageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600' },
    { id: generateUUID(), status: 'done', resultImageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600' },
    { id: generateUUID(), status: 'done', resultImageUrl: 'https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?w=600' },
  ];
}

// Generate sample outfit suggestions
export function generateSampleSuggestions(): OutfitSuggestion[] {
  const generateUUID = () => crypto.randomUUID();
  const items = generateSampleClosetData();
  
  return [
    { id: generateUUID(), title: 'Professional Business Look', rationale: 'Perfect for important meetings and presentations', items: [items[0], items[18], items[6], items[9]] },
    { id: generateUUID(), title: 'Casual Weekend Outfit', rationale: 'Comfortable and stylish for everyday wear', items: [items[3], items[19], items[10]] },
    { id: generateUUID(), title: 'Date Night Ensemble', rationale: 'Sophisticated yet approachable for a romantic evening', items: [items[1], items[2], items[7], items[9]] },
    { id: generateUUID(), title: 'Party Ready', rationale: 'Stand out at any social gathering', items: [items[12], items[10]] },
    { id: generateUUID(), title: 'Formal Event Attire', rationale: 'Elegant and timeless for special occasions', items: [items[0], items[18], items[6], items[9]] },
    { id: generateUUID(), title: 'Smart Casual Style', rationale: 'Balance between professional and relaxed', items: [items[14], items[3], items[19], items[10]] },
    { id: generateUUID(), title: 'Relaxed Comfort', rationale: 'Easy-going look for laid-back days', items: [items[16], items[19], items[10]] },
    { id: generateUUID(), title: 'Office Appropriate', rationale: 'Professional yet comfortable for workdays', items: [items[1], items[18], items[7], items[9]] },
    { id: generateUUID(), title: 'Evening Elegance', rationale: 'Refined and polished for dinner dates', items: [items[13], items[11]] },
    { id: generateUUID(), title: 'Social Butterfly', rationale: 'Versatile outfit for multiple occasions', items: [items[1], items[2], items[6], items[11]] },
  ];
}
