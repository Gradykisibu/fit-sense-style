import React, { useMemo, useState } from 'react';
import { UploadCard } from '@/components/UploadCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyzeOutfitImage } from '@/lib/api';
import { ScoreBadge } from '@/components/ScoreBadge';
import { DetectedItemsList } from '@/components/DetectedItemsList';
import { SuggestionList } from '@/components/SuggestionList';
import { Stepper } from '@/components/Stepper';
import { useToast } from '@/hooks/use-toast';
import { saveSnapshot } from '@/lib/settings';

export default function Check() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const { toast } = useToast();

  const stepIndex = useMemo(() => (result ? 2 : file ? 1 : 0), [file, result]);

  const onAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await analyzeOutfitImage(file);
      setResult(r);
    } catch (e: any) {
      toast({ title: 'Analysis failed', description: e?.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Outfit Check</h1>
        <Stepper steps={["Upload", "Analyzing", "Results"]} current={stepIndex} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <UploadCard
            label="Drop a full‑body photo or tap to upload/capture"
            capture="environment"
            onChange={(f, url) => { setFile(f); setPreview(url); }}
            onClear={() => { setFile(null); setPreview(undefined); setResult(null); }}
            previewUrl={preview}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={onAnalyze} disabled={!file || loading} className="w-full sm:w-auto">
              {loading ? 'Analyzing…' : 'Analyze Outfit'}
            </Button>
            {result && (
              <Button variant="secondary" onClick={() => { saveSnapshot({ type: 'outfit', preview, result }); toast({ title: 'Saved snapshot' }); }} className="w-full sm:w-auto">
                Save Snapshot
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {!result ? (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">Upload a photo and run analysis to see your style score and tips.</CardContent>
            </Card>
          ) : (
            <>
              <ScoreBadge score={result.overallScore} verdict={result.verdict} />
              {result.comments && result.comments.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Style Feedback</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.comments.map((comment: string, idx: number) => (
                        <li key={idx} className="text-sm">{comment}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader><CardTitle>Detected Items</CardTitle></CardHeader>
                <CardContent><DetectedItemsList items={result.detectedItems || []} /></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Color Palette</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.colorHarmony?.palette?.map((hex: string) => (
                      <div key={hex} className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-md border" style={{ backgroundColor: hex }} title={hex} />
                        <span className="text-sm text-muted-foreground">{hex}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Suggested Swaps</CardTitle></CardHeader>
                <CardContent><SuggestionList items={result.suggestedSwaps || []} imageType="full" /></CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
