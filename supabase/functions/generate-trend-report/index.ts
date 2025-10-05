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

    // Fetch user's closet items
    const { data: closetItems } = await supabase
      .from('closet_items')
      .select('*')
      .eq('user_id', user.id);

    // Fetch recent outfit analyses (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: analyses } = await supabase
      .from('outfit_analyses')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', ninetyDaysAgo.toISOString());

    // Prepare data summary for AI
    const colorDistribution: Record<string, number> = {};
    const categoryDistribution: Record<string, number> = {};
    
    closetItems?.forEach((item: any) => {
      if (item.color) {
        colorDistribution[item.color] = (colorDistribution[item.color] || 0) + 1;
      }
      categoryDistribution[item.category] = (categoryDistribution[item.category] || 0) + 1;
    });

    const avgScore = analyses && analyses.length > 0
      ? analyses.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / analyses.length
      : 0;

    const prompt = `Analyze this user's wardrobe and style patterns for a seasonal trend report:

Wardrobe Summary:
- Total items: ${closetItems?.length || 0}
- Color distribution: ${JSON.stringify(colorDistribution)}
- Category distribution: ${JSON.stringify(categoryDistribution)}
- Outfit analyses count: ${analyses?.length || 0}
- Average outfit score: ${avgScore.toFixed(1)}/10

Generate a comprehensive seasonal trend report with:
1. Key insights about their current wardrobe (3-5 points)
2. Personalized recommendations for this season (3-5 points)
3. Wardrobe gaps they should fill
4. Style consistency analysis
5. Color palette suggestions

Format your response as structured data.`;

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
            content: 'You are a professional fashion stylist providing seasonal trend analysis and wardrobe recommendations.'
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

    // Parse AI response into structured data
    const insights = {
      summary: reportContent.split('\n').slice(0, 3).join(' '),
      wardrobe_strength: `Strong in ${Object.keys(categoryDistribution)[0] || 'basics'}`,
      color_analysis: `Predominantly ${Object.keys(colorDistribution)[0] || 'neutral'} tones`
    };

    const recommendations = {
      seasonal_additions: 'Add seasonal pieces to refresh your wardrobe',
      color_suggestions: 'Experiment with complementary colors',
      style_tips: reportContent.split('\n').find((line: string) => line.includes('recommend')) || 'Keep building on your current style'
    };

    const wardrobeAnalysis = {
      total_items: closetItems?.length || 0,
      avg_outfit_score: avgScore.toFixed(1),
      most_common_category: Object.keys(categoryDistribution)[0] || 'unknown',
      color_variety: Object.keys(colorDistribution).length
    };

    // Store the report
    const { error: insertError } = await supabase
      .from('trend_reports')
      .insert({
        user_id: user.id,
        report_period: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
        insights,
        recommendations,
        wardrobe_analysis: wardrobeAnalysis
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Trend report generated successfully' }),
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
