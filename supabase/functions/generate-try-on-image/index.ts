import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check user's subscription plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', user.id)
      .single();

    if (!profile || !['premium', 'pro'].includes(profile.subscription_plan)) {
      return new Response(
        JSON.stringify({ error: 'This feature requires Premium or Pro subscription' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { items } = await req.json();

    if (!items || items.length < 2) {
      return new Response(
        JSON.stringify({ error: 'At least 2 items are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a try-on job
    const { data: job, error: jobError } = await supabase
      .from('try_on_jobs')
      .insert({
        user_id: user.id,
        items: items,
        status: 'processing'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      throw jobError;
    }

    // Create a prompt for the AI to generate a combined outfit visualization
    const itemDescriptions = items.map((item: any) => 
      `${item.category}${item.color ? ` in ${item.color}` : ''}${item.brand ? ` by ${item.brand}` : ''}`
    ).join(', ');

    const prompt = `Create a professional fashion illustration showing a complete outfit combination featuring: ${itemDescriptions}. 
    The illustration should be clean, modern, and show how these items work together as a cohesive outfit. 
    Style: fashion sketch, clean background, professional presentation.`;

    console.log('Generating image with prompt:', prompt);

    // Generate the image using Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI generation failed:', errorText);
      throw new Error('AI generation failed');
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    // Update the job with the result
    const { error: updateError } = await supabase
      .from('try_on_jobs')
      .update({
        status: 'completed',
        result_image_url: imageUrl
      })
      .eq('id', job.id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, jobId: job.id, imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
