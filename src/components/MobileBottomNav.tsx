import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Map, Kanban, Calculator, FileText, CalendarClock, BellRing } from 'lucide-react';
import { useFollowUps } from '@/hooks/useFollowUps';
import { cn } from '@/lib/utils';
import { NEXUS_VIEW_PATHS } from '@/lib/nexusViews';

// Cada pestaña tiene su propia URL: el estado vive en el router (F5, atrás y enlaces directos funcionan).
const tabs = [
  { path: NEXUS_VIEW_PATHS.hoy, icon: LayoutDashboard, label: 'Hoy' },
  { path: '/hoy', icon: BellRing, label: 'Pendientes' },
  { path: NEXUS_VIEW_PATHS.clientes, icon: Users, label: 'Clientes' },
  { path: '/map', icon: Map, label: 'Mapa' },
  { path: '/my-leads', icon: Kanban, label: 'Pipeline' },
  { path: NEXUS_VIEW_PATHS.informes, icon: FileText, label: 'Informes' },
  { path: NEXUS_VIEW_PATHS.agenda, icon: CalendarClock, label: 'Agenda' },
  { path: '/simulador', icon: Calculator, label: 'Simulador' },
];

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { urgentCount } = useFollowUps();
  if (location.pathname.startsWith('/llamada')) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-card border-t border-border flex items-stretch safe-area-bottom">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.label}
            onClick={() => { if (!active) navigate(tab.path); }}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <span className="relative">
              <Icon className="w-5 h-5" />
              {tab.path === '/hoy' && urgentCount > 0 && (
                <span aria-label={`${urgentCount} pendientes`} className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold leading-4 text-center">{urgentCount}</span>
              )}
            </span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
