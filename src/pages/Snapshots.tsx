import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSnapshots } from '@/lib/settings';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';

export default function Snapshots() {
  const [snapshots, setSnapshots] = React.useState<any[]>([]);
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
    localStorage.setItem('snapshots', JSON.stringify(updated));
    setSnapshots(updated);
    toast({ title: 'Snapshot deleted' });
  };

  const clearAll = () => {
    localStorage.removeItem('snapshots');
    setSnapshots([]);
    toast({ title: 'All snapshots cleared' });
  };

  if (snapshots.length === 0) {
    return (
      <main className="container mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Saved Snapshots</h1>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No snapshots saved yet. Save an outfit analysis from the Check screen to see it here.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Saved Snapshots</h1>
        <Button variant="outline" onClick={clearAll}>
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {snapshots.map((snap, index) => (
          <Card key={index} className="overflow-hidden">
            {snap.preview && (
              <div className="aspect-video bg-muted">
                <img src={snap.preview} alt="Outfit preview" className="w-full h-full object-cover" />
              </div>
            )}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Score: {snap.result?.overallScore || 'N/A'}</span>
                <Button size="sm" variant="ghost" onClick={() => deleteSnapshot(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Verdict:</strong> {snap.result?.verdict || 'N/A'}
                </div>
                {snap.result?.comments && (
                  <div>
                    <strong>Comments:</strong>
                    <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                      {snap.result.comments.slice(0, 2).map((c: string, i: number) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
