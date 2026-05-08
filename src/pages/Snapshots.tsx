import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getSnapshots } from '@/lib/settings';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';

const SNAPSHOTS_KEY = 'fitsense_snapshots_v1';

export default function Snapshots() {
  const [snapshots, setSnapshots] = React.useState<any[]>([]);
  const [selectedPreview, setSelectedPreview] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = () => {
    const data = getSnapshots();
    setSnapshots(data);
  };

  const deleteSnapshot = (index: number) => {
    const updated = snapshots.filter((_, i) => i !== index);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
    setSnapshots(updated);
    toast({ title: 'Snapshot deleted' });
  };

  const clearAll = () => {
    localStorage.removeItem(SNAPSHOTS_KEY);
    setSnapshots([]);
    toast({ title: 'All snapshots cleared' });
  };

  if (snapshots.length === 0) {
    return (
      <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <h1 className="mb-6 text-xl font-bold sm:text-2xl">Saved Snapshots</h1>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No snapshots saved yet. Save an outfit analysis from the Check screen to see it here.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Saved Snapshots</h1>
        <Button variant="outline" onClick={clearAll} className="w-full sm:w-auto">
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 sm:gap-6">
        {snapshots.map((snap, index) => (
          <Card key={index} className="overflow-hidden">
            {snap.preview && (
              <button
                type="button"
                className="flex h-[22rem] w-full items-center justify-center bg-muted p-2 sm:h-[28rem] lg:h-[32rem] xl:h-[30rem]"
                onClick={() => setSelectedPreview(snap.preview)}
              >
                <img
                  src={snap.preview}
                  alt="Outfit preview"
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </button>
            )}
            <CardHeader className="p-4">
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span className="min-w-0 truncate">Score: {snap.result?.overallScore || 'N/A'}</span>
                <Button size="icon" variant="ghost" onClick={() => deleteSnapshot(index)} aria-label="Delete snapshot">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Verdict:</strong> {snap.result?.verdict || 'N/A'}
                </div>
                {snap.result?.comments && (
                  <div>
                    <strong>Comments:</strong>
                    <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                      {snap.result.comments.slice(0, 2).map((c: string, i: number) => (
                        <li key={i} className="break-words">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedPreview} onOpenChange={(open) => !open && setSelectedPreview(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-6xl p-3 sm:p-4">
          <DialogHeader>
            <DialogTitle>Snapshot Preview</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[80vh] min-h-[50vh] items-center justify-center overflow-auto rounded-md bg-muted p-2">
            {selectedPreview && (
              <img
                src={selectedPreview}
                alt="Full snapshot preview"
                className="max-h-[76vh] max-w-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
