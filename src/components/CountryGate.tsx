import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isSupportedCountry, SUPPORTED_COUNTRY_NAMES, SUPPORTED_COUNTRIES, SupportedCountry } from '@/lib/countries';
import { LocationAccessResult, checkDeviceLocationAccess, getCachedLocationAccess, supportedCountryListText } from '@/lib/locationAccess';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Globe, MapPinOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Blocks app routes until the signed-in user has selected a supported country.
 * Server-side AI endpoints also enforce this — this is just a UX gate.
 */
export default function CountryGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [country, setCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<SupportedCountry | ''>('');
  const [saving, setSaving] = useState(false);
  const [locationAccess, setLocationAccess] = useState<LocationAccessResult | null>(() => getCachedLocationAccess());

  useEffect(() => {
    let cancel = false;
    if (!user) { setLoading(false); return; }

    Promise.all([
      supabase.from('profiles').select('country').eq('id', user.id).single(),
      checkDeviceLocationAccess(),
    ]).then(([profileResult, access]) => {
      if (!cancel) {
        setCountry(profileResult.data?.country ?? null);
        setLocationAccess(access);
        setLoading(false);
      }
    });

    return () => { cancel = true; };
  }, [user]);

  if (!user || loading) {
    if (locationAccess?.allowed) return <>{children}</>;

    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/20">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (locationAccess && !locationAccess.allowed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-2">
              <MapPinOff className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Location not supported</CardTitle>
            <CardDescription>
              {(locationAccess as any).reason} Supported countries are {supportedCountryListText()}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => checkDeviceLocationAccess(true).then(setLocationAccess)}>
              Check Again
            </Button>
            <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (isSupportedCountry(country)) return <>{children}</>;

  const save = async () => {
    if (!picked) return;
    setSaving(true);
    const { error } = await supabase.rpc('update_profile_safe', { _country: picked });
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    setCountry(picked);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/20">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2"><Globe className="w-6 h-6 text-primary" /></div>
          <CardTitle>Confirm your country</CardTitle>
          <CardDescription>
            FitSense Style is currently available in {SUPPORTED_COUNTRIES.map(c => SUPPORTED_COUNTRY_NAMES[c]).join(', ')}.
            {country && !isSupportedCountry(country) && (
              <span className="block mt-2 text-destructive">
                We're not yet available in your selected country ({country}).
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={picked} onValueChange={(v) => setPicked(v as SupportedCountry)}>
            <SelectTrigger><SelectValue placeholder="Select your country" /></SelectTrigger>
            <SelectContent>
              {SUPPORTED_COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>{SUPPORTED_COUNTRY_NAMES[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="w-full" onClick={save} disabled={!picked || saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Continue
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            If you're outside these regions, please check back soon.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
