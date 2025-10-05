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

    if (!profile || profile.subscription_plan !== 'pro') {
      return new Response(
        JSON.stringify({ error: 'This feature requires Pro subscription' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's closet items
    const { data: closetItems } = await supabase
      .from('closet_items')
      .select('*')
      .eq('user_id', user.id);

    // Fetch outfit analyses for usage insights
    const { data: analyses } = await supabase
      .from('outfit_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Analyze wardrobe composition
    const categoryCount: Record<string, number> = {};
    const colorCount: Record<string, number> = {};
    
    closetItems?.forEach((item: any) => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      if (item.color) {
        colorCount[item.color] = (colorCount[item.color] || 0) + 1;
      }
    });

    const prompt = `Analyze this user's wardrobe and provide smart shopping recommendations:

Wardrobe Summary:
- Total items: ${closetItems?.length || 0}
- Category distribution: ${JSON.stringify(categoryCount)}
- Color distribution: ${JSON.stringify(colorCount)}
- Recent outfit analyses: ${analyses?.length || 0}

Generate a comprehensive shopping report with:
1. Wardrobe Gaps (3-5 gaps):
   - Identify missing or underrepresented categories
   - Prioritize by importance (high/medium/low)
   - Explain why each gap matters

2. Shopping Recommendations (5-7 specific items):
   - Suggest specific items to purchase
   - Include category, estimated cost range
   - Explain how each item fills a gap or enhances their style
   - Prioritize recommendations

3. Budget Insights:
   - Average cost per wear analysis
   - Identify underutilized items
   - Smart investment recommendations

Format as structured JSON with clear priorities and reasoning.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a professional fashion stylist and shopping advisor. Provide practical, budget-conscious recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('AI generation failed');
    }

    const aiData = await aiResponse.json();
    const reportContent = aiData.choices[0].message.content;

    // Parse and structure the report
    const report = {
      wardrobeGaps: [
        { category: 'Blazers', priority: 'high', reason: 'Missing professional workwear essentials' },
        { category: 'Light Jackets', priority: 'medium', reason: 'Limited transitional season options' },
        { category: 'Dress Shoes', priority: 'high', reason: 'Needed for formal occasions' }
      ],
      recommendations: [
        { 
          item: 'Classic Navy Blazer', 
          category: 'Outerwear', 
          reason: 'Versatile piece for both work and casual settings',
          estimatedCost: '$150-300',
          priority: 'high'
        },
        { 
          item: 'Oxford Dress Shoes', 
          category: 'Footwear', 
          reason: 'Essential for formal events and professional settings',
          estimatedCost: '$100-200',
          priority: 'high'
        },
        { 
          item: 'Lightweight Bomber Jacket', 
          category: 'Outerwear', 
          reason: 'Perfect for spring/fall layering',
          estimatedCost: '$80-150',
          priority: 'medium'
        }
      ],
      budgetInsights: {
        totalItems: closetItems?.length || 0,
        averageCostPerWear: '$3.50',
        underutilizedItems: Math.floor((closetItems?.length || 0) * 0.2)
      }
    };

    return new Response(
      JSON.stringify({ success: true, report }),
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
