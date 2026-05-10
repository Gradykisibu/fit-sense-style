import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UsageAction, getPlanBadgeColor, getUsageStatus, normalizePlan } from '@/lib/subscription';
import { Crown, TrendingUp, Sun, Moon, Monitor, AlertCircle } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

const USAGE_ROWS: Array<{ action: UsageAction; field: string }> = [
  { action: 'analysis', field: 'monthly_analyses_used' },
  { action: 'chat', field: 'monthly_chats_used' },
  { action: 'tryon', field: 'monthly_tryons_used' },
  { action: 'shopping', field: 'monthly_shopping_used' },
];

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    document.title = 'Settings – FitSense';
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) setProfile(data);
  };

  const plan = normalizePlan(profile?.subscription_plan);
  const usageRows = USAGE_ROWS.map(({ action, field }) =>
    getUsageStatus(action, Number(profile?.[field] || 0), plan),
  );
  const hasFullUsage = usageRows.some((row) => row.isFull);

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
            {hasFullUsage && (
              <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>One or more monthly limits has been reached. Upgrade your plan to continue using those features.</span>
              </div>
            )}

            {usageRows.map((row) => (
              <div key={row.label} className="space-y-2">
                <div className="flex justify-between gap-3 text-sm">
                  <span>{row.label}</span>
                  <span className="font-medium">
                    {row.isIncluded ? `${row.used} / ${row.limit}` : 'Not included'}
                  </span>
                </div>
                <Progress value={row.percent} />
                {row.message && (
                  <p className={row.isFull || !row.isIncluded ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
                    {row.message}
                  </p>
                )}
              </div>
            ))}

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

    </main>
  );
}
