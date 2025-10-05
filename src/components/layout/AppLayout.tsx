import { NavLink, Outlet, Link } from "react-router-dom";
import { Camera, Shuffle, Shirt, Settings as SettingsIcon, House, Sparkles, User, LogOut, Menu, CreditCard, Save, TrendingUp, BarChart3, Lock } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { hasFeatureAccess } from '@/lib/subscription';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface TabItem {
  to: string;
  label: string;
  icon: any;
  premiumFeature?: string;
}

const tabs: TabItem[] = [
  { to: "/", label: "Home", icon: House },
  { to: "/check", label: "Check", icon: Camera },
  { to: "/mix", label: "Mix", icon: Shuffle },
  { to: "/closet", label: "Closet", icon: Shirt },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/trends", label: "Trends", icon: TrendingUp, premiumFeature: "seasonal-trends" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, premiumFeature: "custom-analytics" },
  { to: "/snapshots", label: "Snapshots", icon: Save },
  { to: "/pricing", label: "Pricing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');

  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', user.id)
        .single();
      if (data) setUserPlan(data.subscription_plan || 'free');
    };
    fetchPlan();
  }, [user]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            <Link to="/" className="font-bold tracking-tight text-lg">FitSense</Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
              {tabs.map(({ to, label, icon: Icon, premiumFeature }) => {
                const hasAccess = !premiumFeature || hasFeatureAccess(premiumFeature, userPlan as any);
                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-md text-sm transition-smooth ${
                        isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                      } ${!hasAccess ? 'opacity-60' : ''}`
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" /> {label}
                      {!hasAccess && <Lock className="h-3 w-3" />}
                    </span>
                  </NavLink>
                );
              })}
            </nav>
            
            <div className="flex items-center gap-2">
              {/* Mobile Navigation */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <nav className="flex flex-col gap-4 mt-8">
                    {tabs.map(({ to, label, icon: Icon, premiumFeature }) => {
                      const hasAccess = !premiumFeature || hasFeatureAccess(premiumFeature, userPlan as any);
                      return (
                        <NavLink
                          key={to}
                          to={to}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md transition-smooth ${
                              isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                            } ${!hasAccess ? 'opacity-60' : ''}`
                          }
                        >
                          <Icon className="h-5 w-5" />
                          <span>{label}</span>
                          {!hasAccess && <Badge variant="secondary" className="ml-auto text-xs">Pro</Badge>}
                        </NavLink>
                      );
                    })}
                    <div className="mt-8 pt-4 border-t">
                      <div className="flex items-center gap-3 px-3 py-2 mb-4">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {(user?.user_metadata?.name as string)?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <p className="text-sm font-medium">{(user?.user_metadata?.name as string) || 'User'}</p>
                          <p className="text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => { logout(); setMobileMenuOpen(false); }}
                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </Button>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>

              {/* Desktop User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full hidden lg:flex">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {(user?.user_metadata?.name as string)?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {(user?.user_metadata?.name as string) || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      <div className="bg-hero-gradient">
        <Outlet />
      </div>
      <footer className="mt-auto border-t">
        <div className="container mx-auto px-4 py-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} FitSense. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
