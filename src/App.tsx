import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, persister } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import MyLeads from "./pages/MyLeads";
import NexusDashboard from "./pages/NexusDashboard";
import Simulador from "./pages/Simulador";
import CallMode from "./pages/CallMode";
import ObjetivoTrimestre from "./pages/ObjetivoTrimestre";
import LeadsTable from "./pages/LeadsTable";
import Triaje from "./pages/Triaje";
import TriajeCola from "./pages/TriajeCola";
import NotFound from "./pages/NotFound";
import OAuthConsent from "./pages/OAuthConsent";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { FloatingChatWidget } from "./components/FloatingChatWidget";

// Auth desactivada temporalmente: la app abre directo sin login.
// Para reactivarla, volver a envolver las rutas con un guard de sesión.
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const AppRoutes = () => {
  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
        <Route path="/" element={<ProtectedRoute><NexusDashboard /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><NexusDashboard /></ProtectedRoute>} />
        <Route path="/informes" element={<ProtectedRoute><NexusDashboard /></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute><NexusDashboard /></ProtectedRoute>} />
        <Route path="/briefing" element={<ProtectedRoute><NexusDashboard /></ProtectedRoute>} />
        <Route path="/archivo" element={<ProtectedRoute><NexusDashboard /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/my-leads" element={<ProtectedRoute><MyLeads /></ProtectedRoute>} />
        <Route path="/llamada/:companyId" element={<CallMode />} />
        <Route path="/simulador" element={<ProtectedRoute><Simulador /></ProtectedRoute>} />
        <Route path="/objetivo" element={<ProtectedRoute><ObjetivoTrimestre /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><LeadsTable /></ProtectedRoute>} />
        <Route path="/triaje" element={<ProtectedRoute><Triaje /></ProtectedRoute>} />
        <Route path="/triaje/cola" element={<ProtectedRoute><TriajeCola /></ProtectedRoute>} />
        <Route path="/chat" element={<Navigate to="/" replace />} />
        <Route path="/nexus" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <MobileBottomNav />
      <FloatingChatWidget />
    </>
  );
};

const App = () => (
  <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </PersistQueryClientProvider>
);

export default App;
