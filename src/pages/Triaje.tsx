import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useScoredLeads } from '@/hooks/useScoredLeads';
import { Origen } from '@/data/companies';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Inbox, Flame, Users, CheckCircle2, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface BlockDef {
  id: Origen;
  label: string;
  buttonLabel: string;
  action: 'leads' | 'cola' | 'archivar';
  hot?: boolean;
}

const BLOCKS: BlockDef[] = [
  { id: 'wasp_alejandro_activo', label: 'Mis leads activos', buttonLabel: 'Ver mi cartera activa', action: 'leads' },
  { id: 'wasp_alejandro_asignado', label: 'Mi cola asignada', buttonLabel: 'Trabajar mi cola', action: 'leads' },
  { id: 'wasp_tamara_activo', label: 'Heredados de Tamara — activos', buttonLabel: 'Revisar heredados activos', action: 'leads', hot: true },
  { id: 'wasp_tamara_asignado', label: 'Heredados de Tamara — asignados', buttonLabel: 'Cola diaria (10 leads)', action: 'cola' },
  { id: 'scraping_enriquecido', label: 'Scraping enriquecido (sin dueño)', buttonLabel: 'Explorar leads sin dueño', action: 'leads' },
  { id: 'scraping_frio', label: 'Scraping frío (sin datos)', buttonLabel: 'Archivar todos', action: 'archivar' },
];

const Triaje = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { allLeads, isLoading } = useScoredLeads();
  const [archiving, setArchiving] = useState(false);

  const stats = useMemo(() => {
    const map: Record<string, { total: number; hot: number; conEmpleados: number; sinRevisar: number }> = {};
    for (const b of BLOCKS) map[b.id] = { total: 0, hot: 0, conEmpleados: 0, sinRevisar: 0 };
    for (const l of allLeads) {
      const o = l.origen as string | null;
      if (!o || !(o in map)) continue;
      const s = map[o];
      s.total += 1;
      if (l.isHot) s.hot += 1;
      if ((l.employees ?? 0) > 0) s.conEmpleados += 1;
      if (!l.triajeEstado) s.sinRevisar += 1;
    }
    return map;
  }, [allLeads]);

  const handleArchivarFrios = async () => {
    setArchiving(true);
    const ids = allLeads.filter((l) => l.origen === 'scraping_frio').map((l) => l.id);
    if (ids.length === 0) {
      setArchiving(false);
      return;
    }
    const { error } = await (supabase as any)
      .from('companies')
      .update({ triaje_estado: 'descartado', triaje_fecha: new Date().toISOString() })
      .in('id', ids);
    setArchiving(false);
    if (error) {
      toast({ title: 'Error al archivar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${ids.length} leads archivados`, description: 'Marcados como descartados.' });
    queryClient.invalidateQueries({ queryKey: ['companies'] });
  };

  const handleAction = (b: BlockDef) => {
    switch (b.action) {
      case 'leads': {
        const params = new URLSearchParams({ origen: b.id });
        if (b.hot) params.set('hot', 'true');
        navigate(`/leads?${params.toString()}`);
        return;
      }
      case 'cola':
        navigate('/triaje/cola');
        return;
      case 'archivar':
        // handled by AlertDialog inline
        return;
    }
  };

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Centro de Triaje</h1>
              <p className="text-xs text-muted-foreground">
                Revisión diaria de cartera. Decide qué trabajar y qué descartar.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BLOCKS.map((b) => {
                const s = stats[b.id];
                return (
                  <Card key={b.id} className="p-5 flex flex-col gap-4 hover:border-primary/50 transition-colors">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground leading-tight">{b.label}</h3>
                      <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">{s.total}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">leads</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                        <Flame className="w-3 h-3" /> {s.hot}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success">
                        <Users className="w-3 h-3" /> {s.conEmpleados} con empleados
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3" /> {s.sinRevisar} sin revisar
                      </span>
                    </div>
                    {b.action === 'archivar' ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="w-full gap-2" disabled={s.total === 0 || archiving}>
                            <Trash2 className="w-4 h-4" />
                            {b.buttonLabel}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Archivar {s.total} leads fríos?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Estos leads no tienen contacto ni empleados. Quedarán marcados como descartados, pero no se borran. Podrás recuperarlos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleArchivarFrios}>Archivar todos</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button onClick={() => handleAction(b)} className="w-full gap-2" disabled={s.total === 0}>
                        {b.buttonLabel}
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Triaje;
