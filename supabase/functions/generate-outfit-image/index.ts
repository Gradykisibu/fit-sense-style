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
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    const { userId, adminClient } = auth;

    // Image generation counts as an analysis
    const permit = await enforceUsage(adminClient, userId, "analyses");
    if (!permit.ok) return permit.response;

    const { suggestions, type = "swap" } = await req.json();
    if (!suggestions || !Array.isArray(suggestions)) {
      return errorResponse("bad_request", "Suggestions array is required", 400);
    }

    let prompt: string;
    if (type === "full") {
      const outfitDescription = suggestions.join(". ");
      prompt = `Generate a professional fashion photograph showing a complete outfit on a mannequin or model against a clean background. The outfit consists of: ${outfitDescription}. Show the full body, well-coordinated, high-quality fashion photography style, professional lighting.`;
    } else {
      const itemsToSwap = suggestions
        .map((s: string) => {
          const cleanSuggestion = s.replace(/\*\*/g, "");
          const match = cleanSuggestion.match(/Change the ([^:]+):/i);
          if (match) {
            const category = match[1];
            const description = cleanSuggestion.split(":")[1]?.trim() || cleanSuggestion;
            return `${category}: ${description}`;
          }
          return cleanSuggestion;
        })
        .join(". ");
      prompt = `Product photography showing individual clothing items laid out on a clean white background. Items to display: ${itemsToSwap}. Each item clearly visible, well-lit, professional fashion photography style.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      return errorResponse("server_error", `Failed to generate image: ${response.status}`, 500);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      return errorResponse("server_error", "No image in AI response", 500);
    }

    await incrementUsage(adminClient, userId, "analyses");

    return jsonResponse({ imageUrl }, 200);
  } catch (error: any) {
    console.error("Error in generate-outfit-image function:", error);
    return errorResponse("server_error", error?.message ?? "Unknown error", 500);
  }
});
