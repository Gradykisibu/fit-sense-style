import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UploadCard } from '@/components/UploadCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyzeItems, getCloset } from '@/lib/api';
import { ScoreBadge } from '@/components/ScoreBadge';
import { Stepper } from '@/components/Stepper';
import { ClosetItemCard } from '@/components/ClosetItemCard';
import { useToast } from '@/hooks/use-toast';
import {
  parseSuggestion,
  matchRequestsToCloset,
  type ClosetMatchResult,
  type RequestedClosetItem,
} from '@/lib/closetMatching';

const slots = [
  { key: 'hat', label: 'Hat (optional)', required: false },
  { key: 'top', label: 'Top (required)', required: true },
  { key: 'bottom', label: 'Bottom (required)', required: true },
  { key: 'socks', label: 'Socks (optional)', required: false },
  { key: 'shoes', label: 'Shoes (required)', required: true },
  { key: 'accessory', label: 'Accessory (optional)', required: false },
] as const;

type SlotKey = typeof slots[number]['key'];

export default function Mix() {
  const [files, setFiles] = useState<Record<SlotKey, { file: File; url: string } | undefined>>({} as any);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [aiPicking, setAiPicking] = useState(false);
  const [aiPick, setAiPick] = useState<ClosetMatchResult | null>(null);
  const { toast } = useToast();

  const canAnalyze = useMemo(() => ['top', 'bottom', 'shoes'].every((k) => !!files[k as SlotKey]), [files]);
  const stepIndex = useMemo(() => (result ? 2 : canAnalyze && Object.values(files).some(Boolean) ? 1 : 0), [canAnalyze, files, result]);

  const onAnalyze = async () => {
    if (!canAnalyze) return;
    setLoading(true);
    setResult(null);
    try {
      const catMap: Record<string, string> = { top: 't-shirt', bottom: 'pants' };
      const items = Object.entries(files)
        .filter(([, v]) => !!v)
        .map(([k, v]) => ({ imageUrl: v!.url, category: (catMap[k] || k) }));
      const r = await analyzeItems(items);
      setResult(r);
    } catch (e: any) {
      toast({ title: 'Analysis failed', description: e?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const onAiPickFromCloset = async () => {
    if (!result?.suggestedSwaps?.length) return;
    setAiPicking(true);
    setAiPick(null);
    try {
      const requests: RequestedClosetItem[] = result.suggestedSwaps
        .map((s: any) => parseSuggestion(typeof s === 'string' ? s : s.suggestion || ''))
        .filter(Boolean) as RequestedClosetItem[];

      if (!requests.length) {
        toast({ title: 'Nothing to match', description: "Couldn't read clothing items from the suggestions." });
        return;
      }

      const closet = await getCloset();
      if (!closet.length) {
        toast({
          title: 'Your closet is empty',
          description: 'Add items first so AI can build outfits from your wardrobe.',
        });
        setAiPick({ matched: [], missing: requests });
        return;
      }

      const match = matchRequestsToCloset(requests, closet);
      setAiPick(match);

      if (match.missing.length === 0) {
        toast({ title: 'Outfit ready', description: `Picked ${match.matched.length} item(s) from your closet.` });
      } else {
        toast({
          title: 'Some items missing',
          description: `Missing: ${match.missing.map((m) => m.name).join(', ')}`,
        });
      }
    } catch (e: any) {
      toast({ title: 'Could not pick from closet', description: e?.message || 'Please try again.' });
    } finally {
      setAiPicking(false);
    }
  };

  return (
    <main className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mix & Match</h1>
        <Stepper steps={["Select Items", "Analyzing", "Results"]} current={stepIndex} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {slots.map((s) => (
          <UploadCard
            key={s.key}
            label={s.label}
            onChange={(file, url) => setFiles((prev) => ({ ...prev, [s.key]: { file, url } }))}
            onClear={() => setFiles((prev) => ({ ...prev, [s.key]: undefined }))}
            previewUrl={files[s.key]?.url}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={onAnalyze} disabled={!canAnalyze || loading}>{loading ? 'Analyzing…' : 'Analyze Compatibility'}</Button>
      </div>

      {!result ? (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">Add at least a Top, Bottom, and Shoes, then run analysis.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <ScoreBadge score={result.overallScore} verdict={result.verdict} />
          <Card>
            <CardHeader><CardTitle>Comments</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 text-sm text-muted-foreground">
                {result.comments?.map((c: string, i: number) => (<li key={i}>{c}</li>))}
              </ul>
            </CardContent>
          </Card>
          {result.suggestedSwaps && result.suggestedSwaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>Suggested Swaps</span>
                  <Button size="sm" onClick={onAiPickFromCloset} disabled={aiPicking}>
                    {aiPicking ? 'Checking closet…' : 'Let AI pick from my closet'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {result.suggestedSwaps.map((swap: any, idx: number) => (
                    <li key={idx} className="text-sm">
                      {swap.suggestion || swap}
                    </li>
                  ))}
                </ul>

                {aiPick && aiPick.matched.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">AI-picked from your closet</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {aiPick.matched.map((m) => (
                        <div key={m.closetItem.id} className="space-y-1">
                          <ClosetItemCard item={m.closetItem} />
                          <p className="text-xs text-muted-foreground px-1">{m.matchReason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiPick && aiPick.missing.length > 0 && (
                  <div className="space-y-2 rounded-md border border-dashed p-4">
                    <h3 className="text-sm font-semibold">Items to add to your closet</h3>
                    <p className="text-sm text-muted-foreground">
                      I couldn't complete this outfit because your closet is missing:{' '}
                      {aiPick.missing.map((m) => m.name).join(', ')}.
                    </p>
                    <ul className="text-sm space-y-1 list-disc pl-5">
                      {aiPick.missing.map((m, i) => (
                        <li key={i}>
                          <span className="font-medium capitalize">{m.name}</span>
                          <span className="text-muted-foreground"> — {m.category}{m.color ? `, ${m.color}` : ''}</span>
                          {m.reason && <div className="text-xs text-muted-foreground">Why: {m.reason}</div>}
                        </li>
                      ))}
                    </ul>
                    <Button asChild size="sm" variant="secondary">
                      <Link to="/closet">Add missing items to closet</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </main>
  );
}
