import { motion } from 'framer-motion';
import { Map, Building2, FileText, BarChart3, Settings, Target, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'map', label: 'Mapa', icon: Map },
  { id: 'companies', label: 'Empresas', icon: Building2 },
  { id: 'opportunities', label: 'Oportunidades', icon: Target },
  { id: 'leads', label: 'Mis Leads', icon: Users },
  { id: 'proposals', label: 'Propuestas', icon: FileText },
  { id: 'analytics', label: 'Analítica', icon: BarChart3 },
];

const stats = [
  { label: 'Empresas activas', value: '12', icon: Building2 },
  { label: 'Oportunidades', value: '8', icon: TrendingUp },
  { label: 'Score medio', value: '82', icon: Target },
];

export const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  return (
    <motion.aside 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col"
    >
      <nav className="flex-1 py-4">
        <div className="px-4 mb-6">
          <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider mb-3">
            Navegación
          </p>
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 mb-6">
          <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider mb-3">
            Resumen rápido
          </p>
          <div className="space-y-2">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={index}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50"
                >
                  <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-sidebar-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-sidebar-foreground">{stat.value}</p>
                    <p className="text-[10px] text-sidebar-foreground/60">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <Settings className="w-5 h-5" />
          Configuración
        </button>
      </div>
    </motion.aside>
  );
};
