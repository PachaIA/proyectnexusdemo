import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, persister } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import MyLeads from "./pages/MyLeads";
import NexusDashboard from "./pages/NexusDashboard";
import CallMode from "./pages/CallMode";
import ObjetivoTrimestre from "./pages/ObjetivoTrimestre";
import LeadsTable from "./pages/LeadsTable";
import NotFound from "./pages/NotFound";
import OAuthConsent from "./pages/OAuthConsent";
import ClientDetailPage from "./pages/ClientDetailPage";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { OpportunityDialog } from './components/OpportunityDialog';
import { FloatingChatWidget } from "./components/FloatingChatWidget";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthSessionProvider, useAuthSession } from "./contexts/AuthSessionContext";

// Antiguas direcciones: conservan ?company= y el estado de navegación.
const LegacyRedirect = ({ to }: { to: string }) => {
  const loc = useLocation();
  return <Navigate to={{ pathname: to, search: loc.search }} state={loc.state} replace />;
};

const AppRoutes = () => {
  const location = useLocation();
  const { user } = useAuthSession();
  const isPublicRoute = location.pathname === '/auth' || location.pathname === '/reset-password' || location.pathname === '/.lovable/oauth/consent';

  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
        <Route path="/" element={<Navigate to="/hoy" replace />} />
        <Route path="/hoy" element={<ProtectedRoute><NexusDashboard /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><NexusDashboard /></ProtectedRoute>} />
        <Route path="/clientes/:id" element={<ProtectedRoute><ClientDetailPage /></ProtectedRoute>} />
        <Route path="/archivo" element={<ProtectedRoute><NexusDashboard /></ProtectedRoute>} />
        <Route path="/mapa" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute><MyLeads /></ProtectedRoute>} />
        <Route path="/map" element={<LegacyRedirect to="/mapa" />} />
        <Route path="/my-leads" element={<Navigate to="/pipeline" replace />} />
        <Route path="/llamada/:companyId" element={<ProtectedRoute><CallMode /></ProtectedRoute>} />
        <Route path="/trimestre" element={<ProtectedRoute><ObjetivoTrimestre /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><LeadsTable /></ProtectedRoute>} />
        <Route path="/chat" element={<Navigate to="/hoy" replace />} />
        <Route path="/nexus" element={<Navigate to="/hoy" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {user && !isPublicRoute && <MobileBottomNav />}
      {user && !isPublicRoute && <FloatingChatWidget />}
    </>
  );
};

const App = () => (
  <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}>
    <TooltipProvider>
      <Toaster />
      <OpportunityDialog />
      <Sonner />
      <BrowserRouter>
        <AuthSessionProvider>
          <AppRoutes />
        </AuthSessionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </PersistQueryClientProvider>
);

export default App;
