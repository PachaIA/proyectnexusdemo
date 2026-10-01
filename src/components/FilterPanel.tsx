import { motion } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import { sectors, employeeRanges, locationTypes } from '@/data/companies';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  sectorFilter: string[];
  employeeFilter: string[];
  locationFilter: string[];
  onSectorChange: (sectors: string[]) => void;
  onEmployeeChange: (employees: string[]) => void;
  onLocationChange: (locations: string[]) => void;
  onClearFilters: () => void;
}

export const FilterPanel = ({
  sectorFilter,
  employeeFilter,
  locationFilter,
  onSectorChange,
  onEmployeeChange,
  onLocationChange,
  onClearFilters,
}: FilterPanelProps) => {
  const hasFilters = sectorFilter.length > 0 || employeeFilter.length > 0 || locationFilter.length > 0;

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
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-foreground">Filtros</h3>
        </div>
        {hasFilters && (
          <button 
            onClick={onClearFilters}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
            Limpiar
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Sector Filter */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Sector</p>
          <div className="flex flex-wrap gap-2">
            {sectors.map((sector) => (
              <button
                key={sector.id}
                onClick={() => toggleFilter(sectorFilter, sector.id, onSectorChange)}
                className={cn(
                  "filter-chip text-xs",
                  sectorFilter.includes(sector.id) && "active"
                )}
              >
                <span className="mr-1">{sector.icon}</span>
                {sector.label}
              </button>
            ))}
          </div>
        </div>

        {/* Employee Filter */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Empleados</p>
          <div className="flex flex-wrap gap-2">
            {employeeRanges.map((range) => (
              <button
                key={range.id}
                onClick={() => toggleFilter(employeeFilter, range.id, onEmployeeChange)}
                className={cn(
                  "filter-chip text-xs",
                  employeeFilter.includes(range.id) && "active"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location Filter */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Ubicación</p>
          <div className="flex flex-wrap gap-2">
            {locationTypes.map((loc) => (
              <button
                key={loc.id}
                onClick={() => toggleFilter(locationFilter, loc.id, onLocationChange)}
                className={cn(
                  "filter-chip text-xs",
                  locationFilter.includes(loc.id) && "active"
                )}
              >
                <span className="mr-1">{loc.icon}</span>
                {loc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
