import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AppSettings, getSettings, saveSettings } from '@/lib/settings';
import { testConnection } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const [form, setForm] = useState<AppSettings>(getSettings());
  const { toast } = useToast();

  useEffect(() => { document.title = 'Settings – FitSense'; }, []);

  const save = () => { saveSettings(form); toast({ title: 'Settings saved' }); };

  const onTest = async () => {
    const ok = await testConnection();
    toast({ title: ok ? 'Connection OK' : 'Connection failed', description: ok ? 'Closet endpoint reachable.' : 'Check URL/API key or Mock Mode.' });
  };

  return (
    <main className="container mx-auto px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader><CardTitle>API Configuration</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="base">API Base URL</Label>
            <Input id="base" placeholder="https://api.example.com" value={form.apiBaseUrl} onChange={(e) => setForm((f) => ({ ...f, apiBaseUrl: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="key">API Key</Label>
            <Input id="key" placeholder="paste key" value={form.apiKey} onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Mock Mode</div>
              <div className="text-sm text-muted-foreground">Return example payloads with latency</div>
            </div>
            <Switch checked={form.mockMode} onCheckedChange={(v) => setForm((f) => ({ ...f, mockMode: v }))} />
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>Save</Button>
            <Button variant="secondary" onClick={onTest}>Test Connection</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
