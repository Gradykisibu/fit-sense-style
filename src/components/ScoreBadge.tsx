import React from 'react';

export const verdictLabel: Record<'great' | 'okay' | 'revise', string> = {
  great: 'Great',
  okay: 'Okay',
  revise: 'Revise',
};

export function ScoreBadge({ score, verdict }: { score: number; verdict: 'great' | 'okay' | 'revise' }) {
  return (
    <div className="inline-flex items-center gap-3 p-4 rounded-lg border bg-card shadow-soft">
      <div className="text-3xl font-extrabold tabular-nums" aria-label={`Score ${score}`}>{score}</div>
      <div className="text-sm">
        <div className="text-muted-foreground">Overall</div>
        <div className="inline-flex items-center gap-2">
          <span className="text-foreground">Style Score</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-accent text-foreground border">{verdictLabel[verdict]}</span>
        </div>
      </div>
    </div>
  );
}
