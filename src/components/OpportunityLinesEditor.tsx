import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';
import { useOpportunityLines, lineMargin, rollUp, fmtEur, fmtPct } from '@/hooks/useOpportunityLines';
import { Money } from '@/components/Money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const parseAmount = (value: string) => {
  const amount = Number(value.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(amount) ? amount : null;
};

export function OpportunityLinesEditor({ lead }: { lead: Lead }) {
  const { lines, saveLine, deleteLine } = useOpportunityLines();
  const ownLines = lines.filter(line => line.lead_id === lead.id);
  const total = rollUp(ownLines);
  const [draft, setDraft] = useState({ producto: '', cantidad: '1', ingreso: '', coste: '' });
  const [error, setError] = useState('');

  const addLine = async () => {
    const ingreso = parseAmount(draft.ingreso);
    const coste = parseAmount(draft.coste);
    const cantidad = Number.parseInt(draft.cantidad, 10);
    if (!draft.producto.trim()) return setError('Falta el producto o línea');
    if (ingreso === null || draft.ingreso.trim() === '') return setError('Falta el ingreso mensual');
    if (coste === null || draft.coste.trim() === '') return setError('Falta el coste mensual');
    if (ingreso < 0 || coste < 0) return setError('Ingreso y coste no pueden ser negativos');
    setError('');
    try {
      await saveLine({ lead_id: lead.id, producto: draft.producto.trim(), cantidad: Number.isFinite(cantidad) ? cantidad : 1, monthly_revenue: ingreso, monthly_cost: coste });
      setDraft({ producto: '', cantidad: '1', ingreso: '', coste: '' });
    } catch { toast.error('No se pudo guardar la línea'); }
  };

  return <section className="border-t border-border pt-5">
    <h3 className="mb-3 text-sm font-semibold">Líneas de oportunidad</h3>
    <div className="overflow-x-auto border-y border-border">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground"><tr><th className="py-2 text-left">Producto / línea</th><th className="text-right">Uds.</th><th className="text-right">Ingreso mensual</th><th className="text-right">Coste mensual</th><th className="text-right">Margen €</th><th className="text-right">Margen %</th><th /></tr></thead>
        <tbody>{ownLines.map(line => { const margin = lineMargin(line); return <tr key={line.id} className="border-t border-border"><td className="py-2">{line.producto}</td><td className="text-right tabular-nums">{line.cantidad}</td><td className="text-right tabular-nums"><Money>{fmtEur(Number(line.monthly_revenue))}</Money></td><td className="text-right tabular-nums"><Money>{fmtEur(Number(line.monthly_cost))}</Money></td><td className="text-right tabular-nums"><Money>{fmtEur(margin.margin_eur)}</Money></td><td className="text-right tabular-nums">{fmtPct(margin.margin_pct)}</td><td className="text-right"><Button variant="ghost" size="icon" aria-label="Eliminar línea" onClick={() => deleteLine(line.id)}><Trash2 className="h-4 w-4" /></Button></td></tr>; })}<tr className="border-t border-border font-semibold"><td className="py-2">Total</td><td /><td className="text-right tabular-nums"><Money>{fmtEur(total.monthly_revenue)}</Money></td><td /><td className="text-right tabular-nums"><Money>{fmtEur(total.margin_eur)}</Money></td><td className="text-right tabular-nums">{fmtPct(total.margin_pct)}</td><td /></tr></tbody>
      </table>
    </div>
    <div className="mt-3 grid gap-2 md:grid-cols-[2fr_0.6fr_1fr_1fr_auto]"><Input placeholder="Producto o línea" value={draft.producto} onChange={e => setDraft({ ...draft, producto: e.target.value })} /><Input aria-label="Unidades" placeholder="Uds." inputMode="numeric" value={draft.cantidad} onChange={e => setDraft({ ...draft, cantidad: e.target.value })} /><Input aria-label="Ingreso mensual" placeholder="Ingreso €/mes" inputMode="decimal" value={draft.ingreso} onChange={e => setDraft({ ...draft, ingreso: e.target.value })} /><Input aria-label="Coste mensual" placeholder="Coste €/mes" inputMode="decimal" value={draft.coste} onChange={e => setDraft({ ...draft, coste: e.target.value })} /><Button onClick={addLine}>Añadir</Button></div>
    {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
  </section>;
}