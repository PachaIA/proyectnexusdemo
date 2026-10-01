import { 
  Building2, Filter, TrendingUp, Target, Zap, 
  ChevronDown, ChevronRight, Search
} from 'lucide-react';
import { useState } from 'react';
import { Company, sectors, employeeRanges, locationTypes, opportunityLevels, digitalizationLevels } from '@/data/companies';
import { CompanyCard } from '@/components/CompanyCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface LeftSidebarProps {
  companies: Company[];
  totalCompanies: number;
  onCompanySelect: (company: Company) => void;
  sectorFilter: string[];
  employeeFilter: string[];
  locationFilter: string[];
  opportunityFilter: string[];
  digitalizationFilter: string[];
  onSectorChange: (sectors: string[]) => void;
  onEmployeeChange: (employees: string[]) => void;
  onLocationChange: (locations: string[]) => void;
  onOpportunityChange: (opportunities: string[]) => void;
  onDigitalizationChange: (digitalization: string[]) => void;
  onClearFilters: () => void;
}

/**
 * LeftSidebar - Premium Navigation Column
 * 
 * Part of the CSS grid layout - not floating.
 * Full height with light professional background.
 * Contains: KPIs, Filters, Company List
 */
export const LeftSidebar = ({
  companies,
  totalCompanies,
  onCompanySelect,
  sectorFilter,
  employeeFilter,
  locationFilter,
  opportunityFilter,
  digitalizationFilter,
  onSectorChange,
  onEmployeeChange,
  onLocationChange,
  onOpportunityChange,
  onDigitalizationChange,
  onClearFilters,
}: LeftSidebarProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasFilters = sectorFilter.length > 0 || employeeFilter.length > 0 || 
                     locationFilter.length > 0 || opportunityFilter.length > 0 || 
                     digitalizationFilter.length > 0;

  const toggleFilter = (current: string[], value: string, setter: (values: string[]) => void) => {
    if (current.includes(value)) {
      setter(current.filter(v => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  // Quick stats
  const highOpportunity = companies.filter(c => c.opportunityScore >= 80).length;
  const avgScore = companies.length > 0 
    ? Math.round(companies.reduce((acc, c) => acc + c.opportunityScore, 0) / companies.length)
    : 0;
  const totalLineas = companies.reduce((acc, c) => acc + (c.lineasMovil || 0), 0);

  return (
    <div className="h-full flex flex-col bg-sidebar">
      {/* Sidebar Header */}
      <div className="h-14 px-4 border-b border-sidebar-border flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-sidebar-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-sidebar-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm text-sidebar-foreground">Empresas</h2>
          <p className="text-xs text-sidebar-foreground/60">
            {companies.length} de {totalCompanies} resultados
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-3 py-3 border-b border-sidebar-border shrink-0">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-sidebar-accent/50 rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
              <span className="text-base font-bold text-sidebar-foreground">{highOpportunity}</span>
            </div>
            <p className="text-[10px] text-sidebar-foreground/60 font-medium">Alta Oport.</p>
          </div>
          <div className="bg-sidebar-accent/50 rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Target className="w-3.5 h-3.5 text-warning" />
              <span className="text-base font-bold text-sidebar-foreground">{avgScore}</span>
            </div>
            <p className="text-[10px] text-sidebar-foreground/60 font-medium">Score Medio</p>
          </div>
          <div className="bg-sidebar-accent/50 rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Zap className="w-3.5 h-3.5 text-sidebar-primary" />
              <span className="text-base font-bold text-sidebar-foreground">{totalLineas}</span>
            </div>
            <p className="text-[10px] text-sidebar-foreground/60 font-medium">Líneas Móvil</p>
          </div>
        </div>
      </div>

      {/* Collapsible Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="shrink-0 border-b border-sidebar-border">
        <CollapsibleTrigger className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-sidebar-accent/30 transition-colors">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sidebar-primary" />
            <span className="text-sm font-medium text-sidebar-foreground">Filtros</span>
            {hasFilters && (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-sidebar-primary text-sidebar-primary-foreground rounded-full">
                Activos
              </span>
            )}
          </div>
          {filtersOpen ? (
            <ChevronDown className="w-4 h-4 text-sidebar-foreground/60" />
          ) : (
            <ChevronRight className="w-4 h-4 text-sidebar-foreground/60" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-3">
            {hasFilters && (
              <button 
                onClick={onClearFilters}
                className="text-xs text-sidebar-primary hover:text-sidebar-primary/80 transition-colors font-medium"
              >
                Limpiar filtros
              </button>
            )}
            
            {/* Sector */}
            <div>
              <p className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-1.5">Sector</p>
              <div className="flex flex-wrap gap-1.5">
                {sectors.map((sector) => (
                  <button
                    key={sector.id}
                    onClick={() => toggleFilter(sectorFilter, sector.id, onSectorChange)}
                    className={cn(
                      "px-2 py-1 rounded-md text-xs font-medium transition-all border",
                      sectorFilter.includes(sector.id) 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary" 
                        : "bg-sidebar-accent/50 text-sidebar-foreground/80 border-sidebar-border hover:border-sidebar-primary/50"
                    )}
                  >
                    {sector.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Employees */}
            <div>
              <p className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-1.5">Empleados</p>
              <div className="flex flex-wrap gap-1.5">
                {employeeRanges.map((range) => (
                  <button
                    key={range.id}
                    onClick={() => toggleFilter(employeeFilter, range.id, onEmployeeChange)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-medium transition-all border",
                      employeeFilter.includes(range.id) 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary" 
                        : "bg-sidebar-accent/50 text-sidebar-foreground/80 border-sidebar-border hover:border-sidebar-primary/50"
                    )}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opportunity */}
            <div>
              <p className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-1.5">Oportunidad</p>
              <div className="flex flex-wrap gap-1.5">
                {opportunityLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => toggleFilter(opportunityFilter, level.id, onOpportunityChange)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-medium transition-all border",
                      opportunityFilter.includes(level.id) 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary" 
                        : "bg-sidebar-accent/50 text-sidebar-foreground/80 border-sidebar-border hover:border-sidebar-primary/50"
                    )}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Digitalization */}
            <div>
              <p className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-1.5">Digitalización</p>
              <div className="flex flex-wrap gap-1.5">
                {digitalizationLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => toggleFilter(digitalizationFilter, level.id, onDigitalizationChange)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-medium transition-all border",
                      digitalizationFilter.includes(level.id) 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary" 
                        : "bg-sidebar-accent/50 text-sidebar-foreground/80 border-sidebar-border hover:border-sidebar-primary/50"
                    )}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Company List - Dense list for fast scanning */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {companies.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-sidebar-accent/50 flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-6 h-6 text-sidebar-foreground/40" />
              </div>
              <p className="text-sm text-sidebar-foreground/60 font-medium">No hay empresas</p>
              <p className="text-xs text-sidebar-foreground/40 mt-1">Ajusta los filtros para ver resultados</p>
            </div>
          ) : (
            companies.map((company, index) => (
              <CompanyCard
                key={company.id}
                company={company}
                onClick={() => onCompanySelect(company)}
                index={index}
                compact
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
