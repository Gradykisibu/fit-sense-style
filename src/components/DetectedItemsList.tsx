import React from 'react';
import { ClothingItem } from '@/lib/settings';

export function DetectedItemsList({ items }: { items: ClothingItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-full overflow-hidden">
      {items.map((it) => (
        <div
          key={it.id}
          className="w-full max-w-full rounded-md border bg-card p-3 overflow-hidden"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="h-8 w-8 shrink-0 rounded-md border"
              style={{ backgroundColor: it.colorHex || '#ccc' }}
              aria-label={`${it.colorName || it.colorHex} swatch`}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium break-words">{it.category}</div>
              <div className="text-xs text-muted-foreground break-words whitespace-normal">
                {it.colorName || it.colorHex}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
