// Shared helpers for AI edge functions:
// - auth (JWT validation)
// - subscription plan + per-feature usage enforcement
// - country gating (ZA / US / GB / CA only)
// - basic in-memory per-user/per-IP rate limiting (NOTE: replace with Redis/Upstash in prod)

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export type UsageType = "analyses" | "chats" | "tryons" | "shopping";
export type Plan = "free" | "basic" | "premium" | "pro";

export const PLAN_LIMITS: Record<
  Plan,
  { analyses: number; chats: number; tryons: number; shopping: number }
> = {
  free:    { analyses: 5,    chats: 10,   tryons: 1,   shopping: 0 },
  basic:   { analyses: 50,   chats: 100,  tryons: 10,  shopping: 0 },
  premium: { analyses: 200,  chats: 500,  tryons: 50,  shopping: 20 },
  pro:     { analyses: 1000, chats: 2000, tryons: 200, shopping: 200 },
};

// Single source of truth for supported countries (ISO-3166 alpha-2)
export const SUPPORTED_COUNTRIES = ["ZA", "US", "GB", "CA"] as const;
export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];

export function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "limit_reached"
  | "rate_limited"
  | "country_blocked"
  | "account_blocked"
  | "bad_request"
  | "server_error";

export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  extra: Record<string, unknown> = {},
) {
  return jsonResponse({ error: { code, message, ...extra } }, status);
}

/**
 * Authenticate the request via JWT; returns clients + userId.
 */
export async function authenticate(req: Request): Promise<
  | {
      ok: true;
      userId: string;
      userClient: SupabaseClient;
      adminClient: SupabaseClient;
      authHeader: string;
      ip: string;
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

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  return { ok: true, userId: data.user.id, userClient, adminClient, authHeader, ip };
}

// ---------------- Rate limiting (in-memory token bucket) ----------------
// NOTE: This is per-edge-instance only. For production with multiple
// instances or strict abuse protection, replace with Upstash/Redis.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Max requests per window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
}

function takeToken(key: string, opts: RateLimitOptions): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }
  if (b.count >= opts.limit) return false;
  b.count++;
  return true;
}

/**
 * Rate-limit by user id and (separately) by IP. Returns a 429 Response when
 * the caller exceeds either limit. Pass per-feature options.
 */
export function rateLimit(
  userId: string,
  ip: string,
  feature: string,
  opts: RateLimitOptions = { limit: 10, windowMs: 60_000 },
): Response | null {
  const userKey = `u:${feature}:${userId}`;
  const ipKey = `ip:${feature}:${ip}`;
  if (!takeToken(userKey, opts) || !takeToken(ipKey, opts)) {
    return errorResponse(
      "rate_limited",
      "Too many requests. Please slow down and try again in a minute.",
      429,
      { retryAfterSec: Math.ceil(opts.windowMs / 1000) },
    );
  }
  return null;
}

// ---------------- Country + account gating + plan enforcement ----------------

interface ProfileRow {
  subscription_plan: string;
  monthly_analyses_used: number | null;
  monthly_chats_used: number | null;
  monthly_tryons_used: number | null;
  monthly_shopping_used: number | null;
  usage_reset_date: string | null;
  country: string | null;
  account_status: string | null;
}

async function loadProfile(
  adminClient: SupabaseClient,
  userId: string,
): Promise<{ ok: true; profile: ProfileRow } | { ok: false; response: Response }> {
  const { data, error } = await adminClient
    .from("profiles")
    .select(
      "subscription_plan, monthly_analyses_used, monthly_chats_used, monthly_tryons_used, monthly_shopping_used, usage_reset_date, country, account_status",
    )
    .eq("id", userId)
    .single();

  if (error || !data) {
    return {
      ok: false,
      response: errorResponse("server_error", "Could not load user profile", 500),
    };
  }
  return { ok: true, profile: data as ProfileRow };
}

