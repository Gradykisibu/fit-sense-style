// Client-side image upload validation.
// Server-side limits are also enforced via storage RLS / size limits.

export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export function validateImageFile(file: File): { ok: true } | { ok: false; reason: string } {
  if (!ALLOWED_IMAGE_MIME.includes(file.type as any)) {
    return { ok: false, reason: "Only JPG, PNG or WEBP images are allowed." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: `Image must be under ${MAX_IMAGE_BYTES / 1024 / 1024} MB.` };
  }
  return { ok: true };
}
