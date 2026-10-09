import { Money } from '@/components/Money';
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, ListPlus, Trash2, AlertTriangle } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';
import { useOpportunityLines, lineMargin, rollUp, fmtEur, fmtPct, type OpportunityLine } from '@/hooks/useOpportunityLines';
import { STAGE_LABEL, normalizeStage, missingFields } from '@/lib/opportunity';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';

type OppLead = Lead & { fecha_cierre_prevista?: string | null; importe_mensual_eur?: number | null; margen_estimado_eur?: number | null };
type SortKey = 'empresa' | 'estado' | 'cierre' | 'ingreso' | 'margen' | 'pct';

const num = (v: string) => { const n = Number(v.replace(/\./g, '').replace(',', '.')); return isNaN(n) ? null : n; };

const LinesEditor = ({ lead, lines, onClose }: { lead: OppLead; lines: OpportunityLine[]; onClose: () => void }) => {
  const { saveLine, deleteLine } = useOpportunityLines();
  const [draft, setDraft] = useState({ producto: '', cantidad: '1', rev: '', cost: '' });
  const [err, setErr] = useState<string | null>(null);
  const total = rollUp(lines);

  const add = async () => {
    const rev = num(draft.rev), cost = num(draft.cost), qty = parseInt(draft.cantidad, 10);
    if (!draft.producto.trim()) return setErr('Falta el producto o línea');
    if (rev == null || draft.rev.trim() === '') return setErr('Falta el ingreso mensual');
    if (cost == null || draft.cost.trim() === '') return setErr('Falta el coste mensual');
    if (rev < 0 || cost < 0) return setErr('Ingreso y coste no pueden ser negativos');
    setErr(null);
    try {
      await saveLine({ lead_id: lead.id, producto: draft.producto.trim(), cantidad: isNaN(qty) ? 1 : qty, monthly_revenue: rev, monthly_cost: cost });
      setDraft({ producto: '', cantidad: '1', rev: '', cost: '' });
    } catch { toast.error('No se pudo guardar la línea'); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Líneas de {lead.empresa}</DialogTitle></DialogHeader>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr><th className="text-left py-1">Producto / línea</th><th className="text-right">Uds.</th><th className="text-right">Ingreso mensual</th><th className="text-right">Coste mensual</th><th className="text-right">Margen €</th><th className="text-right">Margen %</th><th /></tr>
          </thead>
          <tbody>
            {lines.map((l) => { const m = lineMargin(l); return (
              <tr key={l.id} className="border-t border-border">
                <td className="py-1">{l.producto}</td><td className="text-right">{l.cantidad}</td>
                <td className="text-right tabular-nums"><Money>{fmtEur(Number(l.monthly_revenue))}</Money></td>
                <td className="text-right tabular-nums"><Money>{fmtEur(Number(l.monthly_cost))}</Money></td>
                <td className={`text-right tabular-nums ${m.margin_eur < 0 ? 'text-destructive' : ''}`}><Money>{fmtEur(m.margin_eur)}</Money></td>
                <td className="text-right tabular-nums">{fmtPct(m.margin_pct)}</td>
                <td className="text-right"><button aria-label="Eliminar línea" onClick={() => deleteLine(l.id)}><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button></td>
              </tr>); })}
            <tr className="border-t border-border font-semibold">
              <td className="py-1">Total</td><td />
              <td className="text-right tabular-nums"><Money>{fmtEur(total.monthly_revenue)}</Money></td><td />
              <td className="text-right tabular-nums"><Money>{fmtEur(total.margin_eur)}</Money></td>
              <td className="text-right tabular-nums">{fmtPct(total.margin_pct)}</td><td />
            </tr>
          </tbody>
        </table>
        <div className="grid grid-cols-[2fr_0.6fr_1fr_1fr_auto] gap-2 items-end pt-2">
          <Input placeholder="Producto o línea" value={draft.producto} onChange={(e) => setDraft({ ...draft, producto: e.target.value })} />
          <Input placeholder="Uds." inputMode="numeric" value={draft.cantidad} onChange={(e) => setDraft({ ...draft, cantidad: e.target.value })} />
          <Input placeholder="Ingreso €/mes" inputMode="decimal" value={draft.rev} onChange={(e) => setDraft({ ...draft, rev: e.target.value })} />
          <Input placeholder="Coste €/mes" inputMode="decimal" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} />
          <Button onClick={add}>Añadir</Button>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </DialogContent>
    </Dialog>
  );
};

