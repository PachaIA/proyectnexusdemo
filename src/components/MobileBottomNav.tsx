import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Kanban, BellRing, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useFollowUps } from '@/hooks/useFollowUps';
import { cn } from '@/lib/utils';
import { NEXUS_VIEW_PATHS } from '@/lib/nexusViews';

// Cada pestaña tiene su propia URL: el estado vive en el router (F5, atrás y enlaces directos funcionan).
const tabs = [
  { path: NEXUS_VIEW_PATHS.hoy, icon: LayoutDashboard, label: 'Hoy' },
  { path: '/pendientes', icon: BellRing, label: 'Pendientes' },
  { path: NEXUS_VIEW_PATHS.clientes, icon: Users, label: 'Clientes' },
  { path: '/pipeline', icon: Kanban, label: 'Pipeline' },
];

export const MobileBottomNav = () => {
  const location = useLocation();
  const { urgentCount } = useFollowUps();
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
              {tab.path === '/pendientes' && urgentCount > 0 && (
                <span aria-label={`${urgentCount} pendientes`} className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold leading-4 text-center">{urgentCount}</span>
              )}
            </span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </NavLink>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={cn('flex-1 h-auto flex flex-col gap-0.5 py-2', !tabs.some(t => t.path === location.pathname) ? 'text-primary' : 'text-muted-foreground')} aria-label="Más secciones">
            <MoreHorizontal className="w-5 h-5" /><span className="text-[10px]">Más</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" className="z-[10000]">
          {[
            ['/mapa', 'Mapa'], ['/informes', 'Informes'], ['/agenda', 'Agenda'], ['/simulador', 'Simulador'],
            ['/objetivo', 'Cierre de trimestre'], ['/briefing', 'Briefing Diario'], ['/leads', 'Leads'], ['/triaje', 'Triaje'], ['/archivo', 'Archivo'],
          ].map(([path, label]) => <DropdownMenuItem key={path} asChild><NavLink to={path}>{label}</NavLink></DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
};
