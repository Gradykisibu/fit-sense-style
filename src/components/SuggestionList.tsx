import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function SuggestionList({ items }: { items: { replaceItemId: string; suggestion: string }[] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();

  if (!items?.length) return <div className="text-sm text-muted-foreground">No swaps suggested. Looking good!</div>;

  const handleGenerateExample = async () => {
    setIsGenerating(true);
    try {
      const suggestions = items.map((s) => s.suggestion);
      
      const { data, error } = await supabase.functions.invoke('generate-outfit-image', {
        body: { suggestions },
      });

      if (error) throw error;
      
      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast({
          title: 'Example generated!',
          description: "Here's what your improved outfit could look like.",
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

      <Button
        onClick={handleGenerateExample}
        disabled={isGenerating}
        className="w-full"
        variant="outline"
      >
        {isGenerating ? (
          <>Generating Example...</>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate Example
          </>
        )}
      </Button>

      {generatedImage && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <img
            src={generatedImage}
            alt="Improved outfit example"
            className="w-full h-auto"
          />
          <div className="p-3 text-sm text-muted-foreground text-center">
            Example of your improved outfit
          </div>
        </div>
      )}
    </div>
  );
}
