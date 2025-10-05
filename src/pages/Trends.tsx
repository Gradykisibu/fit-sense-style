import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Calendar, Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { hasFeatureAccess } from '@/lib/subscription';

interface TrendReport {
  id: string;
  report_period: string;
  generated_at: string;
  insights: any;
  recommendations: any;
  wardrobe_analysis: any;
}

export default function Trends() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<TrendReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');

  useEffect(() => {
    document.title = 'Seasonal Trends – FitSense';
    fetchUserPlan();
    fetchReports();
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

  const fetchReports = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('trend_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Error loading reports', variant: 'destructive' });
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  const generateReport = async () => {
    if (!hasFeatureAccess('seasonal-trends', userPlan as any)) {
      toast({
        title: 'Premium Feature',
        description: 'Upgrade to Premium or Pro to access seasonal trend reports.',
        variant: 'destructive'
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-trend-report');
      
      if (error) throw error;
      
      toast({ title: 'Report generated successfully!' });
      fetchReports();
    } catch (error: any) {
      toast({
        title: 'Failed to generate report',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!hasFeatureAccess('seasonal-trends', userPlan as any)) {
    return (
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <Lock className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-3xl font-bold">Premium Feature</h1>
          <p className="text-muted-foreground">
            Seasonal trend reports are available for Premium and Pro subscribers.
            Upgrade your plan to unlock AI-powered fashion insights.
          </p>
          <Button onClick={() => window.location.href = '/pricing'}>
            View Plans
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8" />
            Seasonal Trends
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered insights about your style and wardrobe trends
          </p>
        </div>
        <Button onClick={generateReport} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Generate New Report
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No trend reports yet. Generate your first report to see personalized fashion insights!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {report.report_period}
                    </CardTitle>
                    <CardDescription>
                      Generated {new Date(report.generated_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Trend Report</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.insights && Object.keys(report.insights).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Key Insights</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {Object.entries(report.insights).map(([key, value]) => (
                        <li key={key}>{String(value)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {report.recommendations && Object.keys(report.recommendations).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Recommendations</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {Object.entries(report.recommendations).map(([key, value]) => (
                        <li key={key}>{String(value)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {report.wardrobe_analysis && Object.keys(report.wardrobe_analysis).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Wardrobe Analysis</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {Object.entries(report.wardrobe_analysis).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <p className="font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="text-muted-foreground">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
