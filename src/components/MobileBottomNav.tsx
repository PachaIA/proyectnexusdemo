import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Kanban, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NEXUS_VIEW_PATHS } from '@/lib/nexusViews';

// Cada pestaña tiene su propia URL: el estado vive en el router (F5, atrás y enlaces directos funcionan).
const tabs = [
  { path: NEXUS_VIEW_PATHS.hoy, icon: LayoutDashboard, label: 'Hoy' },
  { path: NEXUS_VIEW_PATHS.clientes, icon: Users, label: 'Clientes' },
  { path: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { path: '/trimestre', icon: Target, label: 'Trimestre' },
];

export const MobileBottomNav = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/llamada')) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-card border-t border-border flex items-stretch safe-area-bottom">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.label}
            to={tab.path}
            className={({ isActive: active }) => cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <span className="relative">
              <Icon className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
