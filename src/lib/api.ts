import { AppSettings, ClothingCategory, ClothingItem, OutfitAnalysis, OutfitSuggestion, TryOnJob, getSettings } from "./settings";
import { supabase } from "@/integrations/supabase/client";

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function headers(settings: AppSettings) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': settings.apiKey || '',
  };
}

export async function analyzeOutfitImage(_file: File): Promise<OutfitAnalysis> {
  const s = getSettings();
  if (s.mockMode) {
    await sleep(900);
    return {
      overallScore: 78,
      verdict: 'okay',
      comments: ['Hat and shoes align in style; pants are slightly off‑palette.'],
      detectedItems: [
        { id: 'top1', category: 't-shirt', colorHex: '#F4D03F', colorName: 'Mustard', imageUrl: 'https://example.com/tshirt.jpg' },
        { id: 'pants1', category: 'pants', colorHex: '#1C2833', colorName: 'Charcoal', imageUrl: 'https://example.com/pants.jpg' },
        { id: 'shoes1', category: 'shoes', colorHex: '#FDFEFE', colorName: 'White', imageUrl: 'https://example.com/shoes.jpg' },
        { id: 'hat1', category: 'hat', colorHex: '#1B4F72', colorName: 'Navy', imageUrl: 'https://example.com/hat.jpg' },
      ],
      perItem: [
        { itemId: 'hat1', score: 85, issues: [], suggestions: [] },
        { itemId: 'pants1', score: 60, issues: ['too dark vs pastel top'], suggestions: ['try beige chinos'] },
      ],
      colorHarmony: {
        score: 74,
        palette: ['#F4D03F','#1C2833','#FDFEFE','#1B4F72'],
        rulesMatched: ['accent‑neutral'],
        clashes: ['charcoal pants heavy against mustard top'],
      },
      suggestedSwaps: [
        { replaceItemId: 'pants1', suggestion: 'Swap to beige chinos or light wash jeans.', exampleItem: { id: 'eg-pants', category: 'pants', colorHex: '#D6C9A3', colorName: 'Beige' } },
      ],
    };
  }

  const form = new FormData();
  form.append('image', _file);
  const res = await fetch(`${s.apiBaseUrl}/v1/analyze/outfit-image`, {
    method: 'POST',
    headers: { 'x-api-key': s.apiKey || '' },
    body: form,
  });
  if (!res.ok) throw new Error('Failed to analyze outfit image');
  return res.json();
}

export async function analyzeItems(items: { imageUrl: string; category: string }[]): Promise<OutfitAnalysis> {
  const s = getSettings();
  if (s.mockMode) {
    await sleep(900);
    return {
      overallScore: 82,
      verdict: 'great',
      comments: ['Sporty casual combo with good contrast.'],
      detectedItems: [],
      perItem: [
        { itemId: 'top', score: 84, issues: [], suggestions: [] },
        { itemId: 'pants', score: 79, issues: [], suggestions: [] },
        { itemId: 'shoes', score: 88, issues: [], suggestions: [] },
      ],
      colorHarmony: { score: 80, palette: ['#2E86AB','#EAF2F8','#2ECC71'], rulesMatched: ['complementary'], clashes: [] },
      suggestedSwaps: [],
    };
  }
  const res = await fetch(`${s.apiBaseUrl}/v1/analyze/items`, { method: 'POST', headers: headers(s), body: JSON.stringify({ items }) });
  if (!res.ok) throw new Error('Failed to analyze items');
  return res.json();
}

export async function getCloset(): Promise<ClothingItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('closet_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data.map(item => ({
    id: item.id,
    imageUrl: item.image_url,
    category: item.category as ClothingCategory,
    colorHex: item.color || undefined,
    colorName: item.color || undefined,
    brand: item.brand || undefined,
  }));
}

export async function addClosetItem(item: ClothingItem): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('closet_items')
    .insert({
      user_id: user.id,
      image_url: item.imageUrl || '',
      category: item.category,
      color: item.colorName || item.colorHex || null,
      brand: item.brand || null,
    });

  if (error) throw error;
}

export async function deleteClosetItem(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('closet_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function getSuggestions(occasion: string, palette?: string, limit: number = 5): Promise<OutfitSuggestion[]> {
  const s = getSettings();
  if (s.mockMode) {
    await sleep(600);
    return [
      {
        id: 'sug1',
        title: 'Smart Casual – Navy + Beige',
        rationale: 'Balanced contrast; versatile for daytime meetings.',
        items: [
          { id: 'top-navy', category: 'jacket', colorHex: '#1B4F72', colorName: 'Navy' },
          { id: 'shirt-white', category: 'shirt', colorHex: '#FDFEFE', colorName: 'White' },
          { id: 'pants-beige', category: 'pants', colorHex: '#D6C9A3', colorName: 'Beige' },
          { id: 'shoes-brown', category: 'shoes', colorHex: '#6E2C00', colorName: 'Brown' },
        ],
      },
    ];
  }
  const url = new URL(`${s.apiBaseUrl}/v1/suggestions/outfits`);
  url.searchParams.set('occasion', occasion);
  if (palette) url.searchParams.set('palette', palette);
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url.toString(), { headers: headers(s) });
  if (!res.ok) throw new Error('Failed to get suggestions');
  return res.json();
}

export async function createTryOnJob(items: ClothingItem[]): Promise<TryOnJob> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('try_on_jobs')
    .insert({
      user_id: user.id,
      status: 'queued',
      items: items as any,
    })
    .select()
    .single();

  if (error) throw error;

  const status = data.status as 'queued' | 'processing' | 'done' | 'failed';
  return {
    id: data.id,
    status,
    resultImageUrl: data.result_image_url,
  };
}

export async function getTryOnJob(id: string): Promise<TryOnJob> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('try_on_jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) throw error;

  const status = data.status as 'queued' | 'processing' | 'done' | 'failed';
  return {
    id: data.id,
    status,
    resultImageUrl: data.result_image_url,
  };
}

export async function testConnection(): Promise<boolean> {
  try {
    await getCloset();
    return true;
  } catch {
    return false;
  }
}
