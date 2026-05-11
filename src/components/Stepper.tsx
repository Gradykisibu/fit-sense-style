import React from 'react';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm w-full sm:w-auto"
      aria-label="progress"
    >
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span
            className={`h-5 w-5 sm:h-6 sm:w-6 shrink-0 rounded-full border inline-flex items-center justify-center text-[10px] sm:text-xs ${
              i <= current ? 'bg-accent' : 'bg-background'
            }`}
          >
            {i + 1}
          </span>
          <span
            className={`truncate ${i === current ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            {s}
          </span>
          {i < steps.length - 1 && <span className="hidden sm:inline-block w-6 h-px bg-border" />}
        </li>
      ))}
    </ol>
  );
}
