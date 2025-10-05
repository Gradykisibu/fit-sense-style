import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Occasion, OccasionPicker } from '@/components/OccasionPicker';
import { getSuggestions, createTryOnJob } from '@/lib/api';
import { generateSampleSuggestions } from '@/lib/settings';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function Suggestions() {
  const [occasion, setOccasion] = useState<Occasion>('casual');
  const [palette, setPalette] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [useSampleData, setUseSampleData] = useState(false);
  const { toast } = useToast();
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      if (useSampleData) {
        const sampleData = generateSampleSuggestions();
        const filtered = sampleData.filter(s => {
          // Match occasion from items in OutfitSuggestion if available
          return true; // For now show all sample data
        });
        setItems(filtered.length > 0 ? filtered : sampleData.slice(0, 10));
      } else {
        setItems(await getSuggestions(occasion, palette || undefined));
      }
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e?.message });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [occasion, palette, useSampleData]);

  return (
    <main className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Outfit Suggestions</h1>
        <Button
          variant={useSampleData ? "default" : "outline"}
          onClick={() => setUseSampleData(!useSampleData)}
        >
          {useSampleData ? "Using Sample Data" : "Use Sample Data"}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <OccasionPicker value={occasion} onChange={setOccasion} />
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground" htmlFor="palette">Palette preference</label>
          <select id="palette" className="bg-background border rounded-md px-2 py-1 text-sm" value={palette} onChange={(e) => setPalette(e.target.value)}>
            <option value="">None</option>
            <option value="cool">Cool</option>
            <option value="warm">Warm</option>
            <option value="neutral">Neutral</option>
            <option value="monochrome">Monochrome</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-6">Loading…</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((sug) => (
            <Card key={sug.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>{sug.title}</span>
                  <Button size="sm" onClick={async () => {
                    const job = await createTryOnJob(sug.items);
                    toast({ title: 'Try‑On started', description: job.id });
                    nav(`/tryon?jobId=${job.id}`);
                  }}>Send to Try‑On</Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{sug.rationale}</p>
                <div className="flex flex-wrap gap-2">
                  {sug.items.map((it: any) => (
                    <span key={it.id} className="text-xs px-2 py-1 rounded-full border bg-card capitalize inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm border" style={{ backgroundColor: it.colorHex || '#ccc' }} /> {it.category}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
