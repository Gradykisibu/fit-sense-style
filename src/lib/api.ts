import { AppSettings, ClothingItem, OutfitAnalysis, OutfitSuggestion, TryOnJob, getMockCloset, getSettings, setMockCloset, getMockTryonJobs, setMockTryonJobs } from "./settings";

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function headers(settings: AppSettings) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': settings.apiKey || '',
  };
}

export async function analyzeOutfitImage(_file: File): Promise<OutfitAnalysis> {
  const s = getSettings();
  if (s.mockMode) {
    await sleep(900);
    return {
      overallScore: 78,
      verdict: 'okay',
      comments: ['Hat and shoes align in style; pants are slightly off‑palette.'],
      detectedItems: [
        { id: 'top1', category: 't-shirt', colorHex: '#F4D03F', colorName: 'Mustard', imageUrl: 'https://example.com/tshirt.jpg' },
        { id: 'pants1', category: 'pants', colorHex: '#1C2833', colorName: 'Charcoal', imageUrl: 'https://example.com/pants.jpg' },
        { id: 'shoes1', category: 'shoes', colorHex: '#FDFEFE', colorName: 'White', imageUrl: 'https://example.com/shoes.jpg' },
        { id: 'hat1', category: 'hat', colorHex: '#1B4F72', colorName: 'Navy', imageUrl: 'https://example.com/hat.jpg' },
      ],
      perItem: [
        { itemId: 'hat1', score: 85, issues: [], suggestions: [] },
        { itemId: 'pants1', score: 60, issues: ['too dark vs pastel top'], suggestions: ['try beige chinos'] },
      ],
      colorHarmony: {
        score: 74,
        palette: ['#F4D03F','#1C2833','#FDFEFE','#1B4F72'],
        rulesMatched: ['accent‑neutral'],
        clashes: ['charcoal pants heavy against mustard top'],
      },
      suggestedSwaps: [
        { replaceItemId: 'pants1', suggestion: 'Swap to beige chinos or light wash jeans.', exampleItem: { id: 'eg-pants', category: 'pants', colorHex: '#D6C9A3', colorName: 'Beige' } },
      ],
    };
  }

  const form = new FormData();
  form.append('image', _file);
  const res = await fetch(`${s.apiBaseUrl}/v1/analyze/outfit-image`, {
    method: 'POST',
    headers: { 'x-api-key': s.apiKey || '' },
    body: form,
  });
  if (!res.ok) throw new Error('Failed to analyze outfit image');
  return res.json();
}

export async function analyzeItems(items: { imageUrl: string; category: string }[]): Promise<OutfitAnalysis> {
  const s = getSettings();
  if (s.mockMode) {
    await sleep(900);
    return {
      overallScore: 82,
      verdict: 'great',
      comments: ['Sporty casual combo with good contrast.'],
      detectedItems: [],
      perItem: [
        { itemId: 'top', score: 84, issues: [], suggestions: [] },
        { itemId: 'pants', score: 79, issues: [], suggestions: [] },
        { itemId: 'shoes', score: 88, issues: [], suggestions: [] },
      ],
      colorHarmony: { score: 80, palette: ['#2E86AB','#EAF2F8','#2ECC71'], rulesMatched: ['complementary'], clashes: [] },
      suggestedSwaps: [],
    };
  }
  const res = await fetch(`${s.apiBaseUrl}/v1/analyze/items`, { method: 'POST', headers: headers(s), body: JSON.stringify({ items }) });
  if (!res.ok) throw new Error('Failed to analyze items');
  return res.json();
}

export async function getCloset(): Promise<ClothingItem[]> {
  const s = getSettings();
  if (s.mockMode) {
    await sleep(500);
    return getMockCloset();
  }
  const res = await fetch(`${s.apiBaseUrl}/v1/closet/items`, { headers: headers(s) });
  if (!res.ok) throw new Error('Failed to load closet');
  return res.json();
}

export async function addClosetItem(item: ClothingItem): Promise<void> {
  const s = getSettings();
  if (s.mockMode) {
    await sleep(400);
    const list = getMockCloset();
    setMockCloset([item, ...list]);
    return;
  }
  const res = await fetch(`${s.apiBaseUrl}/v1/closet/items`, { method: 'POST', headers: headers(s), body: JSON.stringify(item) });
  if (!res.ok) throw new Error('Failed to add item');
}

export async function deleteClosetItem(id: string): Promise<void> {
  const s = getSettings();
  if (s.mockMode) {
    await sleep(300);
    const list = getMockCloset();
    setMockCloset(list.filter((i) => i.id !== id));
    return;
  }
  const res = await fetch(`${s.apiBaseUrl}/v1/closet/items?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers(s) });
  if (!res.ok) throw new Error('Failed to delete item');
}

export async function getSuggestions(occasion: string, palette?: string, limit: number = 5): Promise<OutfitSuggestion[]> {
  const s = getSettings();
  if (s.mockMode) {
    await sleep(600);
    return [
      {
        id: 'sug1',
        title: 'Smart Casual – Navy + Beige',
        rationale: 'Balanced contrast; versatile for daytime meetings.',
        items: [
          { id: 'top-navy', category: 'jacket', colorHex: '#1B4F72', colorName: 'Navy' },
          { id: 'shirt-white', category: 'shirt', colorHex: '#FDFEFE', colorName: 'White' },
          { id: 'pants-beige', category: 'pants', colorHex: '#D6C9A3', colorName: 'Beige' },
          { id: 'shoes-brown', category: 'shoes', colorHex: '#6E2C00', colorName: 'Brown' },
        ],
      },
    ];
  }
  const url = new URL(`${s.apiBaseUrl}/v1/suggestions/outfits`);
  url.searchParams.set('occasion', occasion);
  if (palette) url.searchParams.set('palette', palette);
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url.toString(), { headers: headers(s) });
  if (!res.ok) throw new Error('Failed to get suggestions');
  return res.json();
}

export async function createTryOnJob(items: ClothingItem[]): Promise<TryOnJob> {
  const s = getSettings();
  if (s.mockMode) {
    await sleep(400);
    const job: TryOnJob = { id: `job_${Date.now()}`, status: 'queued', resultImageUrl: null };
    const jobs = getMockTryonJobs();
    setMockTryonJobs([job, ...jobs]);
    // simulate processing to done in background
    setTimeout(() => {
      const cur = getMockTryonJobs();
      const idx = cur.findIndex((j) => j.id === job.id);
      if (idx >= 0) {
        cur[idx] = { ...cur[idx], status: 'done', resultImageUrl: 'https://example.com/tryon/result.jpg' };
        setMockTryonJobs(cur);
      }
    }, 2500);
    return job;
  }
  const res = await fetch(`${s.apiBaseUrl}/v1/tryon/jobs`, { method: 'POST', headers: headers(s), body: JSON.stringify({ items }) });
  if (!res.ok) throw new Error('Failed to create try-on job');
  return res.json();
}

export async function getTryOnJob(id: string): Promise<TryOnJob> {
  const s = getSettings();
  if (s.mockMode) {
    await sleep(500);
    const cur = getMockTryonJobs();
    const found = cur.find((j) => j.id === id);
    return found || { id, status: 'processing', resultImageUrl: null };
  }
  const res = await fetch(`${s.apiBaseUrl}/v1/tryon/jobs/${id}`, { headers: headers(s) });
  if (!res.ok) throw new Error('Failed to get job');
  return res.json();
}

export async function testConnection(): Promise<boolean> {
  try {
    await getCloset();
    return true;
  } catch {
    return false;
  }
}
