import React from 'react';
import { ClothingItem } from '@/lib/settings';

export function DetectedItemsList({ items }: { items: ClothingItem[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-3 p-3 rounded-md border bg-card">
          <div className="h-6 w-6 rounded-md border" style={{ backgroundColor: it.colorHex || '#ccc' }} aria-label={`${it.colorName || it.colorHex} swatch`} />
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{it.category}</div>
            <div className="text-xs text-muted-foreground truncate">{it.colorName || it.colorHex}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
