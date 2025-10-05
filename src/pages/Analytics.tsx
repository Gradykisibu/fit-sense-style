import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Palette, Shirt, Award, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasFeatureAccess } from '@/lib/subscription';

export default function Analytics() {
  const { user } = useAuth();
  const [userPlan, setUserPlan] = useState<string>('free');
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Style Analytics – FitSense';
    fetchUserPlan();
    fetchAnalytics();
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

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch closet items for color and category distribution
    const { data: closetItems } = await supabase
      .from('closet_items')
      .select('color, category, brand')
      .eq('user_id', user.id);

    // Fetch outfit analyses for scores
    const { data: analyses } = await supabase
      .from('outfit_analyses')
      .select('score, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (closetItems && analyses) {
      // Calculate color distribution
      const colorCounts: Record<string, number> = {};
      closetItems.forEach(item => {
        if (item.color) {
          colorCounts[item.color] = (colorCounts[item.color] || 0) + 1;
        }
      });

      // Calculate category distribution
      const categoryCounts: Record<string, number> = {};
      closetItems.forEach(item => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      });

      // Calculate brand preferences
      const brandCounts: Record<string, number> = {};
      closetItems.forEach(item => {
        if (item.brand) {
          brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 1;
        }
      });

      // Calculate average score over time
      const scoreOverTime = analyses.map(a => ({
        date: new Date(a.created_at).toLocaleDateString(),
        score: a.score || 0
      }));

      const avgScore = analyses.length > 0
        ? analyses.reduce((sum, a) => sum + (a.score || 0), 0) / analyses.length
        : 0;

      setAnalytics({
        colorData: Object.entries(colorCounts).map(([name, value]) => ({ name, value })),
        categoryData: Object.entries(categoryCounts).map(([name, value]) => ({ name, value })),
        brandData: Object.entries(brandCounts).slice(0, 5).map(([name, value]) => ({ name, value })),
        scoreData: scoreOverTime.slice(-10),
        avgScore: avgScore.toFixed(1),
        totalOutfits: analyses.length,
        totalItems: closetItems.length
      });
    }

    setLoading(false);
  };

  if (!hasFeatureAccess('custom-analytics', userPlan as any)) {
    return (
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <Lock className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-3xl font-bold">Pro Feature</h1>
          <p className="text-muted-foreground">
            Custom style analytics are available for Pro subscribers only.
            Upgrade your plan to unlock detailed insights about your style.
          </p>
          <Button onClick={() => window.location.href = '/pricing'}>
            View Plans
          </Button>
        </div>
      </main>
    );
  }

  const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

  return (
    <main className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="w-8 h-8" />
          Style Analytics
        </h1>
        <p className="text-muted-foreground mt-2">
          Deep insights into your wardrobe and style patterns
        </p>
      </div>

      {loading || !analytics ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Average Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.avgScore}/10</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {analytics.totalOutfits} outfit analyses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shirt className="w-4 h-4" />
                  Total Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalItems}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Items in your closet
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Color Variety
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.colorData.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Different colors
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Color Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.colorData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.colorData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Outfit Scores Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.scoreData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {analytics.brandData.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Top Brands</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics.brandData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#ec4899" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </main>
  );
}
