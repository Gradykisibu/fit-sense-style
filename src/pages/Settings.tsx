import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AppSettings, getSettings, saveSettings } from '@/lib/settings';
import { testConnection } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_LIMITS, getPlanBadgeColor } from '@/lib/subscription';
import { Crown, TrendingUp, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function Settings() {
  const [form, setForm] = useState<AppSettings>(getSettings());
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    document.title = 'Settings – FitSense';
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) setProfile(data);
  };

  const save = () => { saveSettings(form); toast({ title: 'Settings saved' }); };

  const onTest = async () => {
    const ok = await testConnection();
    toast({ title: ok ? 'Connection OK' : 'Connection failed', description: ok ? 'Closet endpoint reachable.' : 'Check URL/API key or Mock Mode.' });
  };

  const plan = profile?.subscription_plan || 'free';
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
  const analysesUsed = profile?.monthly_analyses_used || 0;
  const chatsUsed = profile?.monthly_chats_used || 0;

  return (
    <main className="container mx-auto px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Subscription Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">{plan} Plan</p>
              <p className="text-sm text-muted-foreground">
                {profile?.subscription_start_date
                  ? `Active since ${new Date(profile.subscription_start_date).toLocaleDateString()}`
                  : 'Not subscribed'}
              </p>
            </div>
            <Badge className={getPlanBadgeColor(plan as any)}>
              {plan.toUpperCase()}
            </Badge>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Outfit Analyses</span>
                <span className="font-medium">
                  {analysesUsed} / {limits.monthlyAnalyses === Infinity ? '∞' : limits.monthlyAnalyses}
                </span>
              </div>
              <Progress 
                value={limits.monthlyAnalyses === Infinity ? 0 : (analysesUsed / limits.monthlyAnalyses) * 100} 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>AI Chat Messages</span>
                <span className="font-medium">
                  {chatsUsed} / {limits.monthlyChats === Infinity ? '∞' : limits.monthlyChats}
                </span>
              </div>
              <Progress 
                value={limits.monthlyChats === Infinity ? 0 : (chatsUsed / limits.monthlyChats) * 100} 
              />
            </div>

            <div className="text-sm text-muted-foreground">
              Usage resets on {profile?.usage_reset_date ? new Date(profile.usage_reset_date).toLocaleDateString() : 'N/A'}
            </div>
          </div>

          <Button className="w-full" onClick={() => window.location.href = '/pricing'}>
            <TrendingUp className="w-4 h-4 mr-2" />
            {plan === 'free' ? 'Upgrade Plan' : 'Change Plan'}
          </Button>
        </CardContent>
      </Card>

      {/* Appearance Card */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sun className="w-5 h-5" />Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')}>
              <Sun className="w-4 h-4 mr-2" /> Light
            </Button>
            <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')}>
              <Moon className="w-4 h-4 mr-2" /> Dark
            </Button>
            <Button variant={theme === 'system' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('system')}>
              <Monitor className="w-4 h-4 mr-2" /> System
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration Card */}
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
