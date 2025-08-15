import { NavLink, Outlet, Link } from "react-router-dom";
import { Camera, Shuffle, Shirt, Lightbulb, Wand2, Settings as SettingsIcon, House, Sparkles, User, LogOut } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
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

const tabs = [
  { to: "/", label: "Home", icon: House },
  { to: "/check", label: "Check", icon: Camera },
  { to: "/mix", label: "Mix", icon: Shuffle },
  { to: "/closet", label: "Closet", icon: Shirt },
  { to: "/suggestions", label: "Suggestions", icon: Lightbulb },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/tryon", label: "Try‑On", icon: Wand2 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            <Link to="/" className="font-bold tracking-tight">FitSense</Link>
            <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
              {tabs.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm transition-smooth ${isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`
                  }
                >
                  <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</span>
                </NavLink>
              ))}
            </nav>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.name || 'User'}
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
