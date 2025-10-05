import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClosetItemCard } from '@/components/ClosetItemCard';
import { addClosetItem, deleteClosetItem, getCloset } from '@/lib/api';
import { ClothingItem, generateSampleClosetData, setMockCloset } from '@/lib/settings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload } from 'lucide-react';

const CATEGORIES: ClothingItem['category'][] = ['hat','t-shirt','shirt','hoodie','jacket','dress','skirt','pants','shorts','socks','shoes','belt','bag','accessory'];

export default function Closet() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{imageUrl?: string; category?: ClothingItem['category']; colorHex?: string; brand?: string}>({});
  const [uploading, setUploading] = useState(false);
  const [uploadTab, setUploadTab] = useState<'url' | 'file'>('url');
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setItems(await getCloset()); } catch (e: any) { toast({ title: 'Failed to load closet', description: e?.message }); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('closet-items')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('closet-items')
        .getPublicUrl(filePath);

      setForm(f => ({ ...f, imageUrl: publicUrl }));
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
      setUploadTab('url');
      load(); 
    } catch (e: any) { 
      toast({ title: 'Failed to add', description: e?.message, variant: 'destructive' }); 
    }
  };

  const onDelete = async (id: string) => {
    try { await deleteClosetItem(id); toast({ title: 'Deleted' }); load(); } catch (e: any) { toast({ title: 'Failed to delete', description: e?.message }); }
  };

  const addSampleData = () => {
    const sampleItems = generateSampleClosetData();
    setMockCloset(sampleItems);
    setItems(sampleItems);
    toast({ title: 'Added 20 sample items', description: 'Your closet now has example data for testing.' });
  };

  return (
    <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">My Closet</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addSampleData}>Add Sample Data</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add Item</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Closet Item</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <Tabs value={uploadTab} onValueChange={(v) => setUploadTab(v as 'url' | 'file')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url">Image URL</TabsTrigger>
                  <TabsTrigger value="file">Upload File</TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="space-y-2">
                  <Label>Image URL</Label>
                  <Input 
                    placeholder="https://..." 
                    value={form.imageUrl || ''} 
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} 
                  />
                </TabsContent>
                <TabsContent value="file" className="space-y-2">
                  <Label>Upload Image</Label>
                  <div className="flex flex-col gap-2">
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                    {form.imageUrl && uploadTab === 'file' && (
                      <div className="relative w-full h-32 border rounded-md overflow-hidden">
                        <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
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
                <Button variant="secondary" onClick={() => { setOpen(false); setForm({}); setUploadTab('url'); }}>Cancel</Button>
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
          <CardContent className="text-muted-foreground">Add items to start getting personalized suggestions.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((it) => (<ClosetItemCard key={it.id} item={it} onDelete={onDelete} />))}
        </div>
      )}
    </main>
  );
}
