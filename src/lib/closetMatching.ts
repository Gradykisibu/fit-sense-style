import { ClothingItem } from "./settings";

/** A normalized clothing need extracted from an AI suggested swap. */
export type RequestedClosetItem = {
  name: string;
  category: string;
  color?: string;
  styleKeywords?: string[];
  reason?: string;
};

/** A successful pairing of a request to a real closet item. */
export type MatchedClosetItem = {
  requested: RequestedClosetItem;
  closetItem: ClothingItem;
  matchReason: string;
};

/** Result of attempting to fulfill all requested items from the closet. */
export type ClosetMatchResult = {
  matched: MatchedClosetItem[];
  missing: RequestedClosetItem[];
};

// Aliases → canonical category. Keep keys lowercase.
const CATEGORY_ALIASES: Record<string, string> = {
  beanie: "hat",
  cap: "hat",
  hat: "hat",
  sneakers: "shoes",
  trainers: "shoes",
  boots: "shoes",
  loafers: "shoes",
  heels: "shoes",
  sandals: "shoes",
  shoe: "shoes",
  shoes: "shoes",
  trousers: "pants",
  jeans: "pants",
  chinos: "pants",
  slacks: "pants",
  pants: "pants",
  pant: "pants",
  shorts: "shorts",
  skirt: "skirt",
  dress: "dress",
  hoodie: "hoodie",
  sweatshirt: "hoodie",
  jacket: "jacket",
  blazer: "jacket",
  coat: "jacket",
  parka: "jacket",
  outerwear: "jacket",
  shirt: "shirt",
  blouse: "blouse",
  tee: "t-shirt",
  "t-shirt": "t-shirt",
  tshirt: "t-shirt",
  top: "top",
  socks: "socks",
  sock: "socks",
  belt: "belt",
  bag: "bag",
  purse: "bag",
  handbag: "bag",
  accessory: "accessory",
  watch: "accessory",
  scarf: "accessory",
  tie: "accessory",
};

const COLOR_WORDS = [
  "black", "white", "grey", "gray", "navy", "blue", "red", "green", "olive",
  "beige", "cream", "tan", "brown", "camel", "khaki", "yellow", "orange",
  "pink", "purple", "burgundy", "maroon", "teal", "denim", "charcoal", "ivory",
];

const STYLE_WORDS = [
  "relaxed", "slim", "fitted", "oversized", "cropped", "leather", "linen",
  "cotton", "wool", "knit", "graphic", "plain", "patterned", "striped",
  "checkered", "vintage", "minimal", "casual", "formal", "smart", "athletic",
];

function normalizeCategory(token: string): string | undefined {
  const k = token.toLowerCase().replace(/[^a-z-]/g, "");
  return CATEGORY_ALIASES[k];
}

/** Parse a free-text AI suggestion into a structured request. Best-effort. */
export function parseSuggestion(text: string, replaceItemId?: string): RequestedClosetItem | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  const tokens = lower.split(/[^a-z-]+/).filter(Boolean);

  let category: string | undefined;
  for (const t of tokens) {
    const c = normalizeCategory(t);
    if (c) { category = c; break; }
  }
  if (!category) return null;

  const color = COLOR_WORDS.find((c) => lower.includes(c));
  const styleKeywords = STYLE_WORDS.filter((s) => lower.includes(s));

  const name = [color, ...styleKeywords, category].filter(Boolean).join(" ");
  return {
    name: name || category,
    category,
    color,
    styleKeywords,
    reason: text,
  };
}

function categoryMatches(requested: string, item: ClothingItem): boolean {
  const itemCat = normalizeCategory(item.category) || item.category.toLowerCase();
  if (itemCat === requested) return true;
  // "top" is broad — accept t-shirt/shirt/blouse/hoodie as tops
  if (requested === "top" && ["t-shirt", "shirt", "blouse", "hoodie"].includes(itemCat)) return true;
  return false;
}

function colorScore(requestedColor: string | undefined, item: ClothingItem): number {
  if (!requestedColor) return 0;
  const hay = `${item.colorName || ""} ${item.colorHex || ""}`.toLowerCase();
  return hay.includes(requestedColor) ? 2 : 0;
}

function styleScore(keywords: string[] | undefined, item: ClothingItem): number {
  if (!keywords || !keywords.length) return 0;
  const hay = `${item.brand || ""} ${item.colorName || ""} ${(item as any).pattern || ""}`.toLowerCase();
  let s = 0;
  for (const k of keywords) if (hay.includes(k)) s += 1;
  return s;
}

/** Find the best closet item for a request. Returns undefined if none match by category. */
export function findBestMatch(
  request: RequestedClosetItem,
  closet: ClothingItem[],
  excludeIds: Set<string>,
): MatchedClosetItem | undefined {
  const candidates = closet.filter((c) => !excludeIds.has(c.id) && categoryMatches(request.category, c));
  if (!candidates.length) return undefined;

  let best: { item: ClothingItem; score: number; reason: string } | undefined;
  for (const item of candidates) {
    const cs = colorScore(request.color, item);
    const ss = styleScore(request.styleKeywords, item);
    const total = cs + ss;
    if (!best || total > best.score) {
      const reasonParts: string[] = [`Matches category "${request.category}"`];
      if (cs) reasonParts.push(`color "${request.color}"`);
      if (ss) reasonParts.push(`style (${request.styleKeywords?.join(", ")})`);
      best = { item, score: total, reason: reasonParts.join(", ") };
    }
  }
  if (!best) return undefined;
  return { requested: request, closetItem: best.item, matchReason: best.reason };
}

/** Match an array of requests against the user's closet. Each closet item is used at most once. */
export function matchRequestsToCloset(
  requests: RequestedClosetItem[],
  closet: ClothingItem[],
): ClosetMatchResult {
  const used = new Set<string>();
  const matched: MatchedClosetItem[] = [];
  const missing: RequestedClosetItem[] = [];
  for (const r of requests) {
    const m = findBestMatch(r, closet, used);
    if (m) {
      used.add(m.closetItem.id);
      matched.push(m);
    } else {
      missing.push(r);
    }
  }
  return { matched, missing };
}
