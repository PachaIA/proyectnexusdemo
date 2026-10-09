import { fmtEur } from '@/hooks/useOpportunityLines';
import { Money } from '@/components/Money';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, TrendingUp, Euro, Zap, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useSales } from '@/hooks/useSales';
import { useLeads } from '@/hooks/useLeads';
import { useCompScheme } from '@/hooks/useCompScheme';
import { rentBracketIndex, type CompScheme } from '@/lib/compScheme';
import { Button } from '@/components/ui/button';
import { computeQuarterKpis, rentLabel } from '@/lib/salesKpis';
import { getVodafoneFiscalQuarterLabel } from '@/lib/vodafoneFiscalQuarter';
import type { Sale } from '@/hooks/useSales';
import { cn } from '@/lib/utils';

const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 0 });

interface Opp {
  id: string;
  empresa: string;
  score: number;
  altas: number; // líneas estimadas
  snav: number; // SNAV estimado
  margen: number; // margen estimado
}

function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', className ?? 'bg-primary')} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Convierte una oportunidad del pipeline en una "venta simulada"
const oppToSale = (o: Opp): Sale => ({
  id: `sim-${o.id}`,
  company_id: o.id,
  fecha: new Date().toISOString().slice(0, 10),
  lineas_movil: o.altas,
  lineas_fibra: 0,
  snav: o.snav,
  margen: o.margen,
  producto_estrategico: false,
  producto: null,
  notas: null,
  created_at: '',
});

export default function ObjetivoTrimestre() {
  const { data: scheme, isPending, error } = useCompScheme();
  if (isPending) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!scheme) return <div role="alert" className="p-4 text-destructive">{error?.message ?? 'No hay un esquema de compensación activo.'}</div>;
  return <ObjetivoConEsquema scheme={scheme} />;
}

