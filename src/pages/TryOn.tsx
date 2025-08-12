import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTryOnJob } from '@/lib/api';
import { TryOnJob } from '@/lib/settings';
import { TryOnJobCard } from '@/components/TryOnJobCard';
import { Card, CardContent } from '@/components/ui/card';

export default function TryOn() {
  const [search] = useSearchParams();
  const jobId = search.get('jobId');
  const [job, setJob] = useState<TryOnJob | null>(null);

  useEffect(() => {
    let timer: any;
    const poll = async () => {
      if (!jobId) return;
      const j = await getTryOnJob(jobId);
      setJob(j);
      if (j.status !== 'done' && j.status !== 'failed') {
        timer = setTimeout(poll, 3000);
      }
    };
    poll();
    return () => clearTimeout(timer);
  }, [jobId]);

  return (
    <main className="container mx-auto px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Try‑On</h1>
      {!jobId ? (
        <Card><CardContent className="p-6 text-muted-foreground">No job selected. Start from Suggestions to create a try‑on.</CardContent></Card>
      ) : job ? (
        <TryOnJobCard job={job} />
      ) : (
        <Card><CardContent className="p-6">Loading…</CardContent></Card>
      )}
    </main>
  );
}
