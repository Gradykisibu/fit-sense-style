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

export async function analyzeOutfitImage(file: File): Promise<OutfitAnalysis> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-outfit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to analyze outfit image');
  }
  
  return res.json();
}

export async function analyzeItems(items: { imageUrl: string; category: string }[]): Promise<OutfitAnalysis> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-outfit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to analyze items');
  }
  
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


export async function testConnection(): Promise<boolean> {
  try {
    await getCloset();
    return true;
  } catch {
    return false;
  }
}
