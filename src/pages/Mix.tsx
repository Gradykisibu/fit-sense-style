import React, { useMemo, useState } from 'react';
import { UploadCard } from '@/components/UploadCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyzeItems } from '@/lib/api';
import { ScoreBadge } from '@/components/ScoreBadge';
import { SuggestionList } from '@/components/SuggestionList';
import { Stepper } from '@/components/Stepper';
import { useToast } from '@/hooks/use-toast';

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
          <Card>
            <CardHeader><CardTitle>Suggested Swaps</CardTitle></CardHeader>
            <CardContent><SuggestionList items={result.suggestedSwaps || []} /></CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
