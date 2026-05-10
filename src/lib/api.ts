import { ClothingCategory, ClothingItem, OutfitAnalysis } from "./settings";
import { supabase } from "@/integrations/supabase/client";
import { describeApiError } from "./subscription";

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
    const error = await res.json().catch(() => ({}));
    throw new Error(describeApiError(error));
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
    const error = await res.json().catch(() => ({}));
    throw new Error(describeApiError(error));
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

export async function clearCloset(): Promise<{ deletedCount: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: rows, error: loadError } = await supabase
    .from('closet_items')
    .select('id, image_url')
    .eq('user_id', user.id);

  if (loadError) throw loadError;

  const storagePaths = (rows || [])
    .map((row) => row.image_url)
    .filter((path): path is string => typeof path === 'string' && path.startsWith(`${user.id}/`));

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('closet-items')
      .remove(storagePaths);
    if (storageError) throw storageError;
  }

  const { error: deleteError } = await supabase
    .from('closet_items')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) throw deleteError;

  return { deletedCount: rows?.length || 0 };
}


export async function editOutfitImage(params: {
  imageUrl: string;
  currentOutfit?: any;
  suggestions: any[];
}): Promise<{ imageUrl: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-outfit-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(describeApiError(error));
  }
  return res.json();
}

export async function getFunctionErrorMessage(error: any): Promise<string> {
  const response = error?.context;
  if (response && typeof response.json === 'function') {
    try {
      return describeApiError(await response.json());
    } catch {
      // fall through
    }
  }
  return describeApiError(error);
}

export async function sendSupportMessage(params: {
  category: string;
  subject: string;
  message: string;
  replyEmail?: string;
}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-support`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    const message =
      error?.error?.message ||
      error?.message ||
      (res.status === 404
        ? 'Support function is not deployed yet.'
        : 'Failed to send support message');
    throw new Error(message);
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    await getCloset();
    return true;
  } catch {
    return false;
  }
}
