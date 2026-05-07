import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClothingItem } from '@/lib/settings';

export function ClosetItemCard({ item, onDelete }: { item: ClothingItem; onDelete?: (id: string) => void }) {
  return (
    <Card className="overflow-hidden group">
      <div className="aspect-[4/3] bg-muted">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={`${item.category} ${item.brand || ''}`} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full" />
        )}
      </div>
      <CardHeader className="p-3">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="truncate capitalize">{item.category}</span>
          {onDelete && (
            <Button size="sm" variant="secondary" onClick={() => onDelete(item.id)}>Delete</Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm border" style={{ backgroundColor: item.colorHex || '#ccc' }} />
          <span className="truncate">{item.colorName || item.colorHex || '—'}</span>
        </div>
        {item.brand && <div className="truncate">{item.brand}</div>}
      </CardContent>
    </Card>
  );
}
