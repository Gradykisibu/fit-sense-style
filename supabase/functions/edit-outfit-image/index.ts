import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authenticate,
  corsHeaders,
  enforceUsage,
  errorResponse,
  incrementUsage,
  jsonResponse,
  requirePlan,
} from "../_shared/usage.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    const { userId, adminClient } = auth;

    // Plan-gated (visual outfit edit is a premium feature)
    const planCheck = await requirePlan(adminClient, userId, ["premium", "pro"]);
    if (!planCheck.ok) return planCheck.response;

    const permit = await enforceUsage(adminClient, userId, "analyses");
    if (!permit.ok) return permit.response;

    const { imageUrl, currentOutfit, suggestions } = await req.json();
    if (!imageUrl || typeof imageUrl !== "string") {
      return errorResponse("bad_request", "imageUrl is required", 400);
    }
    if (!suggestions || (Array.isArray(suggestions) && suggestions.length === 0)) {
      return errorResponse("bad_request", "suggestions are required", 400);
    }

    const suggestionText = Array.isArray(suggestions)
      ? suggestions
          .map((s: any, i: number) =>
            `${i + 1}. ${(typeof s === "string" ? s : s.suggestion || JSON.stringify(s)).replace(/\*\*/g, "")}`,
          )
          .join("\n")
      : String(suggestions);

    const currentText = Array.isArray(currentOutfit)
      ? currentOutfit
          .map((it: any) =>
            typeof it === "string"
              ? it
              : `${it.category || "item"}${it.color ? ` (${it.color})` : ""}${it.brand ? ` by ${it.brand}` : ""}`,
          )
          .join(", ")
      : String(currentOutfit ?? "");

    const prompt = `Edit this photo of a person to apply the following outfit improvements.

CURRENT OUTFIT: ${currentText || "(see image)"}

SUGGESTED CHANGES:
${suggestionText}

STRICT REQUIREMENTS:
- Replace or modify ONLY the clothing items per the suggestions above.
- PRESERVE the person's identity exactly: face, hair, skin tone, body shape, height, and proportions must be unchanged.
- KEEP the original pose, camera angle, framing, and background/environment unchanged.
- Match realistic fabric textures, lighting, shadows, wrinkles, and fit so the new clothing looks naturally worn.
- Photorealistic output. No illustration, no cartoon, no stylization.
- Do not add or remove people. Do not alter the background.
- Output a single edited photo of the same person wearing the improved outfit.`;

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return errorResponse("server_error", "LOVABLE_API_KEY not configured", 500);
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return errorResponse("server_error", "Rate limit exceeded. Please try again later.", 429);
      }
      if (aiResponse.status === 402) {
        return errorResponse("server_error", "AI credits depleted.", 402);
      }
      const t = await aiResponse.text();
      console.error("AI edit failed:", aiResponse.status, t);
      return errorResponse("server_error", "AI edit failed", 500);
    }

    const data = await aiResponse.json();
    const editedUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!editedUrl) {
      return errorResponse("server_error", "No edited image returned", 500);
    }

    await incrementUsage(adminClient, userId, "analyses");

    return jsonResponse({ imageUrl: editedUrl }, 200);
  } catch (error: any) {
    console.error("Error in edit-outfit-image:", error);
    return errorResponse("server_error", error?.message ?? "Unknown error", 500);
  }
});
