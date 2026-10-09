import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { SlidersHorizontal, X } from 'lucide-react';

interface FilterChip {
  id: string;
  label: string;
  color?: string;
}

interface FilterGroup {
  label: string;
  chips: FilterChip[];
  active: string[];
  onChange: (values: string[]) => void;
}

interface MapFilterBarProps {
  groups: FilterGroup[];
  onClearAll: () => void;
  hasActive: boolean;
  companyCount: number;
  totalCount: number;
}

export const MapFilterBar = ({ groups, onClearAll, hasActive, companyCount, totalCount }: MapFilterBarProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const activeCount = groups.reduce((sum, g) => sum + g.active.length, 0);

  const toggle = (group: FilterGroup, id: string) => {
    if (group.active.includes(id)) {
      group.onChange(group.active.filter(v => v !== id));
    } else {
      group.onChange([...group.active, id]);
    }
  };

  if (isMobile) {
    return (
      <div className="relative z-[1000] flex flex-col gap-2" style={{ pointerEvents: 'none' }}>
        {/* Compact row: counter + filter toggle */}
        <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
          <div className="bg-card/95 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-border flex items-center gap-1.5 text-sm font-semibold">
            <span className="text-foreground">{companyCount}</span>
            <span className="text-muted-foreground font-normal">/ {totalCount}</span>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className={cn(
              "bg-card/95 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-border flex items-center gap-1.5 text-xs font-semibold transition-colors",
              activeCount > 0 ? "text-primary border-primary/50" : "text-foreground"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtros
            {activeCount > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </button>

          {hasActive && (
            <button
              onClick={() => { onClearAll(); setOpen(false); }}
              className="bg-destructive/90 text-destructive-foreground rounded-full p-2 shadow-lg"
              style={{ pointerEvents: 'auto' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Expandable filter panel */}
        {open && (
          <div
            className="bg-card/95 backdrop-blur-sm rounded-2xl shadow-lg border border-border p-3 flex flex-col gap-3 max-w-[calc(100vw-24px)]"
            style={{ pointerEvents: 'auto' }}
          >
            {groups.map((group) => (
              <div key={group.label}>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  {group.label}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {group.chips.map((chip) => {
                    const isActive = group.active.includes(chip.id);
                    return (
                      <button
                        key={chip.id}
                        onClick={() => toggle(group, chip.id)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                          isActive
                            ? "text-primary-foreground border-transparent shadow-sm"
                            : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                        )}
                        style={isActive && chip.color ? { background: chip.color, borderColor: chip.color } : undefined}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop: same as before
  return (
    <div
      className="relative z-[1000] flex items-center gap-3 flex-wrap"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="bg-card/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-border flex items-center gap-2 text-sm font-semibold"
        style={{ pointerEvents: 'auto' }}
      >
        <span className="text-foreground">{companyCount}</span>
        <span className="text-muted-foreground font-normal">/ {totalCount}</span>
      </div>

      {groups.map((group) => (
        <div
          key={group.label}
          className="bg-card/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-border flex items-center gap-1.5"
          style={{ pointerEvents: 'auto' }}
        >
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
            {group.label}
          </span>
          {group.chips.map((chip) => {
            const isActive = group.active.includes(chip.id);
            return (
              <button
                key={chip.id}
                onClick={() => toggle(group, chip.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                  isActive
                    ? "text-primary-foreground border-transparent shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                )}
                style={isActive && chip.color ? { background: chip.color, borderColor: chip.color } : undefined}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      ))}

      {hasActive && (
        <button
          onClick={onClearAll}
          className="bg-destructive/90 text-destructive-foreground rounded-full px-3 py-1.5 text-xs font-medium shadow-lg hover:bg-destructive transition-colors"
          style={{ pointerEvents: 'auto' }}
        >
          ✕ Limpiar
        </button>
      )}
    </div>
  );
};
