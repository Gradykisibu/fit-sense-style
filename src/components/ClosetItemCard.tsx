import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageIcon } from 'lucide-react';
import { ClothingItem } from '@/lib/settings';
import { useSignedClosetUrl } from '@/lib/storage';

// Closet images are stored ONCE in the private "closet-items" bucket.
// We render them via short-lived signed URLs (cached in storage.ts) — we never
// regenerate or re-upload images just to display existing closet items.
export function ClosetItemCard({ item, onDelete }: { item: ClothingItem; onDelete?: (id: string) => void }) {
  const signed = useSignedClosetUrl(item.imageUrl);
  const [failed, setFailed] = useState(false);
  const showImage = signed && !failed;
  return (
    <Card className="overflow-hidden group">
      <div className="aspect-[4/3] bg-muted flex items-center justify-center">
        {showImage ? (
          <img
            src={signed}
            alt={`${item.category} ${item.brand || ''}`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground/50" aria-hidden />
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