/** Block users whose account_status is not 'active'. */
function checkAccount(profile: ProfileRow): Response | null {
  if (profile.account_status && profile.account_status !== "active") {
    return errorResponse(
      "account_blocked",
      "Your account is not active. Please contact support.",
      403,
    );
  }
  return null;
}

/** Block users whose country is not supported (ZA, US, GB, CA). */
function checkCountry(profile: ProfileRow): Response | null {
  const c = (profile.country || "").toUpperCase();
  if (!c) {
    return errorResponse(
      "country_blocked",
      "Please set your country in Settings to continue.",
      403,
      { supported: SUPPORTED_COUNTRIES },
    );
  }
  if (!SUPPORTED_COUNTRIES.includes(c as SupportedCountry)) {
    return errorResponse(
      "country_blocked",
      "FitSense Style is not yet available in your country.",
      403,
      { supported: SUPPORTED_COUNTRIES, country: c },
    );
  }
  return null;
}

/**
 * Enforce subscription plan + monthly usage limit for the given feature.
 * Auto-resets counters when usage_reset_date has elapsed.
 * Also enforces country and account_status.
 *
 * Does NOT increment usage. Caller must call `incrementUsage` after success.
 */
export async function enforceUsage(
  adminClient: SupabaseClient,
  userId: string,
  type: UsageType,
): Promise<
  | { ok: true; plan: Plan; used: number; limit: number; country: string }
  | { ok: false; response: Response }
> {
  // Auto-reset if needed (atomic, server-side).
  await adminClient.rpc("reset_usage_if_needed", { _user_id: userId });

  const loaded = await loadProfile(adminClient, userId);
  if (!loaded.ok) return loaded;
  const profile = loaded.profile;

  const accountErr = checkAccount(profile);
  if (accountErr) return { ok: false, response: accountErr };

  const countryErr = checkCountry(profile);
  if (countryErr) return { ok: false, response: countryErr };

  const plan: Plan = (PLAN_LIMITS[profile.subscription_plan as Plan]
    ? (profile.subscription_plan as Plan)
    : "free");
  const limits = PLAN_LIMITS[plan];
  const limit = limits[type];

  const usedMap: Record<UsageType, number> = {
    analyses: profile.monthly_analyses_used ?? 0,
    chats: profile.monthly_chats_used ?? 0,
    tryons: profile.monthly_tryons_used ?? 0,
    shopping: profile.monthly_shopping_used ?? 0,
  };
  const used = usedMap[type];

  if (limit <= 0) {
    return {
      ok: false,
      response: errorResponse(
        "forbidden",
        `Your ${plan} plan does not include ${type}. Please upgrade.`,
        403,
        { plan, type, used, limit },
      ),
    };
  }

  if (used >= limit) {
    return {
      ok: false,
      response: errorResponse(
        "limit_reached",
        `Monthly ${type} limit reached on the ${plan} plan (${used}/${limit}). Upgrade to continue.`,
        403,
        { plan, used, limit, type, resetAt: profile.usage_reset_date },
      ),
    };
  }

  return { ok: true, plan, used, limit, country: (profile.country || "").toUpperCase() };
}

/** Atomically bump the right monthly counter. Call ONLY after AI success. */
export async function incrementUsage(
  adminClient: SupabaseClient,
  userId: string,
  type: UsageType,
): Promise<void> {
  const fn =
    type === "analyses"
      ? "increment_analyses"
      : type === "chats"
      ? "increment_chats"
      : type === "tryons"
      ? "increment_tryons"
      : "increment_shopping";
  const { error } = await adminClient.rpc(fn, { _user_id: userId });
  if (error) {
    console.error(`Failed to increment ${type} usage for ${userId}:`, error);
  }
}

/** Require minimum plan tier for plan-gated features. */
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

/** Safe structured event log (no PII / no images). */
export function logEvent(
  fn: string,
  event: string,
  meta: Record<string, unknown> = {},
) {
  try {
    console.log(JSON.stringify({ fn, event, ts: new Date().toISOString(), ...meta }));
  } catch {
    /* no-op */
  }
}
