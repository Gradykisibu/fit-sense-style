import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; expires: number }>();
const TTL_SECONDS = 60 * 60; // 1 hour

/** Convert a public URL or storage path into a fresh signed URL. */
export async function getSignedClosetUrl(stored: string): Promise<string> {
  if (!stored) return stored;
  // Already a data: or external URL? Pass through.
  if (stored.startsWith("data:") || (!stored.includes("/closet-items/") && !stored.startsWith("closet-items/"))) {
    if (!stored.includes("/closet-items/")) return stored;
  }

  // Extract the storage path (everything after `/closet-items/`).
  let path = stored;
  const marker = "/closet-items/";
  const idx = stored.indexOf(marker);
  if (idx >= 0) path = stored.slice(idx + marker.length);

  const cached = cache.get(path);
  if (cached && cached.expires > Date.now() + 30_000) return cached.url;

  const { data, error } = await supabase.storage
    .from("closet-items")
    .createSignedUrl(path, TTL_SECONDS);
  if (error || !data) return stored; // graceful fallback

  cache.set(path, { url: data.signedUrl, expires: Date.now() + TTL_SECONDS * 1000 });
  return data.signedUrl;
}

/** Hook that resolves a closet image URL to a signed URL. */
export function useSignedClosetUrl(stored?: string | null): string | undefined {
  const [url, setUrl] = useState<string | undefined>(stored ?? undefined);
  useEffect(() => {
    let cancelled = false;
    if (!stored) { setUrl(undefined); return; }
    getSignedClosetUrl(stored).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [stored]);
  return url;
}
