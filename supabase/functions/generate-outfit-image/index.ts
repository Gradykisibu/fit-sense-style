import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { suggestions } = await req.json();
    
    if (!suggestions || !Array.isArray(suggestions)) {
      throw new Error('Suggestions array is required');
    }

    // Build a descriptive prompt showing only the items to swap
    const itemsToSwap = suggestions
      .map((s: string) => {
        const cleanSuggestion = s.replace(/\*\*/g, '');
        // Extract the item category from suggestions like "Change the blazer: ..."
        const match = cleanSuggestion.match(/Change the ([^:]+):/i);
        if (match) {
          const category = match[1];
          const description = cleanSuggestion.split(':')[1]?.trim() || cleanSuggestion;
          return `${category}: ${description}`;
        }
        return cleanSuggestion;
      })
      .join('. ');
    
    const prompt = `Product photography showing individual clothing items laid out on a clean white background. Items to display: ${itemsToSwap}. Each item should be clearly visible, well-lit, professional fashion photography style, high quality, catalog style presentation.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`Failed to generate image: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      throw new Error('No image in AI response');
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in generate-outfit-image function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
