import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authenticate,
  corsHeaders,
  enforceUsage,
  errorResponse,
  incrementUsage,
  jsonResponse,
} from "../_shared/usage.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    const { userId, userClient, adminClient } = auth;

    // Enforce chat usage server-side
    const permit = await enforceUsage(adminClient, userId, "chats");
    if (!permit.ok) return permit.response;

    const { messages, generateImage } = await req.json();

    const { data: closetItems } = await userClient
      .from("closet_items")
      .select("*")
      .eq("user_id", userId);

    const { data: preferences } = await userClient
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .order("confidence_score", { ascending: false });

    const { data: profile } = await userClient
      .from("profiles")
      .select("name, country")
      .eq("id", userId)
      .single();

    const preferenceContext = preferences
      ? preferences
          .map(
            (p) =>
              `${p.preference_type}: ${p.preference_key} = ${p.preference_value} (confidence: ${p.confidence_score})`,
          )
          .join("\n")
      : "No preferences learned yet.";

    const closetContext =
      closetItems && closetItems.length > 0
        ? `User's closet contains ${closetItems.length} items. You MUST reference these items using their EXACT descriptions below:\n\n` +
          closetItems
            .map(
              (item, index) =>
                `${index + 1}. Category: "${item.category}" | Color: "${item.color || "unknown"}" | Brand: "${item.brand || "no brand"}" | ID: ${item.id}`,
            )
            .join("\n")
        : "User's closet is empty.";

    const systemPrompt = `You are an expert AI fashion stylist and personal assistant.

USER PROFILE:
- Name: ${profile?.name || "User"}
- Location: ${profile?.country || "Unknown"}

LEARNED PREFERENCES:
${preferenceContext}

CLOSET INVENTORY:
${closetContext}

Use EXACT category, color, and brand names from the closet inventory. Only suggest items that exist in the numbered list. If the closet doesn't have suitable items, say so and encourage the user to add them.`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: any) => {
        if (msg.image_url) {
          return {
            role: msg.role,
            content: [
              { type: "text", text: msg.content },
              { type: "image_url", image_url: { url: msg.image_url } },
            ],
          };
        }
        return { role: msg.role, content: msg.content };
      }),
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return errorResponse("server_error", "LOVABLE_API_KEY not configured", 500);
    }

    if (generateImage) {
      const lastMessage = messages[messages.length - 2];
      const outfitDescription = lastMessage?.content || "";
      const imagePrompt = `Generate a high-quality realistic fashion photography image of the outfit on a clean white background:\n\n${outfitDescription}\n\nFlat lay style, professional product photography.`;

      const imageGenResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview",
            messages: [{ role: "user", content: imagePrompt }],
            modalities: ["image", "text"],
          }),
        },
      );

      if (!imageGenResponse.ok) {
        const errorText = await imageGenResponse.text();
        console.error("Image generation failed:", imageGenResponse.status, errorText);
        return errorResponse("server_error", "Image generation failed", 500);
      }

      const data = await imageGenResponse.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) {
        return errorResponse("server_error", "No image generated", 500);
      }

      await incrementUsage(adminClient, userId, "chats");
      return jsonResponse({ imageUrl }, 200);
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
        return errorResponse("server_error", "Rate limit exceeded. Please try again later.", 429);
      }
      if (response.status === 402) {
        return errorResponse("server_error", "AI credits depleted.", 402);
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return errorResponse("server_error", `AI Gateway error: ${response.status}`, 500);
    }

    // Increment chat usage on successful start of stream
    await incrementUsage(adminClient, userId, "chats");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in ai-assistant function:", error);
    return errorResponse(
      "server_error",
      error instanceof Error ? error.message : "Unknown error",
      500,
    );
  }
});
