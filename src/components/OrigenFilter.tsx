import { Origen, ORIGEN_OPTIONS } from '@/data/companies';
import { OriginCounts } from '@/hooks/useScoredLeads';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrigenFilterProps {
  selected: Origen[];
  counts: OriginCounts;
  onChange: (next: Origen[]) => void;
  className?: string;
}

export const OrigenFilter = ({ selected, counts, onChange, className }: OrigenFilterProps) => {
  const total = ORIGEN_OPTIONS.length;
  const allOn = selected.length === total;

  const toggle = (id: Origen, checked: boolean) => {
    if (checked) onChange(Array.from(new Set([...selected, id])));
    else onChange(selected.filter((x) => x !== id));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-2 h-9 px-3 rounded-full border border-border bg-card text-xs font-medium hover:bg-muted/50 transition-colors',
            className,
          )}
        >
          <span>Origen</span>
          <span className="inline-flex items-center justify-center min-w-[22px] px-1.5 h-5 rounded-full text-[10px] font-bold bg-muted">
            {allOn ? 'Todos' : selected.length}
          </span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Origen del lead</span>
          <button
            className="text-[10px] text-primary hover:underline"
            onClick={(e) => {
              e.preventDefault();
              onChange(allOn ? [] : ORIGEN_OPTIONS.map((o) => o.id));
            }}
          >
            {allOn ? 'Ninguno' : 'Todos'}
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ORIGEN_OPTIONS.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.id}
            checked={selected.includes(opt.id)}
            onCheckedChange={(c) => toggle(opt.id, !!c)}
            onSelect={(e) => e.preventDefault()}
            className="text-xs"
          >
            <span className="flex-1">{opt.label}</span>
            <span className="ml-2 text-[10px] text-muted-foreground tabular-nums">
              {counts[opt.id] ?? 0}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
