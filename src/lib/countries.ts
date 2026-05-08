// Single source of truth for supported countries.
// Mirror this list in supabase/functions/_shared/usage.ts (SUPPORTED_COUNTRIES).
export const SUPPORTED_COUNTRIES = ["ZA", "US", "GB", "CA", "FR"] as const;
export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];

export const SUPPORTED_COUNTRY_NAMES: Record<SupportedCountry, string> = {
  ZA: "South Africa",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  FR: "France",
};

export function isSupportedCountry(code?: string | null): code is SupportedCountry {
  if (!code) return false;
  return (SUPPORTED_COUNTRIES as readonly string[]).includes(code.toUpperCase());
}
