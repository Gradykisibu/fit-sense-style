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
    const { userId, userClient, adminClient } = auth;

    // Server-side plan + usage enforcement
    const permit = await enforceUsage(adminClient, userId, "analyses");
    if (!permit.ok) return permit.response;

    // Get user's name from profiles
    const { data: profile } = await userClient
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .single();

    const fullName = profile?.name || "there";
    const userName = fullName.split(" ")[0];

    const contentType = req.headers.get("content-type") || "";
    let imageBase64: string;
    let items: Array<{ imageUrl: string; category: string }> = [];

    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      let binary = "";
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      return btoa(binary);
    };

    let imageContents: Array<{ type: string; image_url: { url: string } }> = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File;
      if (!file) {
        return errorResponse("bad_request", "No image file provided", 400);
      }
      const arrayBuffer = await file.arrayBuffer();
      imageBase64 = arrayBufferToBase64(arrayBuffer);
      imageContents = [{
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
      }];
    } else {
      const body = await req.json();
      items = body.items || [];
      if (items.length === 0) {
        return errorResponse("bad_request", "No items provided", 400);
      }
      for (const item of items) {
        const response = await fetch(item.imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        imageContents.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${base64}` },
        });
      }
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a professional fashion stylist with years of experience who helps people look their best. You have a keen eye for detail and give honest, practical advice using clear language.

**Your job:** Analyze ${imageContents.length > 1 ? "these clothing items as a combined outfit" : "this outfit"} carefully and give helpful, honest feedback. Be a REAL stylist - if items don't work together, say so clearly. Don't sugarcoat poor combinations.

**What to provide:**
1. An overall style score (0-100) - be honest but encouraging
2. A verdict: "poor" / "okay" / "good" / "great" / "perfect"
3. 2-4 positive comments about what works well
4. Detected clothing items with their colors (hex codes + color names)
5. Per-item feedback with specific improvement ideas
6. Color harmony analysis with palette and any clashes
7. Suggested swaps to improve the outfit

**SPECIAL RULE FOR HIGH SCORES (80+):**
If the overall score is 80 or above, DO NOT provide any swap suggestions. Instead:
- Set "suggestedSwaps" to an empty array []
- In the "comments" section, add a personalized compliment addressing "${userName}" directly
- Use 1-2 emojis naturally in the compliment
- Make it warm, genuine, and specific to what makes the outfit great

**SPECIAL RULE FOR LOW SCORES (25 and below):**
If the overall score is 25 or below, add a playful, lighthearted tease in the "comments" section addressing "${userName}" directly with humor and 1-2 emojis.

Return ONLY valid JSON with this structure:
{
  "overallScore": number,
  "verdict": "poor" | "okay" | "good" | "great" | "perfect",
  "comments": string[],
  "detectedItems": [{"id": string, "category": string, "colorHex": string, "colorName": string, "imageUrl": string}],
  "perItem": [{"itemId": string, "score": number, "issues": string[], "suggestions": string[]}],
  "colorHarmony": {"score": number, "palette": string[], "rulesMatched": string[], "clashes": string[]},
  "suggestedSwaps": [{"replaceItemId": string, "suggestion": string, "exampleItem": {"id": string, "category": string, "colorHex": string, "colorName": string}}]
}`,
              },
              ...imageContents,
            ],
          },
        ],
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      return errorResponse("server_error", "AI Gateway error", 500);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;

    let analysis;
    try {
      const jsonMatch =
        analysisText.match(/```json\n([\s\S]*?)\n```/) ||
        analysisText.match(/```\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : analysisText;
      analysis = JSON.parse(jsonText);
    } catch (e) {
      console.error("Failed to parse AI response:", analysisText);
      return errorResponse("server_error", "Failed to parse AI response as JSON", 500);
    }

    // Increment usage only after successful AI logic
    await incrementUsage(adminClient, userId, "analyses");

    return jsonResponse(analysis, 200);
  } catch (error) {
    console.error("Error in analyze-outfit function:", error);
    return errorResponse(
      "server_error",
      error instanceof Error ? error.message : "Unknown error",
      500,
    );
  }
});
