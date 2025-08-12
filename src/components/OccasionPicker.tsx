import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const OCCASIONS = [
  { value: 'casual', label: 'Casual' },
  { value: 'smart_casual', label: 'Smart Casual' },
  { value: 'business', label: 'Business' },
  { value: 'formal', label: 'Formal' },
  { value: 'date', label: 'Date' },
  { value: 'party', label: 'Party' },
] as const;

export type Occasion = typeof OCCASIONS[number]['value'];

export function OccasionPicker({ value, onChange }: { value: Occasion; onChange: (v: Occasion) => void }) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v as Occasion)} className="flex flex-wrap gap-2">
      {OCCASIONS.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} aria-label={o.label} className="data-[state=on]:bg-accent data-[state=on]:text-foreground">
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
