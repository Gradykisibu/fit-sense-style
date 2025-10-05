import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getCloset } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { saveSnapshot } from '@/lib/settings';

interface SuggestionListProps {
  items: { replaceItemId: string; suggestion: string }[];
  imageType?: 'swap' | 'full'; // swap = show only items to swap, full = show complete outfit
}

export function SuggestionList({ items, imageType = 'swap' }: SuggestionListProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoadingCloset, setIsLoadingCloset] = useState(false);
  const [closetMatches, setClosetMatches] = useState<any[]>([]);
  const { toast } = useToast();

  if (!items?.length) return <div className="text-sm text-muted-foreground">No swaps suggested. Looking good!</div>;

  const handleGenerateExample = async () => {
    setIsGenerating(true);
    try {
      const suggestions = items.map((s) => s.suggestion);
      
      const { data, error } = await supabase.functions.invoke('generate-outfit-image', {
        body: { suggestions, type: imageType },
      });

      if (error) throw error;
      
      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast({
          title: 'Example generated!',
          description: "Here's what the suggested items look like.",
        });
      } else {
        throw new Error('No image in response');
      }
    } catch (error: any) {
      console.error('Error generating example:', error);
      toast({
        title: 'Failed to generate example',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePickFromCloset = async () => {
    setIsLoadingCloset(true);
    try {
      const closetItems = await getCloset();
      
      if (closetItems.length === 0) {
        toast({
          title: 'Closet is empty',
          description: 'Add items to your closet first to get recommendations.',
          variant: 'destructive',
        });
        return;
      }

      // Extract categories and color preferences from suggestions
      const clothingKeywords = ['blazer', 'jacket', 'coat', 'shirt', 'blouse', 't-shirt', 'top', 
        'pants', 'trousers', 'jeans', 'chinos', 'shorts', 'skirt', 'dress',
        'shoes', 'sneakers', 'boots', 'loafers', 'heels',
        'belt', 'tie', 'scarf', 'hat', 'cap', 'socks',
        'pocket square', 'accessory', 'bag', 'hoodie'];
      
      const colorKeywords = ['dark', 'light', 'navy', 'black', 'white', 'gray', 'grey', 
        'brown', 'blue', 'green', 'red', 'clean', 'polished'];
      
      // Extract categories and colors from suggestions
      const suggestionData = items.map((s) => {
        const text = s.suggestion.toLowerCase();
        const categories = clothingKeywords.filter(keyword => text.includes(keyword));
        const colors = colorKeywords.filter(keyword => text.includes(keyword));
        return { text, categories, colors };
      });

      // Score and rank matching items
      const scoredItems = closetItems.map((item) => {
        const itemCategory = item.category.toLowerCase();
        const itemColor = (item.colorName || item.colorHex || '').toLowerCase();
        let score = 0;

        // Check category match
        suggestionData.forEach(({ categories, colors }) => {
          const categoryMatch = categories.some((cat) => 
            itemCategory.includes(cat) || cat.includes(itemCategory)
          );
          if (categoryMatch) {
            score += 10; // Base score for category match
            
            // Bonus for color match
            colors.forEach((color) => {
              if (itemColor.includes(color)) {
                score += 5;
              }
            });
          }
        });

        return { item, score };
      });

      // Filter and sort by score, take top 3
      const matches = scoredItems
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ item }) => item);

      if (matches.length === 0) {
        toast({
          title: 'No matches found',
          description: 'No matching items in your closet for these suggestions.',
        });
      } else {
        setClosetMatches(matches);
        toast({
          title: 'Found matches!',
          description: `Found ${matches.length} item(s) from your closet.`,
        });
      }
    } catch (error: any) {
      console.error('Error fetching closet:', error);
      toast({
        title: 'Failed to load closet',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingCloset(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Easy Outfit Fixes
        </h3>
        <ol className="space-y-3 list-decimal list-inside">
          {items.map((s, i) => {
            // Parse bold text for the category (e.g., **Change the blazer:**)
            const parts = s.suggestion.split(':');
            const category = parts[0]?.replace(/\*\*/g, '').trim();
            const explanation = parts.slice(1).join(':').trim();

            return (
              <li key={`${s.replaceItemId}-${i}`} className="pl-2">
                <span className="font-medium">{category}:</span>{' '}
                <span className="text-muted-foreground">{explanation}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleGenerateExample}
          disabled={isGenerating}
          className="flex-1"
          variant="outline"
        >
          {isGenerating ? (
            <>Generating...</>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Example
            </>
          )}
        </Button>

        <Button
          onClick={handlePickFromCloset}
          disabled={isLoadingCloset}
          className="flex-1"
          variant="default"
        >
          {isLoadingCloset ? (
            <>Loading...</>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              Pick from Closet
            </>
          )}
        </Button>
      </div>

      {generatedImage && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <img
            src={generatedImage}
            alt="Suggested items to swap"
            className="w-full h-auto"
          />
          <div className="p-3 space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Items you should consider swapping
            </p>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                saveSnapshot({ type: 'suggestion', preview: generatedImage, result: { suggestions: items } });
                toast({ title: 'Snapshot saved' });
              }}
            >
              Save Snapshot
            </Button>
          </div>
        </div>
      )}

      {closetMatches.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Matching Items from Your Closet
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {closetMatches.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-3 space-y-2">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.category}
                      className="w-full h-32 object-cover rounded"
                    />
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-medium capitalize">{item.category}</p>
                    {item.brand && (
                      <p className="text-xs text-muted-foreground">{item.brand}</p>
                    )}
                    {item.colorHex && (
                      <div className="flex items-center gap-2">
                        <span
                          className="h-4 w-4 rounded-full border"
                          style={{ backgroundColor: item.colorHex }}
                        />
                        <span className="text-xs text-muted-foreground capitalize">
                          {item.colorName || 'Color'}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
