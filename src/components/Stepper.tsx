import React from 'react';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-3 text-sm" aria-label="progress">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={`h-6 w-6 rounded-full border inline-flex items-center justify-center ${i <= current ? 'bg-accent' : 'bg-background'}`}>{i + 1}</span>
          <span className={`${i === current ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
          {i < steps.length - 1 && <span className="w-8 h-px bg-border" />}
        </li>
      ))}
    </ol>
  );
}
