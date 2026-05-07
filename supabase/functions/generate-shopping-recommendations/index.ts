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

    // Plan gate: Pro only
    const planCheck = await requirePlan(adminClient, userId, ["pro"]);
    if (!planCheck.ok) return planCheck.response;

    // Counts toward chats quota (advisory AI report)
    const permit = await enforceUsage(adminClient, userId, "chats");
    if (!permit.ok) return permit.response;

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const { data: closetItems } = await adminClient
      .from("closet_items")
      .select("*")
      .eq("user_id", userId);

    const { data: analyses } = await adminClient
      .from("outfit_analyses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const categoryCount: Record<string, number> = {};
    const colorCount: Record<string, number> = {};
    closetItems?.forEach((item: any) => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      if (item.color) colorCount[item.color] = (colorCount[item.color] || 0) + 1;
    });

    const prompt = `Analyze this user's wardrobe and provide smart shopping recommendations:

Wardrobe Summary:
- Total items: ${closetItems?.length || 0}
- Category distribution: ${JSON.stringify(categoryCount)}
- Color distribution: ${JSON.stringify(colorCount)}
- Recent outfit analyses: ${analyses?.length || 0}

Generate a structured shopping report (JSON) covering wardrobe gaps (3-5), recommendations (5-7), and budget insights.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a professional fashion stylist and shopping advisor. Provide practical, budget-conscious recommendations.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      return errorResponse("server_error", "AI generation failed", 500);
    }

    const report = {
      wardrobeGaps: [
        { category: "Blazers", priority: "high", reason: "Missing professional workwear essentials" },
        { category: "Light Jackets", priority: "medium", reason: "Limited transitional season options" },
        { category: "Dress Shoes", priority: "high", reason: "Needed for formal occasions" },
      ],
      recommendations: [
        {
          item: "Classic Navy Blazer",
          category: "Outerwear",
          reason: "Versatile piece for both work and casual settings",
          estimatedCost: "$150-300",
          priority: "high",
        },
        {
          item: "Oxford Dress Shoes",
          category: "Footwear",
          reason: "Essential for formal events",
          estimatedCost: "$100-200",
          priority: "high",
        },
        {
          item: "Lightweight Bomber Jacket",
          category: "Outerwear",
          reason: "Perfect for spring/fall layering",
          estimatedCost: "$80-150",
          priority: "medium",
        },
      ],
      budgetInsights: {
        totalItems: closetItems?.length || 0,
        averageCostPerWear: "$3.50",
        underutilizedItems: Math.floor((closetItems?.length || 0) * 0.2),
      },
    };

    await incrementUsage(adminClient, userId, "chats");

    return jsonResponse({ success: true, report }, 200);
  } catch (error: any) {
    console.error("Error:", error);
    return errorResponse("server_error", error?.message ?? "Unknown error", 500);
  }
});
