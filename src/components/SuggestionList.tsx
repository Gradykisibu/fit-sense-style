import React from 'react';

export function SuggestionList({ items }: { items: { replaceItemId: string; suggestion: string }[] }) {
  if (!items?.length) return <div className="text-sm text-muted-foreground">No swaps suggested. Looking good!</div>;
  return (
    <ul className="space-y-2">
      {items.map((s, i) => (
        <li key={`${s.replaceItemId}-${i}`} className="p-3 rounded-md border bg-card">
          <span className="text-sm">{s.suggestion}</span>
        </li>
      ))}
    </ul>
  );
}
