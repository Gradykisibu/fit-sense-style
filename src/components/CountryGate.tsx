import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isSupportedCountry, SUPPORTED_COUNTRY_NAMES, SUPPORTED_COUNTRIES, SupportedCountry } from '@/lib/countries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Globe } from 'lucide-react';
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

  useEffect(() => {
    let cancel = false;
    if (!user) { setLoading(false); return; }
    supabase.from('profiles').select('country').eq('id', user.id).single()
      .then(({ data }) => { if (!cancel) { setCountry(data?.country ?? null); setLoading(false); } });
    return () => { cancel = true; };
  }, [user]);

  if (!user || loading) return <>{children}</>;
  if (isSupportedCountry(country)) return <>{children}</>;

  const save = async () => {
    if (!picked) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ country: picked }).eq('id', user.id);
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
