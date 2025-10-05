import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTryOnJob } from '@/lib/api';
import { TryOnJob, generateSampleTryOnJobs } from '@/lib/settings';
import { TryOnJobCard } from '@/components/TryOnJobCard';
import { Card, CardContent } from '@/components/ui/card';

export default function TryOn() {
  const [search] = useSearchParams();
  const jobId = search.get('jobId');
  const [job, setJob] = useState<TryOnJob | null>(null);
  const [sampleJobs, setSampleJobs] = useState<TryOnJob[]>([]);

  useEffect(() => {
    let timer: any;
    const poll = async () => {
      if (!jobId) {
        // Load sample data if no jobId
        const samples = generateSampleTryOnJobs();
        setSampleJobs(samples);
        return;
      }
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
      <h1 className="text-2xl font-bold">Try‑On Gallery</h1>
      
      {jobId && job ? (
        <TryOnJobCard job={job} />
      ) : jobId && !job ? (
        <Card><CardContent className="p-6">Loading…</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              Browse sample try-on results below or create a new try-on from the Suggestions page.
            </CardContent>
          </Card>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sampleJobs.map((sampleJob) => (
              <TryOnJobCard key={sampleJob.id} job={sampleJob} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
