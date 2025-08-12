import React from 'react';
import { TryOnJob } from '@/lib/settings';

export function TryOnJobCard({ job }: { job: TryOnJob }) {
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium">Job {job.id}</div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-accent border">{job.status}</span>
      </div>
      {job.resultImageUrl ? (
        <img src={job.resultImageUrl} alt="try-on result" className="w-full rounded-md object-cover" loading="lazy" />
      ) : (
        <div className="text-sm text-muted-foreground">No result yet.</div>
      )}
    </div>
  );
}
