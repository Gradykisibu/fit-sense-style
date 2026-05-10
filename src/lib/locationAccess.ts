import { SUPPORTED_COUNTRIES, SUPPORTED_COUNTRY_NAMES, SupportedCountry } from '@/lib/countries';

type Bounds = {
  code: SupportedCountry;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

export type LocationAccessResult =
  | { allowed: true; country: SupportedCountry; label: string }
  | { allowed: false; reason: string; country?: string };

const DEVICE_LOCATION_CACHE_KEY = 'fitsense_device_location_check_v1';
const CACHE_TTL_MS = 10 * 60 * 1000;

const COUNTRY_BOUNDS: Bounds[] = [
  { code: 'ZA', minLat: -35.0, maxLat: -22.0, minLon: 16.0, maxLon: 33.5 },
  { code: 'US', minLat: 24.0, maxLat: 50.0, minLon: -126.0, maxLon: -66.0 },
  { code: 'US', minLat: 51.0, maxLat: 72.0, minLon: -180.0, maxLon: -129.0 },
  { code: 'US', minLat: 18.5, maxLat: 23.0, minLon: -161.0, maxLon: -154.0 },
  { code: 'GB', minLat: 49.5, maxLat: 61.0, minLon: -9.5, maxLon: 2.5 },
  { code: 'CA', minLat: 41.0, maxLat: 84.0, minLon: -142.0, maxLon: -52.0 },
  { code: 'FR', minLat: 41.0, maxLat: 52.0, minLon: -5.5, maxLon: 10.0 },
];

export function getCachedLocationAccess(): LocationAccessResult | null {
  try {
    const raw = sessionStorage.getItem(DEVICE_LOCATION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { result: LocationAccessResult; expiresAt: number };
    if (parsed.expiresAt > Date.now()) return parsed.result;
  } catch {
    return null;
  }
  return null;
}

function setCachedLocationResult(result: LocationAccessResult) {
  sessionStorage.setItem(
    DEVICE_LOCATION_CACHE_KEY,
    JSON.stringify({ result, expiresAt: Date.now() + CACHE_TTL_MS }),
  );
}

function countryFromCoordinates(latitude: number, longitude: number): SupportedCountry | null {
  const match = COUNTRY_BOUNDS.find(
    (bounds) =>
      latitude >= bounds.minLat &&
      latitude <= bounds.maxLat &&
      longitude >= bounds.minLon &&
      longitude <= bounds.maxLon,
  );
  return match?.code ?? null;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Device location is not available in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 5 * 60 * 1000,
      timeout: 12_000,
    });
  });
}

export function supportedCountryListText() {
  return SUPPORTED_COUNTRIES.map((code) => SUPPORTED_COUNTRY_NAMES[code]).join(', ');
}

export async function checkDeviceLocationAccess(force = false): Promise<LocationAccessResult> {
  if (!force) {
    const cached = getCachedLocationAccess();
    if (cached) return cached;
  }

  try {
    const position = await getCurrentPosition();
    const country = countryFromCoordinates(
      position.coords.latitude,
      position.coords.longitude,
    );

    const result: LocationAccessResult = country
      ? { allowed: true, country, label: SUPPORTED_COUNTRY_NAMES[country] }
      : {
          allowed: false,
          reason: `FitSense Style is only available in ${supportedCountryListText()}.`,
        };

    setCachedLocationResult(result);
    return result;
  } catch (error: any) {
    const result: LocationAccessResult = {
      allowed: false,
      reason:
        error?.code === 1
          ? 'Location permission is required to use FitSense Style.'
          : error?.message || 'Could not verify your device location.',
    };
    setCachedLocationResult(result);
    return result;
  }
}

export async function requireSupportedDeviceLocation(): Promise<SupportedCountry> {
  const result = await checkDeviceLocationAccess(true);
  if (!result.allowed) throw new Error(result.reason);
  return result.country;
}
