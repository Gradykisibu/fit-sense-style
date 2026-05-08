import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authenticate,
  corsHeaders,
  enforceUsage,
  errorResponse,
  incrementUsage,
  jsonResponse,
  logEvent,
  rateLimit,
} from "../_shared/usage.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;
    const { userId, adminClient, userClient, ip } = auth;

    const rl = rateLimit(userId, ip, "try-on", { limit: 3, windowMs: 60_000 });
    if (rl) { logEvent("generate-try-on-image", "rate_limited", { userId }); return rl; }

    const permit = await enforceUsage(adminClient, userId, "tryons");
    if (!permit.ok) { logEvent("generate-try-on-image", "blocked", { userId }); return permit.response; }

    const { items } = await req.json();
    if (!items || items.length < 2) {
      return errorResponse("bad_request", "At least 2 items are required", 400);
    }

    // Read user's gender to choose the mannequin
    const { data: profile } = await userClient
      .from("profiles")
      .select("gender")
      .eq("id", userId)
      .single();

    const genderRaw = (profile?.gender || "").toLowerCase();
    const mannequinGender: "male" | "female" =
      genderRaw === "male" || genderRaw === "female" ? genderRaw : "female";

    const { data: job, error: jobError } = await adminClient
      .from("try_on_jobs")
      .insert({ user_id: userId, items, status: "processing" })
      .select()
      .single();
    if (jobError) {
      console.error("Job creation error:", jobError);
      return errorResponse("server_error", "Could not create try-on job", 500);
    }

    const itemDescriptions = items
      .map(
        (item: any, i: number) =>
          `(${i + 1}) ${item.category}${item.color ? ` in ${item.color}` : ""}${item.brand ? ` by ${item.brand}` : ""}`,
      )
      .join(", ");

    const mannequinDescription =
      mannequinGender === "male"
        ? "a matte BLACK MALE full-body mannequin (smooth featureless masculine form, broad shoulders, no facial features)"
        : "a matte BLACK FEMALE full-body mannequin (smooth featureless feminine form, no facial features)";

    const promptText = `Create a PHOTOREALISTIC studio fashion photograph showing the EXACT clothing items provided in the reference images, dressed onto ${mannequinDescription}.

Items to dress (use these EXACT garments — do NOT substitute, recolor, restyle, or invent new items): ${itemDescriptions}.

STRICT REQUIREMENTS:
- Reproduce each provided garment with the SAME silhouette, color, pattern, fabric, print, logos and details as in the reference image. Do not change the design.
- Dress every provided item on the mannequin in a coherent layered outfit (e.g., top + bottom + outerwear/footwear/accessories as applicable).
- The figure MUST be a matte BLACK ${mannequinGender.toUpperCase()} mannequin — solid matte black plastic finish, no skin tone, no facial features, no hair.
- Full body shot, mannequin standing centered, neutral pose.
- Clean seamless light grey studio background, soft professional studio lighting, realistic shadows on the floor.
- Photorealistic photography, NOT illustration, NOT 3D render style, NOT cartoon.
- Do NOT add any extra clothing items that were not provided.`;

    const messageContent: any[] = [{ type: "text", text: promptText }];

    for (const item of items) {
      if (item.image_url) {
        messageContent.push({
          type: "image_url",
          image_url: { url: item.image_url },
        });
      }
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI generation failed:", errorText);
      await adminClient.from("try_on_jobs").update({ status: "failed" }).eq("id", job.id);
      return errorResponse("server_error", "AI generation failed", 500);
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      await adminClient.from("try_on_jobs").update({ status: "failed" }).eq("id", job.id);
      return errorResponse("server_error", "No image generated", 500);
    }

    const { error: updateError } = await adminClient
      .from("try_on_jobs")
      .update({ status: "success", result_image_url: imageUrl })
      .eq("id", job.id);
    if (updateError) {
      console.error("Update error:", updateError);
      return errorResponse("server_error", "Could not save result", 500);
    }

    await incrementUsage(adminClient, userId, "tryons");
    logEvent("generate-try-on-image", "success", { userId, mannequinGender });

    return jsonResponse({ success: true, jobId: job.id, imageUrl, mannequinGender }, 200);
  } catch (error: any) {
    console.error("Error:", error);
    return errorResponse("server_error", error?.message ?? "Unknown error", 500);
  }
});
