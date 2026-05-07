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

    // Plan gate: Premium or Pro only
    const planCheck = await requirePlan(adminClient, userId, ["premium", "pro"]);
    if (!planCheck.ok) return planCheck.response;

    // Try-on counts toward analyses quota
    const permit = await enforceUsage(adminClient, userId, "analyses");
    if (!permit.ok) return permit.response;

    const { items } = await req.json();
    if (!items || items.length < 2) {
      return errorResponse("bad_request", "At least 2 items are required", 400);
    }

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
        (item: any) =>
          `${item.category}${item.color ? ` in ${item.color}` : ""}${item.brand ? ` by ${item.brand}` : ""}`,
      )
      .join(", ");

    const messageContent: any[] = [
      {
        type: "text",
        text: `Create a PHOTOREALISTIC fashion photograph showing these clothing items styled together on a professional fashion model or mannequin. Items to style: ${itemDescriptions}.

Requirements:
- Professional fashion photography with studio lighting
- Realistic photographic rendering (NOT illustration)
- Clean neutral background
- Accurate colors and textures matching provided items
- Full body shot showing how all pieces coordinate`,
      },
    ];

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

    await incrementUsage(adminClient, userId, "analyses");

    return jsonResponse({ success: true, jobId: job.id, imageUrl }, 200);
  } catch (error: any) {
    console.error("Error:", error);
    return errorResponse("server_error", error?.message ?? "Unknown error", 500);
  }
});
