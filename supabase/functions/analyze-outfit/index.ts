import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const contentType = req.headers.get('content-type') || '';
    let imageBase64: string;
    let items: Array<{ imageUrl: string; category: string }> = [];

    // Helper function to convert ArrayBuffer to base64 without stack overflow
    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000; // Process 32KB at a time
      let binary = '';
      
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      return btoa(binary);
    };

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await req.formData();
      const file = formData.get('image') as File;
      if (!file) {
        throw new Error('No image file provided');
      }
      const arrayBuffer = await file.arrayBuffer();
      imageBase64 = arrayBufferToBase64(arrayBuffer);
    } else {
      // Handle JSON with image URLs
      const body = await req.json();
      items = body.items || [];
      if (items.length === 0) {
        throw new Error('No items provided');
      }
      // For simplicity, analyze the first item's image
      const response = await fetch(items[0].imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      imageBase64 = arrayBufferToBase64(arrayBuffer);
    }

    // Call Lovable AI Gateway with Gemini 2.5 Flash
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a professional fashion stylist analyzing an outfit image. Please analyze the outfit and provide:
1. An overall style score (0-100)
2. A verdict (poor/okay/good/great/perfect)
3. Detailed comments about the outfit
4. Detected clothing items with their colors (in hex and color names)
5. Per-item scores and suggestions
6. Color harmony analysis with palette and any clashes
7. Suggested swaps for improvement

Return ONLY a valid JSON object with this exact structure:
{
  "overallScore": number,
  "verdict": "poor" | "okay" | "good" | "great" | "perfect",
  "comments": string[],
  "detectedItems": [{"id": string, "category": string, "colorHex": string, "colorName": string, "imageUrl": string}],
  "perItem": [{"itemId": string, "score": number, "issues": string[], "suggestions": string[]}],
  "colorHarmony": {"score": number, "palette": string[], "rulesMatched": string[], "clashes": string[]},
  "suggestedSwaps": [{"replaceItemId": string, "suggestion": string, "exampleItem": {"id": string, "category": string, "colorHex": string, "colorName": string}}]
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI Gateway error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;
    
    // Parse the JSON response from the AI
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || 
                        analysisText.match(/```\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : analysisText;
      analysis = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse AI response:', analysisText);
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify(analysis),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in analyze-outfit function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
