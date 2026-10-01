import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, Building2, Target, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Company, sectors, employeeRanges, locationTypes, opportunityLevels, digitalizationLevels } from '@/data/companies';
import { CompanyCard } from './CompanyCard';
import { cn } from '@/lib/utils';

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
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
  onDigitalizationChange: (digitalizations: string[]) => void;
  onClearFilters: () => void;
}

export const RightPanel = ({
  isOpen,
  onClose,
  companies,
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
}: RightPanelProps) => {
  const [showFilters, setShowFilters] = useState(true);
  const hasFilters = sectorFilter.length > 0 || employeeFilter.length > 0 || locationFilter.length > 0 || opportunityFilter.length > 0 || digitalizationFilter.length > 0;

  const toggleFilter = (
    current: string[],
    value: string,
    setter: (values: string[]) => void
  ) => {
    if (current.includes(value)) {
      setter(current.filter(v => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-[9998]"
          />
          
          {/* Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[420px] bg-card border-l border-border shadow-2xl z-[9999] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                <h2 className="font-semibold">Empresas y Filtros</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-primary-foreground hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Filters Section */}
            <div className="border-b border-border">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-accent" />
                  <span className="font-medium text-foreground">Filtros</span>
                  {hasFilters && (
                    <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs">
                      Activos
                    </span>
                  )}
                </div>
                {showFilters ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 space-y-4">
                      {hasFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onClearFilters}
                          className="w-full"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Limpiar filtros
                        </Button>
                      )}

                      {/* Sector Filter */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> Sector
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {sectors.map((sector) => (
                            <button
                              key={sector.id}
                              onClick={() => toggleFilter(sectorFilter, sector.id, onSectorChange)}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                                sectorFilter.includes(sector.id)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border hover:border-primary/50"
                              )}
                            >
                              {sector.icon} {sector.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Employee Filter */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Nº Empleados</p>
                        <div className="flex flex-wrap gap-1.5">
                          {employeeRanges.map((range) => (
                            <button
                              key={range.id}
                              onClick={() => toggleFilter(employeeFilter, range.id, onEmployeeChange)}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                                employeeFilter.includes(range.id)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border hover:border-primary/50"
                              )}
                            >
                              {range.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Opportunity Level Filter */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Target className="w-3 h-3" /> Nivel Oportunidad
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {opportunityLevels.map((level) => (
                            <button
                              key={level.id}
                              onClick={() => toggleFilter(opportunityFilter, level.id, onOpportunityChange)}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                                opportunityFilter.includes(level.id)
                                  ? level.id === 'alta' ? "bg-green-500 text-white border-green-500" :
                                    level.id === 'media' ? "bg-yellow-500 text-white border-yellow-500" :
                                    "bg-red-500 text-white border-red-500"
                                  : "bg-background border-border hover:border-primary/50"
                              )}
                            >
                              {level.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Digitalization Filter */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Nivel Digitalización
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {digitalizationLevels.map((level) => (
                            <button
                              key={level.id}
                              onClick={() => toggleFilter(digitalizationFilter, level.id, onDigitalizationChange)}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                                digitalizationFilter.includes(level.id)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border hover:border-primary/50"
                              )}
                            >
                              {level.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Location Filter */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Ubicación</p>
                        <div className="flex flex-wrap gap-1.5">
                          {locationTypes.map((loc) => (
                            <button
                              key={loc.id}
                              onClick={() => toggleFilter(locationFilter, loc.id, onLocationChange)}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                                locationFilter.includes(loc.id)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border hover:border-primary/50"
                              )}
                            >
                              {loc.icon} {loc.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Company List */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  <span className="font-semibold text-foreground">{companies.length}</span> empresas encontradas
                </p>
                <div className="space-y-3">
                  {companies.map((company, index) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      index={index}
                      onClick={() => {
                        onCompanySelect(company);
                        onClose();
                      }}
                      compact
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
