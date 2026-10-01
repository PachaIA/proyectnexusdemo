import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import MyLeads from "./pages/MyLeads";
import NexusDashboard from "./pages/NexusDashboard";
import Simulador from "./pages/Simulador";
import LeadsTable from "./pages/LeadsTable";
import Triaje from "./pages/Triaje";
import TriajeCola from "./pages/TriajeCola";
import NotFound from "./pages/NotFound";
import OAuthConsent from "./pages/OAuthConsent";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { FloatingChatWidget } from "./components/FloatingChatWidget";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (event !== 'INITIAL_SESSION') {
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
        <Route path="/" element={<ProtectedRoute><NexusDashboard /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/my-leads" element={<ProtectedRoute><MyLeads /></ProtectedRoute>} />
        <Route path="/simulador" element={<ProtectedRoute><Simulador /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><LeadsTable /></ProtectedRoute>} />
        <Route path="/triaje" element={<ProtectedRoute><Triaje /></ProtectedRoute>} />
        <Route path="/triaje/cola" element={<ProtectedRoute><TriajeCola /></ProtectedRoute>} />
        <Route path="/chat" element={<Navigate to="/" replace />} />
        <Route path="/nexus" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {user && <MobileBottomNav />}
      {user && <FloatingChatWidget />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
