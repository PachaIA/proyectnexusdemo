import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Settings, Menu, LogOut, Users, Plus, Building2, Sun, Moon, StickyNote, Table as TableIcon, Inbox, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate, useLocation } from 'react-router-dom';
import { NEXUS_VIEW_PATHS, nexusViewFromPath } from '@/lib/nexusViews';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCompanies } from '@/hooks/useCompanies';
import { useLeads } from '@/hooks/useLeads';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotesDrawer } from '@/components/NotesDrawer';

const NexusLogo = () => (
  <div className="flex items-center gap-2.5 mr-4">
    <div className="relative flex items-center justify-center w-9 h-9">
      <svg viewBox="0 0 36 36" className="w-9 h-9 drop-shadow-[0_0_8px_rgba(124,92,252,0.5)]">
        <polygon
          points="18,1 32.5,9 32.5,27 18,35 3.5,27 3.5,9"
          fill="none"
          stroke="hsl(252 95% 68%)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <polygon
          points="18,6 28,12 28,24 18,30 8,24 8,12"
          fill="hsl(252 95% 68%)"
          fillOpacity="0.15"
          stroke="hsl(252 95% 68%)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="18" r="3" fill="hsl(252 95% 68%)" />
      </svg>
    </div>
    <div className="flex flex-col">
      <span
        className="text-[15px] font-extrabold tracking-[3px] leading-none text-primary"
        style={{ textShadow: '0 0 12px hsl(252 95% 68% / 0.4)' }}
      >
        NEXUS
      </span>
      <span className="text-[8px] tracking-[2px] text-muted-foreground leading-none mt-0.5">
        INTELIGENCIA COMERCIAL
      </span>
    </div>
  </div>
);

interface HeaderProps {
  onMobileMenuToggle?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onAddCompany?: () => void;
  onCompanyNavigate?: (companyId: string) => void;
}

