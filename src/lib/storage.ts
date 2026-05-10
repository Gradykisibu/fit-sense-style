import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache signed URLs in-memory so repeated renders for the same path
// don't trigger a new signing request. Signed URLs are cheap, but we
// still avoid the round-trip when one is already valid.
const cache = new Map<string, { url: string; expires: number }>();
const TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Resolve a stored closet image reference into something usable in <img src>.
 *
 * Accepts either:
 *  - a private Supabase storage path (e.g. "<userId>/abc.png" or a full
 *    "https://.../object/public|sign/closet-items/<path>" URL we previously
 *    saved) → returns a fresh signed URL.
 *  - an already-public URL (https/data:) → returns it as-is so legacy items
 *    keep displaying without re-uploading.
 *
 * Returns undefined only when no usable reference is available.
 */
export async function getSignedClosetUrl(stored: string): Promise<string | undefined> {
  if (!stored) return undefined;

  // Extract a storage path if the value already encodes one.
  let path = stored;
  const marker = "/closet-items/";
  const idx = stored.indexOf(marker);
  if (idx >= 0) path = stored.slice(idx + marker.length);
  path = path.replace(/^closet-items\//, "");

  // If after stripping we still have an absolute URL or data URI, just use it.
  // (Old items saved with public URLs continue to work without re-uploading.)
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) {
    return stored;
  }

  // Private bucket paths must contain a folder segment (userId/file.ext).
  // If we somehow got a bare filename, we can't sign it safely.
  if (!path || !path.includes("/")) return undefined;

  const cached = cache.get(path);
  if (cached && cached.expires > Date.now() + 30_000) return cached.url;

  const { data, error } = await supabase.storage
    .from("closet-items")
    .createSignedUrl(path, TTL_SECONDS);
  if (error || !data) return undefined;

  cache.set(path, { url: data.signedUrl, expires: Date.now() + TTL_SECONDS * 1000 });
  return data.signedUrl;
}

/** Hook that resolves a closet image reference to a displayable URL. */
export function useSignedClosetUrl(stored?: string | null): string | undefined {
  const [url, setUrl] = useState<string | undefined>();
  useEffect(() => {
    let cancelled = false;
    if (!stored) { setUrl(undefined); return; }
    getSignedClosetUrl(stored).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [stored]);
  return url;
}
