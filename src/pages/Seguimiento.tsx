import { Money } from '@/components/Money';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useOpportunityLines, rollUp, fmtEur } from '@/hooks/useOpportunityLines';
import { editOpportunity, STAGE_LABEL, normalizeStage } from '@/lib/opportunity';
import { nextActionLabel } from '@/lib/followUps';
import type { Lead } from '@/hooks/useLeads';

const fmtDate = (d: string) => new Date(d + 'T00:00').toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' });

const Seguimiento = () => {
  const { overdue, today, upcoming, isLoading } = useFollowUps();
  const { lines } = useOpportunityLines();

  const marginOf = useMemo(() => {
    const by = new Map<string, typeof lines>();
    lines.forEach((l) => by.set(l.lead_id, [...(by.get(l.lead_id) || []), l]));
    return (lead: Lead) => {
      const ls = by.get(lead.id);
      if (ls?.length) return rollUp(ls).margin_eur;
      return lead.margen_estimado_eur ?? null;
    };
  }, [lines]);

  const open = (lead: Lead) => editOpportunity(lead).catch((e) => toast.error(e?.message || 'No se pudo guardar'));

  const Section = ({ title, rows, tone }: { title: string; rows: Lead[]; tone: string }) => rows.length === 0 ? null : (
    <section className="mb-5">
      <h2 className={`text-xs font-mono tracking-widest mb-1 ${tone}`}>{title} ({rows.length})</h2>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr><th className="text-left py-1 px-2">Cliente</th><th className="text-left px-2">Oportunidad</th><th className="text-left px-2">Próxima acción</th><th className="text-left px-2">Fecha</th><th className="text-right px-2">Margen €</th></tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id} onClick={() => open(l)} className="border-t border-border cursor-pointer hover:bg-muted/40">
              <td className="py-2 px-2 font-medium">{l.empresa}</td>
              <td className="px-2 text-muted-foreground">{STAGE_LABEL[normalizeStage(l.estado)]}{l.importe_mensual_eur != null ? <> · <Money>{fmtEur(l.importe_mensual_eur)}</Money>/mes</> : ''}</td>
              <td className="px-2">{nextActionLabel(l.next_action)}</td>
              <td className={`px-2 tabular-nums ${tone}`}>{fmtDate(l.next_action_date!)}</td>
              <td className="px-2 text-right tabular-nums"><Money>{fmtEur(marginOf(l))}</Money></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );

  const empty = !isLoading && overdue.length + today.length + upcoming.length === 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-5">
        <h1 className="text-lg font-semibold mb-4">Seguimiento</h1>
        {empty ? (
          <p className="text-muted-foreground py-12 text-center">Nada pendiente hoy</p>
        ) : (
          <div className="rounded-xl border border-border bg-card p-3 overflow-x-auto">
            <Section title="VENCIDAS" rows={overdue} tone="text-destructive" />
            <Section title="HOY" rows={today} tone="text-primary" />
            <Section title="PRÓXIMOS 7 DÍAS" rows={upcoming} tone="text-muted-foreground" />
            {overdue.length + today.length === 0 && <p className="text-sm text-muted-foreground px-2 pb-2">Nada pendiente hoy</p>}
          </div>
        )}
      </main>
    </div>
  );
};

export default Seguimiento;