function ObjetivoConEsquema({ scheme }: { scheme: CompScheme }) {
  const navigate = useNavigate();
  const { sales, isLoading: loadingSales } = useSales();
  const { leads, isLoading: loadingLeads } = useLeads();
  const [closed, setClosed] = useState<Set<string>>(new Set());

  const target = scheme.target_units;
  const config = scheme.config;
  const tiers = config.snav_tiers;
  const rentMax = Math.max(...config.rent_brackets.flatMap(b => b.upper === null ? [] : [b.upper]));
  const lastTier = tiers[tiers.length - 1];
  const actual = useMemo(() => computeQuarterKpis(sales, scheme), [sales, scheme]);

  // Oportunidades abiertas del pipeline, ordenadas por probabilidad (NCS score)
  const opps = useMemo<Opp[]>(() =>
    leads
      .filter((l) => !l.archived_at && !['ganada', 'perdida'].includes(l.estado))
      .map((l) => {
        const s = config.simulation;
        const altas = Math.max(s.minimum_units, Math.round((l.tamano || s.fallback_employees) * s.units_per_employee));
        const margen = (l.arpu_estimado || s.fallback_margin_per_unit) * altas;
        return { id: l.id, empresa: l.empresa, score: l.opportunity_score || s.fallback_probability, altas, snav: margen * s.snav_margin_factor, margen };
      })
      .sort((a, b) => b.score - a.score),
   [leads, config]);

  const simulated = useMemo(() => {
    const extra = opps.filter((o) => closed.has(o.id)).map(oppToSale);
    return computeQuarterKpis([...sales, ...extra], scheme);
  }, [sales, opps, closed, scheme]);

  // Sugerencia de mínimo esfuerzo: menor número de cierres (mayor probabilidad primero) que cumple objetivo
  const suggestion = useMemo(() => {
    const picked: Opp[] = [];
    for (const o of opps) {
      const kpis = computeQuarterKpis([...sales, ...picked.map(oppToSale), oppToSale(o)], scheme);
      picked.push(o);
      if (kpis.altas >= target && kpis.multiplicador > actual.multiplicador) break;
      if (kpis.altas >= target && kpis.multiplicador >= config.multiplier_goal) break;
    }
    const kpis = computeQuarterKpis([...sales, ...picked.map(oppToSale)], scheme);
    const ok = picked.length > 0 && kpis.altas >= target;
    return { picked, ok, kpis };
  }, [opps, sales, target, actual.multiplicador, scheme, config]);

  // Qué falta
  const faltanAltas = Math.max(0, target - actual.altas);
  const nextTier = tiers.find((t) => actual.snav < t);
  const faltaSnav = nextTier ? nextTier - actual.snav : 0;
  // Keep the previous top-band cushion behaviour in this presentation-only refactor.
  const rentRowIdx = rentBracketIndex(actual.rentabilidadMedia, config.rent_brackets);
  const bandFloor = rentRowIdx > 0 && rentRowIdx < config.rent_brackets.length - 1 ? config.rent_brackets[rentRowIdx - 1].upper ?? 0 : 0;
  const margenSuelo = bandFloor * actual.altas; // margen mínimo para no caer de banda
  const margenActual = actual.rentabilidadMedia * actual.altas;
  const colchonMargen = margenActual - margenSuelo;
  const rentaEnRiesgo = actual.altas > 0 && actual.rentabilidadMedia - bandFloor < config.rent_risk_buffer;

  if (loadingSales || loadingLeads) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const toggle = (id: string) => setClosed((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const kpis = simulated; // lo mostrado refleja los cierres marcados
  const insight = suggestion.ok
    ? `Cerrando ${suggestion.picked.length === 1 ? 'esta operación' : `estas ${suggestion.picked.length} operaciones`} llegas al objetivo${suggestion.kpis.multiplicador > actual.multiplicador ? ' y subes el multiplicador' : ''}.`
    : faltanAltas > 0
      ? `Con el pipeline abierto no llegas al objetivo: te faltan ${faltanAltas} altas incluso cerrándolo todo.`
      : 'Objetivo de altas cubierto. El reto ahora es el multiplicador.';

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
      <header className="h-14 px-4 border-b border-border bg-card flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="-ml-2" aria-label="Volver">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-base font-semibold leading-tight">Cierre de trimestre</h1>
          <p className="text-[11px] text-muted-foreground">{getVodafoneFiscalQuarterLabel()}</p>
        </div>
        <div className="ml-auto"><ThemeToggle /></div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Dónde estoy */}
        <section className="rounded-lg border border-border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dónde estoy</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Target className="w-3.5 h-3.5" />Altas</div>
              <div className="text-xl font-bold">{kpis.altas}<span className="text-sm font-normal text-muted-foreground"> / {target}</span></div>
              <Bar value={kpis.altas} max={target} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><TrendingUp className="w-3.5 h-3.5" />SNAV</div>
              <div className="text-xl font-bold"><Money>{fmtEur(kpis.snav)}</Money></div>
              <Bar value={kpis.snav} max={nextTier ?? lastTier} />
              <div className="text-[10px] text-muted-foreground">Tramo {nextTier ? `< ${fmtEur(nextTier)}` : 'máximo'}</div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Euro className="w-3.5 h-3.5" />Rentabilidad/línea</div>
              <div className="text-xl font-bold"><Money>{fmtEur(kpis.rentabilidadMedia)}</Money></div>
              <Bar value={kpis.rentabilidadMedia} max={rentMax} />
              <div className="text-[10px] text-muted-foreground">Banda {rentLabel(kpis.rentabilidadMedia, scheme)}</div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Zap className="w-3.5 h-3.5" />Multiplicador</div>
              <div className={cn('text-xl font-bold', kpis.multiplicador >= config.multiplier_goal ? 'text-primary' : 'text-muted-foreground')}>×{kpis.multiplicador.toFixed(1)}</div>
              <Bar value={kpis.multiplicador} max={config.multiplier_cap} className={kpis.multiplicador >= config.multiplier_goal ? 'bg-primary' : 'bg-muted-foreground/40'} />
              {kpis.acelerador && <div className="text-[10px] text-primary">Acelerador activo (+{kpis.acceleratorBonus.toLocaleString('es-ES')})</div>}
            </div>
          </div>
        </section>

        {/* Qué me falta */}
        <section className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Qué me falta</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              {faltanAltas > 0
                ? <span>Te faltan <strong>{faltanAltas} altas</strong> para llegar al objetivo de {target}.</span>
                : <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" />Objetivo de altas cumplido.</span>}
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              {nextTier
                ? <span>Necesitas <strong><Money>{fmtEur(faltaSnav)}</Money> más de SNAV</strong> para saltar al siguiente tramo (<Money>{fmtEur(nextTier)}</Money>), un salto que mejora el multiplicador en toda la banda de rentabilidad.</span>
                : <span>Ya estás en el tramo máximo de SNAV (≥ <Money>{fmtEur(lastTier)}</Money>).</span>}
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              {actual.altas === 0
                ? <span>Aún no hay altas este trimestre: la rentabilidad media se definirá con las primeras ventas.</span>
                : rentaEnRiesgo
                  ? <span><strong>Rentabilidad en riesgo:</strong> estás a <Money>{fmtEur(colchonMargen)}</Money> de margen de caer de la banda {rentLabel(actual.rentabilidadMedia, scheme)}. Una venta de bajo margen puede bajarte el multiplicador.</span>
                  : <span>Rentabilidad cómoda en la banda {rentLabel(actual.rentabilidadMedia, scheme)}: tienes <Money>{fmtEur(colchonMargen)}</Money> de margen de colchón antes de caer de banda.</span>}
            </li>
          </ul>
        </section>

        {/* Simulador */}
        <section className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Simulador de escenarios</h2>
            {closed.size > 0 && <Button variant="link" size="sm" onClick={() => setClosed(new Set())}>Limpiar</Button>}
          </div>

          <div className="rounded-md bg-primary/10 border border-primary/30 p-3 flex gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{insight}</p>
          </div>

          {opps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay oportunidades abiertas en el pipeline.</p>
          ) : (
            <ul className="divide-y divide-border">
              {opps.map((o) => {
                const on = closed.has(o.id);
                return (
                  <li key={o.id} className="py-2.5 flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => toggle(o.id)}
                      className={cn(
                        'shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                        on ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {on ? 'La cierro' : 'No la cierro'}
                    </Button>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{o.empresa}</div>
                      <div className="text-[11px] text-muted-foreground">
                        ~{o.altas} líneas · ~<Money>{fmtEur(o.snav)}</Money> SNAV · probabilidad {o.score}%
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {closed.size > 0 && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <div className="font-medium">Con {closed.size} cierre{closed.size > 1 ? 's' : ''} marcado{closed.size > 1 ? 's' : ''}:</div>
              <div className="text-muted-foreground">
                {kpis.altas}/{target} altas · <Money>{fmtEur(kpis.snav)}</Money> SNAV · <Money>{fmtEur(kpis.rentabilidadMedia)}</Money>/línea · multiplicador ×{kpis.multiplicador.toFixed(1)}
                {kpis.multiplicador > actual.multiplicador && <span className="text-primary font-medium"> (sube de ×{actual.multiplicador.toFixed(1)})</span>}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
