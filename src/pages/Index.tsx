import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Shuffle, Shirt, Box, Wand2, Camera, Settings as SettingsIcon } from "lucide-react";
import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    document.title = "FitSense – AI Outfit Rater & Stylist";
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--background))] via-[hsl(var(--accent))]/20 to-[hsl(var(--background))]" aria-hidden />
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 relative">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight mb-6">FitSense</h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">AI outfit rater and stylist. Upload your look or mix items to get smart, actionable style advice.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Button asChild>
                <Link to="/check" aria-label="Start Outfit Check">
                  <Camera className="mr-2 h-5 w-5" /> Outfit Check
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link to="/mix" aria-label="Open Mix and Match">
                  <Shuffle className="mr-2 h-5 w-5" /> Mix & Match
                </Link>
              </Button>
            </div>
            <div className="mt-8 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                <Link to="/closet" className="underline underline-offset-4 hover:text-foreground transition-colors">My Closet</Link>
                <span className="hidden sm:inline">·</span>
                <Link to="/snapshots" className="underline underline-offset-4 hover:text-foreground transition-colors">Snapshots</Link>
                <span className="hidden sm:inline">·</span>
                <Link to="/assistant" className="underline underline-offset-4 hover:text-foreground transition-colors">AI Assistant</Link>
                <span className="hidden sm:inline">·</span>
                <Link to="/settings" className="underline underline-offset-4 hover:text-foreground transition-colors">Settings</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-20 grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Style Critique
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">Get a score, verdict, and specific tweaks to elevate your outfit.</CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5" /> Digital Closet
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">Save items, organize your wardrobe, and get AI-powered style advice.</CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" /> AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">Chat with your personal AI stylist for fashion advice and tips.</CardContent>
        </Card>
      </section>

      <section className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><Camera className="h-4 w-4" /> Upload or capture</div>
          <div className="flex items-center gap-2"><Box className="h-4 w-4" /> Detect items & colors</div>
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI verdict + swaps</div>
          <div className="flex items-center gap-2"><Shuffle className="h-4 w-4" /> Mix & match compatibility</div>
          <div className="flex items-center gap-2"><Shirt className="h-4 w-4" /> Digital closet</div>
          <div className="flex items-center gap-2"><SettingsIcon className="h-4 w-4" /> Live/Mock via Settings</div>
        </div>
      </section>
    </main>
  );
};

export default Index;
