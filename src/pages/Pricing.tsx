import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Crown, Zap, Mail } from 'lucide-react';
import { basePlans, convertPrice, getCurrencySymbol, getCurrency, formatPrice } from '@/lib/pricing';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Pricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [country, setCountry] = useState<string>('US');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [currency, setCurrency] = useState<string>('USD');
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    document.title = 'Pricing – FitSense';
    
    const fetchUserData = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('country, subscription_plan')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        if (profile.country) {
          setCountry(profile.country);
          setCurrencySymbol(getCurrencySymbol(profile.country));
          setCurrency(getCurrency(profile.country));
        }
        setCurrentPlan(profile.subscription_plan || 'free');
      }
    };
    
    fetchUserData();
  }, [user]);

  const handleSubscribe = (planName: string) => {
    const planKey = planName.toLowerCase();
    if (planKey === currentPlan) {
      toast({ title: 'Already subscribed', description: `You're already on the ${planName} plan.` });
      return;
    }
    setSelectedPlan(planKey);
    setShowConfirmDialog(true);
  };

  const confirmPlanChange = async () => {
    if (!user || !selectedPlan) return;

    try {
      const nextResetDate = new Date();
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_plan: selectedPlan,
          subscription_start_date: new Date().toISOString(),
          monthly_analyses_used: 0,
          monthly_chats_used: 0,
          usage_reset_date: nextResetDate.toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setCurrentPlan(selectedPlan);
      toast({
        title: 'Plan updated!',
        description: `You're now on the ${selectedPlan} plan.`,
      });
      setShowConfirmDialog(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const planIcons = {
    Basic: Sparkles,
    Premium: Crown,
    Pro: Zap
  };

  const plans = basePlans.map(plan => ({
    ...plan,
    price: formatPrice(convertPrice(plan.basePrice, currency), currencySymbol),
    Icon: planIcons[plan.name as keyof typeof planIcons]
  }));

  return (
    <main className="container mx-auto px-6 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Style Plan</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Unlock the power of AI-driven fashion advice and transform your style journey
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
        {plans.map(({ name, price, period, description, features, buttonText, popular, Icon }) => {
          const planKey = name.toLowerCase();
          return (
            <Card
              key={name}
              className={`relative ${popular ? 'border-primary shadow-lg scale-105' : ''} ${
                planKey === currentPlan ? 'border-2 border-primary' : ''
              }`}
            >
              {popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              {planKey === currentPlan && (
                <div className="absolute -top-4 right-4">
                  <Badge className="bg-green-500">Current Plan</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-8 pt-8">
                <div className="mb-4 flex justify-center">{Icon && <Icon className="w-12 h-12 text-primary" />}</div>
                <CardTitle className="text-2xl">{name}</CardTitle>
                <CardDescription className="mt-2">{description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{price}</span>
                  <span className="text-muted-foreground">{period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant={popular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(name)}
                  disabled={planKey === currentPlan}
                >
                  {planKey === currentPlan ? 'Current Plan' : buttonText}
                </Button>
                <ul className="mt-6 space-y-3">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-16 text-center max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">All plans include</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            'AI-powered outfit analysis',
            'Style trend insights',
            'Mobile app access',
            'Secure data protection'
          ].map((feature, idx) => (
            <div key={idx} className="text-center">
              <div className="bg-accent rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Check className="w-6 h-6 text-accent-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{feature}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 text-center">
        <p className="text-muted-foreground mb-4">Have questions about our plans?</p>
        <Button variant="ghost">
          <Mail className="w-4 h-4 mr-2" />
          Contact Support
        </Button>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Plan Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to switch to the {selectedPlan} plan? Your usage counters will be reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPlanChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
