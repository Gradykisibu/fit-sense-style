import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import CountryGate from "./components/CountryGate";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AppLayout from "./components/layout/AppLayout";
import Check from "./pages/Check";
import Mix from "./pages/Mix";
import Closet from "./pages/Closet";
import Settings from "./pages/Settings";
import Assistant from "./pages/Assistant";
import Pricing from "./pages/Pricing";
import Snapshots from "./pages/Snapshots";
import VirtualTryOn from './pages/VirtualTryOn';
import ShoppingAssistant from './pages/ShoppingAssistant';
import Analytics from "./pages/Analytics";
import ContactSupport from "./pages/ContactSupport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                element={
                  <ProtectedRoute>
                    <CountryGate>
                      <AppLayout />
                    </CountryGate>
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Index />} />
                <Route path="/check" element={<Check />} />
                <Route path="/mix" element={<Mix />} />
                <Route path="/closet" element={<Closet />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/price" element={<Navigate to="/pricing" replace />} />
                <Route path="/snapshots" element={<Snapshots />} />
                <Route path="/virtual-try-on" element={<VirtualTryOn />} />
                <Route path="/shopping" element={<ShoppingAssistant />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/support" element={<ContactSupport />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
