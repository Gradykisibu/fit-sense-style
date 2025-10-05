import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Extract JWT from header and resolve user explicitly
    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(jwt);

    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("User not authenticated");
    }

    console.log("Authenticated user:", user.id);

    const { messages, conversationId, imageUrl, generateImage } = await req.json();

    // Fetch user's closet items
    const { data: closetItems } = await supabaseClient
      .from("closet_items")
      .select("*")
      .eq("user_id", user.id);

    // Fetch user's style preferences
    const { data: preferences } = await supabaseClient
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .order("confidence_score", { ascending: false });

    // Fetch user's profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("name, country")
      .eq("id", user.id)
      .single();

    // Build context from preferences
    const preferenceContext = preferences
      ? preferences
          .map((p) => `${p.preference_type}: ${p.preference_key} = ${p.preference_value} (confidence: ${p.confidence_score})`)
          .join("\n")
      : "No preferences learned yet.";

    // Build closet context
    const closetContext = closetItems && closetItems.length > 0
      ? `User's closet contains ${closetItems.length} items:\n` +
        closetItems
          .map((item) => `- ${item.category} (${item.color || "unknown color"}${item.brand ? ", " + item.brand : ""})`)
          .join("\n")
      : "User's closet is empty.";

    // Build system prompt with personalization
    const systemPrompt = `You are an expert AI fashion stylist and personal assistant. Your role is to provide personalized outfit recommendations and style advice.

USER PROFILE:
- Name: ${profile?.name || "User"}
- Location: ${profile?.country || "Unknown"}

LEARNED PREFERENCES:
${preferenceContext}

CLOSET INVENTORY:
${closetContext}

CAPABILITIES:
1. Analyze outfit photos and provide detailed feedback
2. Suggest outfits from the user's closet for specific occasions
3. Learn and remember user preferences over time
4. Provide personalized style advice based on past interactions
5. Recommend specific items from their closet with reasoning
6. Generate visual representations of outfit suggestions using AI

GUIDELINES:
- Be conversational, friendly, and enthusiastic about fashion
- Always reference specific items from their closet when making recommendations
- If they upload an image, analyze it thoroughly (colors, fit, occasion-appropriateness, styling)
- Learn from their responses and update preferences (note when they like/dislike suggestions)
- When suggesting outfits, explain WHY each piece works together
- If their closet is empty, encourage them to add items first
- Be honest but constructive with feedback
- Consider their learned preferences in all recommendations
- IMPORTANT: After providing outfit suggestions, always ask if they would like to see a visual representation of the outfit
- When the user expresses interest in seeing the outfit visualization, provide a detailed description of the complete outfit including specific clothing items, colors, fabrics, and styling details`;

    // Prepare messages for AI
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: any) => {
        if (msg.image_url) {
          return {
            role: msg.role,
            content: [
              { type: "text", text: msg.content },
              {
                type: "image_url",
                image_url: { url: msg.image_url },
              },
            ],
          };
        }
        return { role: msg.role, content: msg.content };
      }),
    ];

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // If generateImage is true, use the image generation model
    if (generateImage) {
      console.log("Generating outfit image...");
      
      // Extract outfit details from the last assistant message to create a detailed prompt
      const lastMessage = messages[messages.length - 2]; // Second to last (before "Yes")
      const outfitDescription = lastMessage?.content || "";
      
      // Create a detailed image generation prompt
      const imagePrompt = `Generate a high-quality, realistic fashion photography style image showing a complete outfit laid out on a clean white background. The outfit consists of:

${outfitDescription}

Style: Professional product photography, well-lit, sharp focus, centered composition. Show the clothing items arranged as if ready to wear - shirt/top at the top, pants/bottoms below, shoes at the bottom. Make it look like a fashion catalog or Instagram flat lay photo.`;

      console.log("Image generation prompt:", imagePrompt);

      const imageGenResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: imagePrompt
            }
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!imageGenResponse.ok) {
        const errorText = await imageGenResponse.text();
        console.error("Image generation failed:", imageGenResponse.status, errorText);
        throw new Error(`Image generation failed: ${imageGenResponse.status}`);
      }

      const data = await imageGenResponse.json();
      console.log("Image generation response received");
      
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (!imageUrl) {
        console.error("No image URL in response:", JSON.stringify(data));
        throw new Error("No image generated");
      }
      
      console.log("Image URL extracted successfully");
      
      return new Response(
        JSON.stringify({ imageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        stream: true,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    // Stream the response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in ai-assistant function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
