import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Loader2, Lock, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { hasFeatureAccess } from '@/lib/subscription';

interface WardrobeGap {
  category: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

interface ShoppingRecommendation {
  item: string;
  category: string;
  reason: string;
  estimatedCost: string;
  priority: 'high' | 'medium' | 'low';
}

interface ShoppingReport {
  wardrobeGaps: WardrobeGap[];
  recommendations: ShoppingRecommendation[];
  budgetInsights: {
    totalItems: number;
    averageCostPerWear: string;
    underutilizedItems: number;
  };
}

export default function ShoppingAssistant() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [report, setReport] = useState<ShoppingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');

  useEffect(() => {
    document.title = 'Smart Shopping Assistant – FitSense';
    fetchUserPlan();
  }, []);

  const fetchUserPlan = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', user.id)
      .single();
    if (data) setUserPlan(data.subscription_plan);
  };

  const generateReport = async () => {
    if (!hasFeatureAccess('shopping-assistant', userPlan as any)) {
      toast({
        title: 'Pro Feature',
        description: 'Upgrade to Pro to access Smart Shopping Assistant.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-shopping-recommendations');
      
      if (error) throw error;
      
      setReport(data.report);
      toast({ title: 'Shopping recommendations generated!' });
    } catch (error: any) {
      toast({
        title: 'Failed to generate recommendations',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasFeatureAccess('shopping-assistant', userPlan as any)) {
    return (
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <Lock className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-3xl font-bold">Pro Feature</h1>
          <p className="text-muted-foreground">
            Smart Shopping Assistant is available for Pro subscribers.
            Upgrade your plan to get AI-powered shopping recommendations and wardrobe gap analysis.
          </p>
          <Button onClick={() => window.location.href = '/pricing'}>
            View Plans
          </Button>
        </div>
      </main>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <main className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-8 h-8" />
            Smart Shopping Assistant
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered shopping recommendations based on your wardrobe analysis
          </p>
        </div>
        <Button onClick={generateReport} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Generate Report
            </>
          )}
        </Button>
      </div>

      {!report && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Click "Generate Report" to analyze your wardrobe and get personalized shopping recommendations!
            </p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Budget Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Budget Insights
              </CardTitle>
              <CardDescription>
                Overview of your wardrobe investment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{report.budgetInsights.totalItems}</p>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{report.budgetInsights.averageCostPerWear}</p>
                  <p className="text-sm text-muted-foreground">Avg Cost Per Wear</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{report.budgetInsights.underutilizedItems}</p>
                  <p className="text-sm text-muted-foreground">Underutilized Items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wardrobe Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Wardrobe Gaps
              </CardTitle>
              <CardDescription>
                Categories where your wardrobe could be enhanced
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.wardrobeGaps.map((gap, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Badge variant={getPriorityColor(gap.priority) as any}>
                      {gap.priority}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-semibold">{gap.category}</p>
                      <p className="text-sm text-muted-foreground">{gap.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shopping Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Recommended Purchases
              </CardTitle>
              <CardDescription>
                Specific items to fill wardrobe gaps and enhance your style
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {report.recommendations.map((rec, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold">{rec.item}</h3>
                          <Badge variant={getPriorityColor(rec.priority) as any}>
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.category}</p>
                        <p className="text-sm">{rec.reason}</p>
                        <p className="text-sm font-medium text-primary">
                          Est. Budget: {rec.estimatedCost}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
