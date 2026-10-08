import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLeads } from '@/hooks/useLeads';
import { useSales } from '@/hooks/useSales';
import { useOpportunityLines, fmtEur } from '@/hooks/useOpportunityLines';
import { editOpportunity, STAGE_LABEL } from '@/lib/opportunity';
import { localDateStr, nextActionLabel } from '@/lib/followUps';
import { summarizePipeline, summarizeClosedMonths, pendingActions, opportunityMargin } from '@/lib/dashboardSummary';

export const HoyTab = () => {
  const navigate = useNavigate();
  const { leads, isLoading, error } = useLeads();
  const { sales, isLoading: salesLoading } = useSales();
  const { lines } = useOpportunityLines();
  const pipeline = useMemo(() => summarizePipeline(leads, lines), [leads, lines]);
  const pending = useMemo(() => pendingActions(leads), [leads]);
  const months = useMemo(() => summarizeClosedMonths(sales), [sales]);
  const today = localDateStr(new Date());
  const dateLabel = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const monthLabel = (date: Date) => date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-7 text-foreground">
      <section aria-labelledby="dashboard-hoy">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 id="dashboard-hoy" className="text-lg font-semibold">Hoy <span className="text-sm text-muted-foreground font-normal">· Próximas acciones pendientes</span></h1>
          <Button asChild variant="ghost" size="sm"><Link to="/hoy">Seguimiento <ArrowRight /></Link></Button>
        </div>
        {error ? <p role="alert" className="text-destructive">No se pudieron cargar las oportunidades.</p> : isLoading ? <p className="text-muted-foreground py-4">Cargando...</p> : pending.length === 0 ? <p className="text-muted-foreground py-6">Nada pendiente hoy</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border"><tr><th className="text-left py-2 pr-3">Cliente / Oportunidad</th><th className="text-left px-3">Próxima acción</th><th className="text-left px-3">Fecha</th><th className="text-right px-3">Margen €</th><th><span className="sr-only">Llamar</span></th></tr></thead>
              <tbody>{pending.map(lead => {
                const date = lead.next_action_date;
                if (!date) return null;
                const overdue = date < today;
                return <tr key={lead.id} className="border-b border-border/60 hover:bg-muted/40">
                  <td className="py-2 pr-3"><Button variant="link" className="h-auto p-0 whitespace-normal text-left justify-start" onClick={() => editOpportunity(lead).catch(e => toast.error(e?.message || 'No se pudo guardar'))}>{lead.empresa}</Button><div className="text-xs text-muted-foreground">{STAGE_LABEL[pipeline.find(s => s.leads.some(l => l.id === lead.id))?.stage ?? 'lead']}</div></td>
                  <td className="px-3 py-2 min-w-40">{nextActionLabel(lead.next_action)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap tabular-nums ${overdue ? 'text-destructive' : date === today ? 'text-primary' : 'text-muted-foreground'}`}>{dateLabel(date)}<div className="text-xs">{overdue ? 'Vencida' : date === today ? 'Hoy' : 'Próxima'}</div></td>
                  <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{fmtEur(opportunityMargin(lead, lines))}</td>
                  <td><Button variant="ghost" size="icon" title="Modo llamada" aria-label={`Llamar a ${lead.empresa}`} onClick={() => navigate(`/llamada/${encodeURIComponent(lead.company_id)}`)}><PhoneCall /></Button></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="dashboard-pipeline" className="border-t border-border pt-5">
        <div className="flex justify-between items-center gap-3 mb-3"><h2 id="dashboard-pipeline" className="text-lg font-semibold">Pipeline por etapa</h2><Button asChild variant="ghost" size="sm"><Link to="/my-leads">Ver oportunidades <ArrowRight /></Link></Button></div>
        {isLoading ? <p className="text-muted-foreground">Cargando...</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-xs text-muted-foreground border-b border-border"><tr><th className="text-left py-2">Etapa</th><th className="text-right px-3">Oportunidades</th><th className="text-right">Margen €</th></tr></thead><tbody>{pipeline.map(s => <tr key={s.stage} className="border-b border-border/60"><td className="py-2 font-medium">{STAGE_LABEL[s.stage]}</td><td className="text-right px-3 tabular-nums">{s.leads.length}</td><td className="text-right py-2 tabular-nums">{fmtEur(s.margin)}{s.missing > 0 && <div className="text-xs text-muted-foreground">{s.missing} sin margen</div>}</td></tr>)}</tbody></table></div>}
      </section>

      <section aria-labelledby="dashboard-margen" className="border-t border-border pt-5">
        <h2 id="dashboard-margen" className="text-lg font-semibold mb-3">Margen cerrado · Este mes frente al mes pasado</h2>
        {salesLoading ? <p className="text-muted-foreground">Cargando...</p> : <>
          <div className="grid grid-cols-2 gap-6">
            <div><p className="text-sm text-muted-foreground capitalize">{monthLabel(months.currentStart)}</p><p className="text-2xl font-semibold tabular-nums mt-1">{fmtEur(months.current)}</p></div>
            <div><p className="text-sm text-muted-foreground capitalize">{monthLabel(months.previousStart)}</p><p className="text-2xl font-semibold tabular-nums mt-1">{fmtEur(months.previous)}</p></div>
          </div>
          <p className={`text-sm mt-3 ${months.current < months.previous ? 'text-destructive' : 'text-foreground'}`}>Diferencia: {months.current > months.previous ? '+' : ''}{fmtEur(months.current - months.previous)}</p>
          <p className="text-xs text-muted-foreground mt-2">Ventas registradas por fecha de venta · Mes actual hasta hoy.</p>
        </>}
      </section>
    </div>
  );
};
