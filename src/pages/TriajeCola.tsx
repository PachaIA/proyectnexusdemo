import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useScoredLeads, ScoredCompany } from '@/hooks/useScoredLeads';
import { HeritageBadge } from '@/components/HeritageBadge';
import { BUCKET_STYLE } from '@/lib/ncsScoring';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Trash2,
  Eye,
  Star,
  ChevronDown,
  MapPin,
  Phone,
  Globe,
  Users,
  Building2,
  Loader2,
  Inbox,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const QUEUE_SIZE = 10;
const REREVIEW_DAYS = 30;

type Decision = 'descartado' | 'revisado' | 'interesante';

const TriajeCola = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { allLeads, isLoading } = useScoredLeads();

  // Snapshot inicial (para no rebarajar al actualizar)
  const [queue, setQueue] = useState<ScoredCompany[] | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Record<Decision, number>>({
    descartado: 0,
    revisado: 0,
    interesante: 0,
  });

  const candidates = useMemo(() => {
    const cutoff = Date.now() - REREVIEW_DAYS * 24 * 60 * 60 * 1000;
    return allLeads
      .filter((l) => l.origen === 'wasp_tamara_asignado')
      .filter((l) => {
        if (!l.triajeEstado) return true;
        if (l.triajeEstado === 'revisado' && l.triajeFecha) {
          return new Date(l.triajeFecha).getTime() < cutoff;
        }
        return false;
      })
      .sort((a, b) => b.ncs.score - a.ncs.score)
      .slice(0, QUEUE_SIZE);
  }, [allLeads]);

  useEffect(() => {
    if (queue === null && !isLoading) setQueue(candidates);
  }, [candidates, queue, isLoading]);

  const current = queue?.[index];
  const total = queue?.length ?? 0;
  const done = queue && index >= total;

  const handleDecision = async (decision: Decision) => {
    if (!current || busy) return;
    setBusy(true);
    const now = new Date().toISOString();
    const update: Record<string, any> = {
      triaje_estado: decision,
      triaje_fecha: now,
    };
    if (decision === 'interesante') {
      update.origen = 'wasp_alejandro_activo';
      update.is_hot = true;
      const stamp = `\n[${new Date().toLocaleDateString('es-ES')}] Trasladado a cartera activa desde triaje.`;
      update.description = (current.description || '') + stamp;
    }

    const { error } = await (supabase as any)
      .from('companies')
      .update(update)
      .eq('id', current.id);

    setBusy(false);
    if (error) {
      toast({ title: 'Error al guardar', description: error.message, variant: 'destructive' });
      return;
    }
    setResults((r) => ({ ...r, [decision]: r[decision] + 1 }));
    setIndex((i) => i + 1);
    queryClient.invalidateQueries({ queryKey: ['companies'] });
  };

  if (isLoading || queue === null) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (queue.length === 0) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center px-6">
          <Card className="p-8 max-w-md text-center">
            <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-1">Cola vacía</h2>
            <p className="text-sm text-muted-foreground mb-4">
              No hay leads heredados pendientes de revisión hoy. Vuelve mañana.
            </p>
            <Button onClick={() => navigate('/triaje')}>Volver al Centro de Triaje</Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (done) {
    return (
      <MainLayout>
        <div className="h-full flex items-center justify-center px-6">
          <Card className="p-8 max-w-md text-center">
            <Star className="w-12 h-12 text-primary mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">¡Cola completada!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Hoy revisaste {total} leads: {results.descartado} descartados,{' '}
              {results.revisado} revisados, {results.interesante} marcados como
              interesantes. Vuelve mañana.
            </p>
            <Button onClick={() => navigate('/triaje')}>Ir al Centro de Triaje</Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!current) return null;

  const style = BUCKET_STYLE[current.ncs.bucket];
  const ci = (current.contactInfo ?? {}) as Record<string, string | undefined>;
  const phone = ci.telefono || ci.phone || current.contactoWasp || '';
  const remaining = total - index;

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto bg-muted/20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Progress */}
          <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
            <span>
              Lead <span className="font-bold text-foreground">{index + 1}</span> de {total} ·{' '}
              {remaining} restantes hoy
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigate('/triaje')}>
              Salir
            </Button>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(index / total) * 100}%` }}
            />
          </div>

          {/* Lead Card */}
          <Card className="p-6 mb-4">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="text-2xl font-bold text-foreground leading-tight inline-flex items-center">
                {current.name}
                <HeritageBadge origen={current.origen} />
              </h2>
            </div>
            <p className="text-sm text-muted-foreground capitalize mb-4">{current.sector}</p>

            {/* Score */}
            <div
              className="inline-flex items-center gap-3 px-4 py-2 rounded-lg mb-5"
              style={{ background: style.bg, color: style.fg }}
            >
              <span className="text-3xl font-extrabold tabular-nums">{current.ncs.score}</span>
              <div className="flex flex-col">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: style.marker }}
                  />
                  {style.label}
                </span>
                <span className="text-[10px] opacity-70">{current.ncs.priority}</span>
              </div>
            </div>

            {/* Datos visibles */}
            <div className="space-y-2 text-sm">
              {current.address && (
                <div className="flex items-start gap-2 text-foreground">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>{current.address}</span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${phone}`} className="text-primary hover:underline">
                    {phone}
                  </a>
                </div>
              )}
              {current.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <a
                    href={current.website.startsWith('http') ? current.website : `https://${current.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {current.website}
                  </a>
                </div>
              )}
              {(current.employees ?? 0) > 0 && (
                <div className="flex items-center gap-2 text-foreground">
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{current.employees} empleados</span>
                </div>
              )}
              {current.operadorActual && (
                <div className="flex items-center gap-2 text-foreground">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>Operador actual: {current.operadorActual}</span>
                </div>
              )}
            </div>

            {/* Reasons */}
            {current.ncs.reasons.length > 0 && (
              <Collapsible className="mt-5 border-t border-border pt-4">
                <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <ChevronDown className="w-3 h-3" /> Por qué este score
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1">
                  {current.ncs.reasons.map((r, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      · {r}
                    </p>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Notas */}
            {current.description && (
              <div className="mt-4 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground whitespace-pre-line">
                {current.description}
              </div>
            )}
          </Card>

          {/* Botones de decisión */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="lg"
              className="h-14 gap-2 flex-col"
              onClick={() => handleDecision('descartado')}
              disabled={busy}
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-xs">Descartar</span>
            </Button>
            <Button
              size="lg"
              className="h-14 gap-2 flex-col bg-primary hover:bg-primary text-primary-foreground"
              onClick={() => handleDecision('revisado')}
              disabled={busy}
            >
              <Eye className="w-5 h-5" />
              <span className="text-xs">Revisado</span>
            </Button>
            <Button
              size="lg"
              className="h-14 gap-2 flex-col text-primary-foreground hover:opacity-90"
              style={{ background: 'var(--alert-text)' }}
              onClick={() => handleDecision('interesante')}
              disabled={busy}
            >
              <Star className="w-5 h-5" />
              <span className="text-xs">Interesante</span>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TriajeCola;
