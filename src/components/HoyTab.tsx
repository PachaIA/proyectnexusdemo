import { Money } from '@/components/Money';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, PhoneCall, CalendarClock, Layers3, TrendingUp, Clock3, CheckCircle2, Circle, FileText, Handshake, XCircle, BriefcaseBusiness, UserRoundSearch } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLeads } from '@/hooks/useLeads';
import { useSales } from '@/hooks/useSales';
import { useOpportunityLines, fmtEur } from '@/hooks/useOpportunityLines';
import { editOpportunity, STAGE_LABEL, normalizeStage } from '@/lib/opportunity';
import { localDateStr, nextActionLabel } from '@/lib/followUps';
import { summarizePipeline, summarizeClosedMonths, pendingActions, opportunityMargin } from '@/lib/dashboardSummary';
import { AgendaTab } from '@/components/AgendaTab';
import { Button } from '@/components/ui/button';
import type { Company } from '@/data/companies';

export const HoyTab = ({ companies, selected, onSelect, detail }: { companies: Company[]; selected: Company | null; onSelect: (company: Company) => void; detail?: ReactNode }) => {
  const navigate = useNavigate();
  const [actionsView, setActionsView] = useState<'lista' | 'calendario'>('lista');
  const { leads, isLoading, error } = useLeads();
  const { sales, isLoading: salesLoading } = useSales();
  const { lines } = useOpportunityLines();
  const pipeline = useMemo(() => summarizePipeline(leads, lines), [leads, lines]);
  const pending = useMemo(() => pendingActions(leads), [leads]);
  const months = useMemo(() => summarizeClosedMonths(sales), [sales]);
  const today = localDateStr(new Date());
  const overdueCount = pending.filter(lead => (lead.next_action_date ?? '') < today).length;
  const todayCount = pending.filter(lead => lead.next_action_date === today).length;
  const laterCount = pending.length - overdueCount - todayCount;
  const stageIcons = { lead: Circle, contactado: PhoneCall, propuesta: FileText, negociacion: Handshake, ganada: CheckCircle2, perdida: XCircle };
  const stageTones = { lead: 'text-muted-foreground bg-muted/40', contactado: 'text-info bg-info/10', propuesta: 'text-warning bg-warning/10', negociacion: 'text-primary bg-primary/10', ganada: 'text-success bg-success/10', perdida: 'text-destructive bg-destructive/10' };
  const barTones = { lead: '[&>div]:bg-muted-foreground', contactado: '[&>div]:bg-info', propuesta: '[&>div]:bg-warning', negociacion: '[&>div]:bg-primary', ganada: '[&>div]:bg-success', perdida: '[&>div]:bg-destructive' };
  const largestMonth = Math.max(Math.abs(months.current), Math.abs(months.previous), 1);
  const dateLabel = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const monthLabel = (date: Date) => date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-7 text-foreground motion-safe:animate-fade-in">
      <section aria-labelledby="dashboard-briefing">
        <div className="flex items-center gap-3 mb-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><BriefcaseBusiness className="h-5 w-5" /></span><div><h1 id="dashboard-briefing" className="text-xl font-semibold">Briefing diario</h1><p className="text-xs text-muted-foreground">Elige el cliente que vas a trabajar ahora</p></div></div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {companies.filter(c => !c.archivedAt).slice(0, 8).map(company => <Button key={company.id} variant={selected?.id === company.id ? 'default' : 'outline'} size="sm" onClick={() => onSelect(company)} className="shrink-0">{company.name}</Button>)}
        </div>
      </section>

      <section aria-labelledby="dashboard-hoy">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><CalendarClock className="h-5 w-5" /></span><div><h1 id="dashboard-hoy" className="text-xl font-semibold">Hoy</h1><p className="text-xs text-muted-foreground">Próximas acciones pendientes</p></div></div>
          <div className="flex border border-border rounded-md p-1"><Button variant={actionsView === 'lista' ? 'default' : 'ghost'} size="sm" onClick={() => setActionsView('lista')}>Lista</Button><Button variant={actionsView === 'calendario' ? 'default' : 'ghost'} size="sm" onClick={() => setActionsView('calendario')}>Calendario</Button></div>
        </div>
        {actionsView === 'calendario' ? <AgendaTab onCompanySelect={onSelect} /> : <>
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
          {[{ label: 'Vencidas', count: overdueCount, tone: 'text-destructive', icon: Clock3 }, { label: 'Hoy', count: todayCount, tone: 'text-primary', icon: CalendarClock }, { label: 'Próximas', count: laterCount, tone: 'text-info', icon: ArrowRight }].map(item => <div key={item.label} className="rounded-md bg-card p-3 sm:p-4"><div className={`flex items-center justify-between gap-2 ${item.tone}`}><span className="text-xs sm:text-sm font-medium">{item.label}</span><item.icon className="h-4 w-4 shrink-0" /></div><p className={`mt-2 text-3xl font-semibold tabular-nums ${item.tone}`}>{isLoading ? '—' : item.count}</p></div>)}
        </div>
        {error ? <p role="alert" className="text-destructive">No se pudieron cargar las oportunidades.</p> : isLoading ? <p className="text-muted-foreground py-4">Cargando...</p> : pending.length === 0 ? <p className="text-muted-foreground py-6">Nada pendiente hoy</p> : (
          <div className="overflow-x-auto border-y border-border">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border"><tr><th className="text-left py-2 pr-3">Cliente / Oportunidad</th><th className="text-left px-3">Próxima acción</th><th className="text-left px-3">Fecha</th><th className="text-right px-3">Margen €</th><th><span className="sr-only">Llamar</span></th></tr></thead>
              <tbody>{pending.map(lead => {
                const date = lead.next_action_date;
                if (!date) return null;
                const overdue = date < today;
                return <tr key={lead.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40 even:bg-card/30">
                  <td className="py-3 pr-3"><Button variant="link" className="h-auto p-0 whitespace-normal text-left justify-start text-foreground hover:text-primary" onClick={() => editOpportunity(lead).catch(e => toast.error(e?.message || 'No se pudo guardar'))}>{lead.empresa}</Button><div className="text-xs text-muted-foreground mt-1">{STAGE_LABEL[normalizeStage(lead.estado)]}</div></td>
                  <td className="px-3 py-2 min-w-40">{nextActionLabel(lead.next_action)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap tabular-nums ${overdue ? 'text-destructive' : date === today ? 'text-primary' : 'text-muted-foreground'}`}>{dateLabel(date)}<div className="text-xs">{overdue ? 'Vencida' : date === today ? 'Hoy' : 'Próxima'}</div></td>
                  <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums"><Money>{fmtEur(opportunityMargin(lead, lines))}</Money></td>
                  <td><Button variant="ghost" size="icon" title="Modo llamada" aria-label={`Llamar a ${lead.empresa}`} onClick={() => navigate(`/llamada/${encodeURIComponent(lead.company_id)}`)}><PhoneCall /></Button></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}</>}
      </section>

      <section aria-labelledby="dashboard-pipeline" className="border-t border-border pt-5">
        <div className="flex justify-between items-center gap-3 mb-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning"><Layers3 className="h-5 w-5" /></span><h2 id="dashboard-pipeline" className="text-lg font-semibold">Pipeline por etapa</h2></div><Button asChild variant="ghost" size="sm"><Link to="/pipeline">Ver oportunidades <ArrowRight /></Link></Button></div>
        {isLoading ? <p className="text-muted-foreground">Cargando...</p> : <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{pipeline.map(s => {
          const Icon = stageIcons[s.stage];
          return <div key={s.stage} className="rounded-md bg-card p-4 min-w-0"><div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-md shrink-0 ${stageTones[s.stage]}`}><Icon className="h-4 w-4" /></span><h3 className="text-sm font-medium">{STAGE_LABEL[s.stage]}</h3></div><p className="text-3xl font-semibold tabular-nums mt-4">{s.leads.length}</p><p className="text-xs text-muted-foreground mt-1">Oportunidades</p><Progress aria-label={`Proporción de oportunidades en ${STAGE_LABEL[s.stage]}`} value={s.leads.length / Math.max(pipeline.reduce((sum, stage) => sum + stage.leads.length, 0), 1) * 100} className={`h-1 mt-3 ${barTones[s.stage]}`} /><div className="border-t border-border mt-4 pt-3"><p className="text-xs text-muted-foreground">Margen €</p><p className="text-base font-semibold tabular-nums break-words mt-1"><Money>{fmtEur(s.margin)}</Money></p><p className="text-xs text-muted-foreground mt-1 min-h-4">{s.missing > 0 ? `${s.missing} sin margen` : '\u00a0'}</p></div></div>;
        })}</div>}
      </section>

      <section aria-labelledby="dashboard-client" className="border-t border-border pt-5">
        <div className="flex items-center gap-3 mb-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info"><UserRoundSearch className="h-5 w-5" /></span><div><h2 id="dashboard-client" className="text-lg font-semibold">Cliente / Oportunidad</h2><p className="text-xs text-muted-foreground">Ficha de trabajo y briefing comercial</p></div></div>
        {detail ?? <p className="text-sm text-muted-foreground py-6">Selecciona un cliente en el briefing para abrir su oportunidad.</p>}
      </section>

      <section aria-labelledby="dashboard-margen" className="border-t border-border pt-5">
        <div className="flex items-center gap-3 mb-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success"><TrendingUp className="h-5 w-5" /></span><div><h2 id="dashboard-margen" className="text-lg font-semibold">Margen cerrado</h2><p className="text-xs text-muted-foreground">Este mes frente al mes pasado</p></div></div>
        {salesLoading ? <p className="text-muted-foreground">Cargando...</p> : <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="nexus-money-card pl-4 py-2"><p className="text-sm text-muted-foreground capitalize">{monthLabel(months.currentStart)}</p><p className="text-3xl font-semibold tabular-nums mt-2 break-words"><Money>{fmtEur(months.current)}</Money></p><Progress aria-label="Margen del mes actual respecto al mayor importe" value={Math.abs(months.current) / largestMonth * 100} className="h-2 mt-4 [&>div]:bg-success" /></div>
            <div className="nexus-money-card pl-4 py-2"><p className="text-sm text-muted-foreground capitalize">{monthLabel(months.previousStart)}</p><p className="text-3xl font-semibold tabular-nums mt-2 break-words"><Money>{fmtEur(months.previous)}</Money></p><Progress aria-label="Margen del mes pasado respecto al mayor importe" value={Math.abs(months.previous) / largestMonth * 100} className="h-2 mt-4 [&>div]:bg-muted-foreground" /></div>
          </div>
          <p className={`text-sm font-medium mt-4 ${months.current < months.previous ? 'text-destructive' : months.current > months.previous ? 'text-success' : 'text-foreground'}`}>Diferencia: {months.current > months.previous ? '+' : ''}<Money>{fmtEur(months.current - months.previous)}</Money></p>
          <p className="text-xs text-muted-foreground mt-2">Ventas registradas por fecha de venta · Mes actual hasta hoy.</p>
        </>}
      </section>
    </div>
  );
};
