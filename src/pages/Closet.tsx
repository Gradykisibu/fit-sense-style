import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClosetItemCard } from '@/components/ClosetItemCard';
import { addClosetItem, clearCloset, deleteClosetItem, getCloset } from '@/lib/api';
import { ClothingItem } from '@/lib/settings';
import { useSignedClosetUrl } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2 } from 'lucide-react';

const CATEGORIES: ClothingItem['category'][] = ['hat','t-shirt','shirt','hoodie','jacket','dress','skirt','pants','shorts','socks','shoes','belt','bag','accessory'];

export default function Closet() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{imageUrl?: string; category?: ClothingItem['category']; colorHex?: string; brand?: string}>({});
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { toast } = useToast();
  const previewUrl = useSignedClosetUrl(form.imageUrl);

  const load = async () => {
    setLoading(true);
    try { setItems(await getCloset()); } catch (e: any) { toast({ title: 'Failed to load closet', description: e?.message }); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { validateImageFile } = await import('@/lib/uploads');
    const v = validateImageFile(file);
    if (!v.ok) {
      toast({ title: 'Invalid file', description: (v as { reason: string }).reason, variant: 'destructive' });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Not signed in', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('closet-items')
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      // Bucket is private — store the path; UI resolves via signed URLs.
      setForm(f => ({ ...f, imageUrl: filePath }));
      toast({ title: 'Image uploaded successfully' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const onAdd = async () => {
    if (!form.category || !form.imageUrl) {
      toast({ title: 'Missing fields', description: 'Please provide an image and category', variant: 'destructive' });
      return;
    }
    const item: ClothingItem = { id: `closet_${Date.now()}`, category: form.category, colorHex: form.colorHex, brand: form.brand, imageUrl: form.imageUrl } as any;
    try { 
      await addClosetItem(item); 
      toast({ title: 'Item added' }); 
      setOpen(false); 
      setForm({}); 
      load(); 
    } catch (e: any) { 
      toast({ title: 'Failed to add', description: e?.message, variant: 'destructive' }); 
    }
  };

  const onDelete = async (id: string) => {
    try { await deleteClosetItem(id); toast({ title: 'Deleted' }); load(); } catch (e: any) { toast({ title: 'Failed to delete', description: e?.message }); }
  };

  const onClearCloset = async () => {
    setClearing(true);
    try {
      const { deletedCount } = await clearCloset();
      setItems([]);
      toast({
        title: 'Closet cleared',
        description: `Deleted ${deletedCount} closet item${deletedCount === 1 ? '' : 's'}.`,
      });
    } catch (e: any) {
      toast({
        title: 'Failed to clear closet',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">My Closet</h1>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={loading || items.length === 0 || clearing} className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Closet
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear your closet?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {items.length} closet item{items.length === 1 ? '' : 's'} and their uploaded images. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClearCloset} disabled={clearing}>
                  {clearing ? 'Clearing...' : 'Clear Closet'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">Add Item</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Closet Item</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>Upload Image</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                  {previewUrl && (
                    <div className="relative w-full h-32 border rounded-md overflow-hidden">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as any }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Color</Label>
                <Input type="color" value={form.colorHex || '#888888'} onChange={(e) => setForm((f) => ({ ...f, colorHex: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Brand</Label>
                <Input placeholder="Nike" value={form.brand || ''} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => { setOpen(false); setForm({}); }}>Cancel</Button>
                <Button onClick={onAdd} disabled={uploading || !form.imageUrl}>Add</Button>
              </div>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-6">Loading…</CardContent></Card>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>Empty closet</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground">Add items to organize your wardrobe digitally.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((it) => (<ClosetItemCard key={it.id} item={it} onDelete={onDelete} />))}
        </div>
      )}
    </main>
  );
}