export const Header = ({ onMobileMenuToggle, searchQuery = '', onSearchChange, onAddCompany, onCompanyNavigate }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardView = nexusViewFromPath(location.pathname);
  const [localSearch, setLocalSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [notesOpen, setNotesOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const { companies } = useCompanies();
  const { leads } = useLeads();

  // Use the parent search or local search
  const activeSearch = onSearchChange ? searchQuery : localSearch;
  const setActiveSearch = (val: string) => {
    if (onSearchChange) onSearchChange(val);
    setLocalSearch(val);
  };

  // Filter companies for dropdown
  const searchResults = activeSearch.length >= 2
    ? companies.filter(c =>
        c.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
        c.sector.toLowerCase().includes(activeSearch.toLowerCase()) ||
        c.address.toLowerCase().includes(activeSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Dark mode toggle
  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.style.colorScheme = next ? 'dark' : 'light';
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  // Init dark mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      setDarkMode(false);
    } else {
      // Default to dark
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      setDarkMode(true);
      if (!saved) localStorage.setItem('theme', 'dark');
    }
  }, []);


  // Reset dashboard view when leaving the dashboard page
  useEffect(() => {
    if (location.pathname !== '/') {
      setDashboardView('hoy');
    }
  }, [location.pathname]);

  // Close "More" dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Recent lead activity for notifications
  const recentLeads = leads
    .filter(l => l.created_at)
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
    .slice(0, 5);

  const handleSelectCompany = (companyId: string) => {
    setSearchOpen(false);
    setActiveSearch('');
    // Navigate to dashboard with company detail open
    if (location.pathname !== '/') {
      navigate('/', { state: { companyId, tab: 'briefing' } });
    } else {
      // Already on dashboard, dispatch event to open detail
      window.dispatchEvent(new CustomEvent('select-company', { detail: { companyId } }));
    }
    onCompanyNavigate?.(companyId);
  };

  const handleAddNew = () => {
    setSearchOpen(false);
    setActiveSearch('');
    if (onAddCompany) {
      onAddCompany();
    } else {
      // Navigate to map and trigger add
      if (location.pathname !== '/map') navigate('/map');
      setTimeout(() => window.dispatchEvent(new CustomEvent('open-add-company')), 100);
    }
  };

  return (
    <header className="h-14 px-4 border-b border-border bg-card flex items-center justify-between gap-4 shrink-0 z-[1000] relative">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden h-9 w-9"
          onClick={onMobileMenuToggle}
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
          <NexusLogo />
        </button>
      </div>

      {/* Center Section - Nav + Search */}
      <div className="flex-1 flex items-center gap-4 max-w-2xl">
        <nav className="hidden md:flex items-center gap-1 bg-muted/50 rounded-full p-1 border border-border shrink-0">
          <button
            onClick={() => navigate(NEXUS_VIEW_PATHS.hoy)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
              dashboardView === 'hoy'
                ? 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(124,92,252,0.4)]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            📋 Hoy
          </button>
          <button
            onClick={() => navigate(NEXUS_VIEW_PATHS.clientes)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
              dashboardView === 'clientes'
                ? 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(124,92,252,0.4)]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            👥 Clientes
          </button>
          <button
            onClick={() => navigate('/map')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
              location.pathname === '/map'
                ? 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(124,92,252,0.4)]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            🗺️ Mapa
          </button>
          <button
            onClick={() => navigate('/my-leads')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
              location.pathname === '/my-leads'
                ? 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(124,92,252,0.4)]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            📊 Pipeline
          </button>
          <button
            onClick={() => navigate(NEXUS_VIEW_PATHS.informes)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
              dashboardView === 'informes'
                ? 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(124,92,252,0.4)]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            📑 Informes
          </button>
          <button
            onClick={() => navigate(NEXUS_VIEW_PATHS.agenda)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
              dashboardView === 'agenda'
                ? 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(124,92,252,0.4)]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            🗓️ Agenda
          </button>
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all inline-flex items-center gap-1 whitespace-nowrap',
                (
                  location.pathname === '/leads' ||
                  location.pathname.startsWith('/triaje') ||
                  location.pathname === '/simulador' ||
                  (dashboardView === 'briefing' || dashboardView === 'archivo')
                )
                  ? 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(124,92,252,0.4)]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Más <ChevronDown className={cn('w-3 h-3 transition-transform', moreOpen && 'rotate-180')} />
            </button>
            {moreOpen && (
              <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 py-1 min-w-[180px]">
                <button
                  onClick={() => { setMoreOpen(false); navigate(NEXUS_VIEW_PATHS.briefing); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center gap-2',
                    dashboardView === 'briefing'
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  ⬡ Briefing Diario
                </button>
                <button
                  onClick={() => { setMoreOpen(false); navigate('/leads'); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center gap-2',
                    location.pathname === '/leads'
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <TableIcon className="w-3 h-3" /> Leads
                </button>
                <button
                  onClick={() => { setMoreOpen(false); navigate('/triaje'); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center gap-2',
                    location.pathname.startsWith('/triaje')
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Inbox className="w-3 h-3" /> Triaje
                </button>
                <button
                  onClick={() => { setMoreOpen(false); navigate('/simulador'); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center gap-2',
                    location.pathname === '/simulador'
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  🧮 Simulador
                </button>
                <button
                  onClick={() => { setMoreOpen(false); navigate(NEXUS_VIEW_PATHS.archivo); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center gap-2',
                    dashboardView === 'archivo'
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  🗄️ Archivo
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Search with dropdown */}
        <div className="flex-1 hidden md:block relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="search"
              placeholder="Buscar empresas por nombre, sector, dirección..."
              value={activeSearch}
              onChange={(e) => {
                setActiveSearch(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => { if (activeSearch.length >= 2) setSearchOpen(true); }}
               className="pl-10 h-9 bg-muted/50 border-border focus:bg-muted caret-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Search Results Dropdown */}
          {searchOpen && activeSearch.length >= 2 && (
            <div className="absolute top-full right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden min-w-[420px]">
              {searchResults.length > 0 ? (
                <ScrollArea className="max-h-[320px]">
                  <div className="py-1">
                    {searchResults.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => handleSelectCompany(company.id)}
                        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {company.sector} · {company.address}
                          </p>
                        </div>
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-full shrink-0",
                          company.opportunityScore >= 80 ? "bg-success/10 text-success" :
                          company.opportunityScore >= 60 ? "bg-warning/10 text-warning" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {company.opportunityScore}
                        </span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    No se encontró "<span className="font-medium text-foreground">{activeSearch}</span>"
                  </p>
                </div>
              )}

              {/* Always show "Add new" option */}
              <div className="border-t border-border p-2">
                <button
                  onClick={handleAddNew}
                  className="w-full px-3 py-2 flex items-center gap-2 rounded-md hover:bg-primary/10 transition-colors text-left"
                >
                  <Plus className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Dar de alta nueva empresa{activeSearch ? `: "${activeSearch}"` : ''}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Mobile Search */}
        <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
          <Search className="w-4 h-4" />
        </Button>

        {/* Notes */}
        <NotesDrawer open={notesOpen} onClose={() => setNotesOpen(false)} />
        <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9" onClick={() => setNotesOpen(true)} title="Pizarra">
          <StickyNote className="w-4 h-4" />
        </Button>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9 relative">
              <Bell className="w-4 h-4" />
              {recentLeads.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 z-[9999] z-[9999]" align="end">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
              <p className="text-xs text-muted-foreground">Actividad reciente del pipeline</p>
            </div>
            <ScrollArea className="max-h-[300px]">
              {recentLeads.length > 0 ? (
                <div className="py-1">
                  {recentLeads.map((lead) => (
                    <div key={lead.id} className="px-4 py-2.5 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5 shrink-0">
                          <Building2 className="w-3 h-3 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium truncate">{lead.empresa}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.estado === 'won' ? '✅ Ganado' : 
                             lead.estado === 'proposal' ? '📋 Propuesta' :
                             lead.estado === 'negotiation' ? '🤝 Negociación' :
                             lead.estado === 'contact' ? '📞 Contacto' :
                             '🔍 Identificado'}
                            {lead.created_at && (
                              <span className="ml-1">
                                · {new Date(lead.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
                </div>
              )}
            </ScrollArea>
            {recentLeads.length > 0 && (
              <div className="border-t border-border p-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => navigate('/my-leads')}
                >
                  Ver todos los leads
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Settings with Dark Mode */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9">
              <Settings className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 z-[9999]" align="end">
            <div className="space-y-1">
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                {darkMode ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
                <span className="text-sm text-foreground">
                  {darkMode ? 'Modo día' : 'Modo noche'}
                </span>
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Logout */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9"
          onClick={() => supabase.auth.signOut()}
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </Button>

        {/* Date & Status */}
        <div className="hidden lg:flex items-center gap-3 text-right">
          <div>
            <p className="text-[11px] font-mono text-muted-foreground tracking-wider leading-none">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <div className="flex items-center gap-1.5 justify-end mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]" />
              <span className="text-[9px] font-mono text-green-500 tracking-[2px]">SISTEMA ACTIVO</span>
            </div>
          </div>
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-border">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">AG</AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-none">Alejandro Glez</p>
            <p className="text-[10px] text-muted-foreground">Senior Strategic Consultant</p>
          </div>
        </div>
      </div>
    </header>
  );
};
