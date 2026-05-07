import { supabase } from '@/integrations/supabase/client';

export type PreferenceType = 'style' | 'color' | 'occasion' | 'fit' | 'brand';

/**
 * Learn and update user preferences based on interactions
 */
export async function updatePreference(
  preferenceType: PreferenceType,
  preferenceKey: string,
  preferenceValue: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Check if preference exists
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .eq('preference_type', preferenceType)
    .eq('preference_key', preferenceKey)
    .single();

  if (existing) {
    // Update existing preference - increase confidence and times observed
    const newTimesObserved = existing.times_observed + 1;
    const newConfidence = Math.min(0.95, existing.confidence_score + 0.05);

    await supabase
      .from('user_preferences')
      .update({
        preference_value: preferenceValue,
        confidence_score: newConfidence,
        times_observed: newTimesObserved,
        last_observed_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Create new preference
    await supabase.from('user_preferences').insert({
      user_id: user.id,
      preference_type: preferenceType,
      preference_key: preferenceKey,
      preference_value: preferenceValue,
      confidence_score: 0.5,
      times_observed: 1,
    });
  }
}

/**
 * Get user preferences by type
 */
export async function getPreferences(preferenceType?: PreferenceType) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id);

  if (preferenceType) {
    query = query.eq('preference_type', preferenceType);
  }

  const { data } = await query.order('confidence_score', { ascending: false });
  return data || [];
}

/**
 * Extract and learn preferences from user feedback
 */
export async function learnFromFeedback(message: string, isPositive: boolean) {
  const lowerMessage = message.toLowerCase();

  // Learn color preferences
  const colors = [
    'black', 'white', 'navy', 'blue', 'red', 'green', 'yellow',
    'purple', 'pink', 'brown', 'gray', 'beige', 'tan', 'olive'
  ];
  for (const color of colors) {
    if (lowerMessage.includes(color)) {
      await updatePreference('color', color, isPositive ? 'like' : 'dislike');
    }
  }

  // Learn style preferences
  const styles = [
    'casual', 'formal', 'business', 'smart casual', 'street',
    'minimalist', 'classic', 'modern', 'vintage', 'bohemian'
  ];
  for (const style of styles) {
    if (lowerMessage.includes(style)) {
      await updatePreference('style', style, isPositive ? 'prefer' : 'avoid');
    }
  }

  // Learn fit preferences
  if (lowerMessage.includes('tight') || lowerMessage.includes('fitted')) {
    await updatePreference('fit', 'tightness', isPositive ? 'fitted' : 'loose');
  }
  if (lowerMessage.includes('loose') || lowerMessage.includes('oversized')) {
    await updatePreference('fit', 'tightness', isPositive ? 'loose' : 'fitted');
  }

  // Learn occasion preferences
  const occasions = [
    'wedding', 'interview', 'date', 'party', 'work', 'casual',
    'formal', 'business', 'vacation', 'gym', 'outdoor'
  ];
  for (const occasion of occasions) {
    if (lowerMessage.includes(occasion)) {
      await updatePreference('occasion', occasion, 'interested');
    }
  }
}

/**
 * Auto-learn from outfit selections in closet
 */
export async function learnFromOutfitSelection(items: any[]) {
  for (const item of items) {
    if (item.category) {
      await updatePreference('style', item.category, 'selected');
    }
    if (item.color) {
      await updatePreference('color', item.color.toLowerCase(), 'selected');
    }
    if (item.brand) {
      await updatePreference('brand', item.brand.toLowerCase(), 'like');
    }
  }
}