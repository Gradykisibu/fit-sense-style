import { NavLink, Outlet, Link } from "react-router-dom";
import { Camera, Shuffle, Shirt, Lightbulb, Wand2, Settings as SettingsIcon, House } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", icon: House },
  { to: "/check", label: "Check", icon: Camera },
  { to: "/mix", label: "Mix", icon: Shuffle },
  { to: "/closet", label: "Closet", icon: Shirt },
  { to: "/suggestions", label: "Suggestions", icon: Lightbulb },
  { to: "/tryon", label: "Try‑On", icon: Wand2 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function AppLayout() {
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
