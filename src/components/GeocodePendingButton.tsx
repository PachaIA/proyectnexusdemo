import { refreshCompanies } from '@/lib/queryClient';
import { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const GeocodePendingButton = () => {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ actualizados: number; restantes: number } | null>(null);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setProgress(null);
    let totalActualizados = 0;
    try {
      for (let i = 0; i < 200; i++) {
        const { data, error } = await supabase.functions.invoke('geocode-companies', { body: {} });
        if (error) throw error;
        if (!data) break;
        totalActualizados += data.actualizados ?? 0;
        setProgress({ actualizados: totalActualizados, restantes: data.restantes ?? 0 });
        if ((data.restantes ?? 0) === 0 || (data.procesados ?? 0) === 0) break;
        await new Promise((r) => setTimeout(r, 300));
      }
      toast.success(`Geocodificación completada: ${totalActualizados} actualizados`);
      refreshCompanies();
    } catch (e: any) {
      console.error(e);
      toast.error('Error geocodificando: ' + (e?.message ?? ''));
    } finally {
      setRunning(false);
    }
  };

  return (
    <button
      onClick={run}
      disabled={running}
      className="h-9 px-3 rounded-xl text-xs font-medium bg-card border border-border hover:bg-accent flex items-center gap-2 disabled:opacity-60"
      title="Geocodificar empresas sin coordenadas"
    >
      {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
      {running && progress
        ? `Geocodificando… ${progress.actualizados} / faltan ${progress.restantes}`
        : 'Geocodificar pendientes'}
    </button>
  );
};
