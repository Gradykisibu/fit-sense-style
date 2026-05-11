import React from 'react';

export const verdictLabel: Record<'poor' | 'okay' | 'good' | 'great' | 'perfect', string> = {
  poor: 'Poor',
  okay: 'Okay',
  good: 'Good',
  great: 'Great',
  perfect: 'Perfect',
};

export function ScoreBadge({ score, verdict }: { score: number; verdict: 'poor' | 'okay' | 'good' | 'great' | 'perfect' }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border bg-card shadow-soft w-full max-w-full">
      <div className="text-3xl font-extrabold tabular-nums shrink-0" aria-label={`Score ${score}`}>{score}</div>
      <div className="text-sm min-w-0 flex-1">
        <div className="text-muted-foreground">Overall</div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-foreground">Style Score</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-accent text-foreground border">{verdictLabel[verdict] || verdict}</span>
        </div>
      </div>
    </div>
  );
}
