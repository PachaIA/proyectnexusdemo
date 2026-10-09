import { useNavigate, useLocation } from 'react-router-dom';
import { Bookmark, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSavedViews } from '@/hooks/useUrlView';

interface Props {
  page: string;
  views: { id: string; label: string }[];
  current: string;
  onChange: (id: string) => void;
  query: string;
}

/** Selector de vista + vistas guardadas. Común a Clientes y Pipeline. */
export const ViewToolbar = ({ page, views, current, onChange, query }: Props) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { views: saved, save, remove } = useSavedViews(page);

  const handleSave = () => {
    const label = window.prompt('Nombre de la vista');
    if (!label?.trim()) return;
    save(label.trim(), query);
    toast.success(`Vista «${label.trim()}» guardada`);
  };

  return (
    <div className="flex items-center gap-2">
      <ToggleGroup type="single" value={current} onValueChange={v => v && onChange(v)} aria-label="Vista" className="border border-border rounded-md p-0.5">
        {views.map(v => <ToggleGroupItem key={v.id} value={v.id} size="sm" className="h-7 px-3 text-xs">{v.label}</ToggleGroupItem>)}
      </ToggleGroup>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs"><Bookmark className="w-3.5 h-3.5" /> Vistas{saved.length ? ` (${saved.length})` : ''}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem onSelect={handleSave}>Guardar vista actual…</DropdownMenuItem>
          {saved.length > 0 && <><DropdownMenuSeparator /><DropdownMenuLabel className="text-xs">Vistas guardadas</DropdownMenuLabel></>}
          {saved.map(v => (
            <DropdownMenuItem key={v.label} onSelect={() => navigate(`${pathname}${v.query ? `?${v.query}` : ''}`)} className="justify-between gap-3">
              <span className="truncate">{v.label}</span>
              <button type="button" aria-label={`Eliminar vista ${v.label}`} className="text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); e.preventDefault(); remove(v.label); }}><Trash2 className="w-3.5 h-3.5" /></button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
