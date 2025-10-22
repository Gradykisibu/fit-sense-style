import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Lock, ImageIcon, CheckCircle2, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { hasFeatureAccess } from '@/lib/subscription';

interface ClosetItem {
  id: string;
  image_url: string;
  category: string;
  color?: string;
  brand?: string;
}

interface TryOnJob {
  id: string;
  items: any;
  status: string;
  result_image_url?: string;
  created_at: string;
}

export default function VirtualTryOn() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [jobs, setJobs] = useState<TryOnJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');

  useEffect(() => {
    document.title = 'Virtual Try-On Studio – FitSense';
    fetchUserPlan();
    fetchClosetItems();
    fetchJobs();
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

  const fetchClosetItems = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('closet_items')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) {
      toast({ title: 'Error loading closet items', variant: 'destructive' });
    } else {
      setClosetItems(data || []);
    }
    setLoading(false);
  };

  const fetchJobs = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('try_on_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error) {
      setJobs(data || []);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const deleteJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('try_on_jobs')
        .delete()
        .eq('id', jobId);
      
      if (error) throw error;
      
      toast({ title: 'Try-on deleted successfully' });
      fetchJobs();
    } catch (error: any) {
      toast({
        title: 'Failed to delete try-on',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const generateTryOn = async () => {
    if (!hasFeatureAccess('virtual-try-on', userPlan as any)) {
      toast({
        title: 'Premium Feature',
        description: 'Upgrade to Premium or Pro to access Virtual Try-On Studio.',
        variant: 'destructive'
      });
      return;
    }

    if (selectedItems.length < 2) {
      toast({
        title: 'Select at least 2 items',
        description: 'You need to select at least 2 clothing items to generate a try-on visualization.',
        variant: 'destructive'
      });
      return;
    }

    setGenerating(true);
    try {
      const selectedClosetItems = closetItems.filter(item => selectedItems.includes(item.id));
      const { data, error } = await supabase.functions.invoke('generate-try-on-image', {
        body: { items: selectedClosetItems }
      });
      
      if (error) throw error;
      
      toast({ title: 'Try-on image generated successfully!' });
      setSelectedItems([]);
      fetchJobs();
    } catch (error: any) {
      toast({
        title: 'Failed to generate try-on',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!hasFeatureAccess('virtual-try-on', userPlan as any)) {
    return (
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <Lock className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-3xl font-bold">Premium Feature</h1>
          <p className="text-muted-foreground">
            Virtual Try-On Studio is available for Premium and Pro subscribers.
            Upgrade your plan to visualize outfit combinations with AI.
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
            Virtual Try-On Studio
          </h1>
          <p className="text-muted-foreground mt-2">
            Select items from your closet to visualize outfit combinations
          </p>
        </div>
        <Button onClick={generateTryOn} disabled={generating || selectedItems.length < 2}>
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4 mr-2" />
              Generate Try-On ({selectedItems.length})
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Closet Items Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Your Closet</CardTitle>
              <CardDescription>
                Select 2 or more items to create a virtual try-on visualization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {closetItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No items in your closet yet. Add some items first!
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {closetItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleItemSelection(item.id)}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedItems.includes(item.id)
                          ? 'border-primary shadow-lg'
                          : 'border-transparent hover:border-muted-foreground/20'
                      }`}
                    >
                      <img
                        src={item.image_url}
                        alt={item.category}
                        className="w-full aspect-square object-cover"
                      />
                      {selectedItems.includes(item.id) && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-white text-xs font-medium">{item.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Previous Try-Ons */}
          {jobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Try-On History</CardTitle>
                <CardDescription>
                  Previously generated outfit visualizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {jobs.map((job) => (
                    <Card key={job.id} className="relative group">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteJob(job.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant={job.status === 'success' || job.status === 'done' ? 'default' : 'secondary'}>
                              {job.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(job.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {job.result_image_url ? (
                            <img
                              src={job.result_image_url}
                              alt="Try-on result"
                              className="w-full rounded-lg"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </main>
  );
}
