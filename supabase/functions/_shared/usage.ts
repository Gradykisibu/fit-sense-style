// Shared usage enforcement helpers for AI edge functions.
// Used by analyze-outfit, ai-assistant, generate-try-on-image,
// generate-shopping-recommendations, generate-outfit-image.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export type UsageType = "analyses" | "chats";
export type Plan = "free" | "basic" | "premium" | "pro";

export const PLAN_LIMITS: Record<Plan, { analyses: number; chats: number }> = {
  free: { analyses: 5, chats: 10 },
  basic: { analyses: 50, chats: 100 },
  premium: { analyses: 200, chats: 500 },
  pro: { analyses: 1000, chats: 2000 },
};

export function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(
  code: "unauthorized" | "limit_reached" | "forbidden" | "server_error" | "bad_request",
  message: string,
  status: number,
  extra: Record<string, unknown> = {},
) {
  return jsonResponse({ error: { code, message, ...extra } }, status);
}

/**
 * Authenticate the request, returning { user, userClient, adminClient }.
 * Throws Response on failure (caller should `return` it).
 */
export async function authenticate(req: Request): Promise<
  | {
      ok: true;
      userId: string;
      userClient: SupabaseClient;
      adminClient: SupabaseClient;
      authHeader: string;
    }
  | { ok: false; response: Response }
> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: errorResponse("unauthorized", "Missing or invalid Authorization header", 401),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user) {
    return {
      ok: false,
      response: errorResponse("unauthorized", "Invalid or expired token", 401),
    };
  }

  return { ok: true, userId: data.user.id, userClient, adminClient, authHeader };
}

/**
 * Enforce plan + usage limits server-side. Performs auto-reset if the
 * usage_reset_date has elapsed. Returns either a permit object or a Response
 * that the caller must return immediately.
 *
 * IMPORTANT: This does NOT increment usage. Call `incrementUsage` only after
 * the AI logic succeeds.
 */
export async function enforceUsage(
  adminClient: SupabaseClient,
  userId: string,
  type: UsageType,
): Promise<
  | { ok: true; plan: Plan; used: number; limit: number }
  | { ok: false; response: Response }
> {
  // Auto-reset if needed (atomic, server-side).
  await adminClient.rpc("reset_usage_if_needed", { _user_id: userId });

  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("subscription_plan, monthly_analyses_used, monthly_chats_used, usage_reset_date")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return {
      ok: false,
      response: errorResponse("server_error", "Could not load user profile", 500),
    };
  }

  const plan = (PLAN_LIMITS[profile.subscription_plan as Plan]
    ? (profile.subscription_plan as Plan)
    : "free");
  const limits = PLAN_LIMITS[plan];
  const limit = type === "analyses" ? limits.analyses : limits.chats;
  const used =
    type === "analyses"
      ? profile.monthly_analyses_used ?? 0
      : profile.monthly_chats_used ?? 0;

  if (used >= limit) {
    return {
      ok: false,
      response: errorResponse(
        "limit_reached",
        `Monthly ${type} limit reached for the ${plan} plan (${used}/${limit}). Upgrade your plan to continue.`,
        403,
        { plan, used, limit, type, resetAt: profile.usage_reset_date },
      ),
    };
  }

  return { ok: true, plan, used, limit };
}

/**
 * Atomically increment the user's usage counter via the SECURITY DEFINER RPC.
 * Call this only after the AI logic succeeded.
 */
export async function incrementUsage(
  adminClient: SupabaseClient,
  userId: string,
  type: UsageType,
): Promise<void> {
  const fn = type === "analyses" ? "increment_analyses" : "increment_chats";
  const { error } = await adminClient.rpc(fn, { _user_id: userId });
  if (error) {
    console.error(`Failed to increment ${type} usage for ${userId}:`, error);
  }
}

/**
 * Require a minimum subscription plan (used for plan-gated features such as
 * Virtual Try-On (Premium/Pro) and Shopping Recommendations (Pro)).
 */
export async function requirePlan(
  adminClient: SupabaseClient,
  userId: string,
  allowed: Plan[],
): Promise<{ ok: true; plan: Plan } | { ok: false; response: Response }> {
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("subscription_plan")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return {
      ok: false,
      response: errorResponse("server_error", "Could not load user profile", 500),
    };
  }

  const plan = profile.subscription_plan as Plan;
  if (!allowed.includes(plan)) {
    return {
      ok: false,
      response: errorResponse(
        "forbidden",
        `This feature requires one of: ${allowed.join(", ")}. Your plan: ${plan}.`,
        403,
        { plan, allowed },
      ),
    };
  }
  return { ok: true, plan };
}
