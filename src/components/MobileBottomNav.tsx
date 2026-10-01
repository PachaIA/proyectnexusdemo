import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Map, Kanban, Calculator, FileText, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/', event: null, icon: LayoutDashboard, label: 'Hoy' },
  { path: '/', event: 'nexus-view-clientes', icon: Users, label: 'Clientes' },
  { path: '/map', event: null, icon: Map, label: 'Mapa' },
  { path: '/my-leads', event: null, icon: Kanban, label: 'Pipeline' },
  { path: '/', event: 'nexus-view-informes', icon: FileText, label: 'Informes' },
  { path: '/', event: 'nexus-view-agenda', icon: CalendarClock, label: 'Agenda' },
  { path: '/simulador', event: null, icon: Calculator, label: 'Simulador' },
];

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTap = (tab: typeof tabs[0]) => {
    if (tab.event) {
      if (location.pathname !== tab.path) {
        navigate(tab.path);
        setTimeout(() => window.dispatchEvent(new CustomEvent(tab.event!)), 50);
      } else {
        window.dispatchEvent(new CustomEvent(tab.event));
      }
    } else {
      navigate(tab.path);
    }
  };

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.path === '/my-leads') return location.pathname === '/my-leads';
    if (tab.path === '/map') return location.pathname === '/map';
    if (tab.path === '/simulador') return location.pathname === '/simulador';
    return location.pathname === '/' && !tab.event;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-card border-t border-border flex items-stretch safe-area-bottom">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab);
        return (
          <button
            key={tab.label}
            onClick={() => handleTap(tab)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