export const OpportunityList = ({ leads }: { leads: OppLead[] }) => {
  const { lines } = useOpportunityLines();
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'margen', dir: -1 });
  const [editingLines, setEditingLines] = useState<OppLead | null>(null);

  const rows = useMemo(() => {
    const byLead = new Map<string, OpportunityLine[]>();
    lines.forEach((l) => byLead.set(l.lead_id, [...(byLead.get(l.lead_id) || []), l]));
    const r = leads.map((lead) => {
      const ls = byLead.get(lead.id) || [];
      const t = rollUp(ls);
      return { lead, ls, ...t, missing: missingFields(lead) };
    });
    const val = (x: typeof r[number]): string | number => {
      switch (sort.k) {
        case 'empresa': return x.lead.empresa.toLowerCase();
        case 'estado': return normalizeStage(x.lead.estado);
        case 'cierre': return x.lead.fecha_cierre_prevista || '9999';
        case 'ingreso': return x.ls.length ? x.monthly_revenue : -Infinity;
        case 'margen': return x.ls.length ? x.margin_eur : -Infinity;
        case 'pct': return x.margin_pct ?? -Infinity;
      }
    };
    return r.sort((a, b) => { const A = val(a), B = val(b); return (A < B ? -1 : A > B ? 1 : 0) * sort.dir; });
  }, [leads, lines, sort]);

  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th className={`py-2 px-2 cursor-pointer select-none whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : (k === 'empresa' || k === 'cierre' ? 1 : -1) }))}>
      {children}{' '}
      {sort.k !== k ? <ArrowUpDown className="w-3 h-3 inline opacity-40" /> : sort.dir === 1 ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />}
    </th>
  );

  return (
    <div className="rounded-xl border border-border bg-card mb-5 overflow-x-auto">
      <div className="px-4 pt-3 pb-1 text-xs font-mono tracking-widest text-muted-foreground">// LISTA DE OPORTUNIDADES ({leads.length})</div>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <Th k="empresa">Cliente</Th><Th k="estado">Etapa</Th><Th k="cierre">Cierre previsto</Th>
            <Th k="ingreso" right>Ingreso mensual</Th><Th k="margen" right>Margen €</Th><Th k="pct" right>Margen %</Th>
            <th className="py-2 px-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ lead, ls, monthly_revenue, margin_eur, margin_pct, missing }) => (
            <tr key={lead.id} className="border-t border-border">
              <td className="py-1.5 px-2 font-medium">
                {lead.empresa}
                {missing.length > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-destructive" title={`Faltan: ${missing.join(', ')}`}>
                    <AlertTriangle className="w-3 h-3" /> Faltan: {missing.join(', ')}
                  </span>
                )}
              </td>
              <td className="px-2">{STAGE_LABEL[normalizeStage(lead.estado)]}</td>
              <td className="px-2 tabular-nums">{lead.fecha_cierre_prevista ? new Date(lead.fecha_cierre_prevista + 'T00:00').toLocaleDateString('es-ES') : '—'}</td>
              <td className="px-2 text-right tabular-nums"><Money>{ls.length ? fmtEur(monthly_revenue) : '—'}</Money></td>
              <td className={`px-2 text-right tabular-nums ${ls.length && margin_eur < 0 ? 'text-destructive' : ''}`}><Money>{ls.length ? fmtEur(margin_eur) : '—'}</Money></td>
              <td className="px-2 text-right tabular-nums">{fmtPct(margin_pct)}</td>
              <td className="px-2 text-right whitespace-nowrap">
                <Button asChild size="sm" variant="ghost" className="h-7 px-2"><Link to={`/clientes/${encodeURIComponent(lead.company_id)}`}><ExternalLink className="w-3.5 h-3.5 mr-1" />Abrir</Link></Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingLines(lead)}>
                  <ListPlus className="w-3.5 h-3.5 mr-1" />Líneas ({ls.length})
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editingLines && (
        <LinesEditor lead={editingLines} lines={lines.filter((l) => l.lead_id === editingLines.id)} onClose={() => setEditingLines(null)} />
      )}
    </div>
  );
};
