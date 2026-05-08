import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authenticate,
  corsHeaders,
  errorResponse,
  jsonResponse,
  logEvent,
  rateLimit,
} from "../_shared/usage.ts";

const SUPPORT_TO_EMAIL = "Kisibugrady3980@gmail.com";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("bad_request", "Method not allowed", 405);
  }

  try {
    const auth = await authenticate(req);
    if (!auth.ok) return auth.response;

    const { userId, userClient, adminClient, ip } = auth;
    const limited = rateLimit(userId, ip, "contact-support", { limit: 3, windowMs: 60_000 });
    if (limited) {
      logEvent("contact-support", "rate_limited", { userId });
      return limited;
    }

    const body = await req.json().catch(() => null);
    const category = String(body?.category || "Other").trim().slice(0, 80);
    const subject = String(body?.subject || "").trim().slice(0, 140);
    const message = String(body?.message || "").trim().slice(0, 4000);
    const replyEmail = String(body?.replyEmail || "").trim().slice(0, 254);

    if (!subject || !message) {
      return errorResponse("bad_request", "Subject and message are required", 400);
    }

    if (replyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyEmail)) {
      return errorResponse("bad_request", "Reply email is invalid", 400);
    }

    const { data: userData } = await userClient.auth.getUser();
    const userEmail = userData.user?.email || "unknown";

    const { data: profile } = await userClient
      .from("profiles")
      .select("name, country, subscription_plan")
      .eq("id", userId)
      .single();

    // Persist to DB so the team has a record even if email delivery is not configured
    const { error: insertError } = await adminClient.from("support_messages").insert({
      user_id: userId,
      category,
      subject,
      message,
      reply_email: replyEmail || null,
      user_email: userEmail,
    });
    if (insertError) {
      console.error("Failed to store support message:", insertError);
      return errorResponse("server_error", "Could not save support message", 500);
    }

    // Try to send email if RESEND_API_KEY is configured; otherwise succeed silently.
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailed = false;
    if (resendApiKey) {
      const fromEmail = Deno.env.get("SUPPORT_FROM_EMAIL") || "onboarding@resend.dev";
      const html = `
        <h2>New FitSense support request</h2>
        <p><strong>Category:</strong> ${escapeHtml(category)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p><strong>User ID:</strong> ${escapeHtml(userId)}</p>
        <p><strong>User email:</strong> ${escapeHtml(userEmail)}</p>
        <p><strong>Reply email:</strong> ${escapeHtml(replyEmail || userEmail)}</p>
        <p><strong>Name:</strong> ${escapeHtml(profile?.name || "Not set")}</p>
        <p><strong>Country:</strong> ${escapeHtml(profile?.country || "Not set")}</p>
        <p><strong>Plan:</strong> ${escapeHtml(profile?.subscription_plan || "free")}</p>
        <hr />
        <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      `;
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [SUPPORT_TO_EMAIL],
            reply_to: replyEmail && replyEmail !== "unknown" ? replyEmail : userEmail,
            subject: `[FitSense Support] ${subject}`,
            html,
          }),
        });
        emailed = response.ok;
        if (!response.ok) {
          console.error("Support email failed:", response.status, await response.text());
        }
      } catch (e) {
        console.error("Support email exception:", e);
      }
    }

    logEvent("contact-support", "sent", { userId, category, emailed });
    return jsonResponse({ success: true, emailed }, 200);
  } catch (error) {
    console.error("Error in contact-support function:", error);
    return errorResponse(
      "server_error",
      error instanceof Error ? error.message : "Unknown error",
      500,
    );
  }
});
