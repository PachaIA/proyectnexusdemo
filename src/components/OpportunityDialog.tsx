import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompanies } from '@/hooks/useCompanies';
import {
  subscribeOpportunityDialog, validateOpportunity, draftToFields,
  type OpportunityRequest, type OpportunityDraft,
} from '@/lib/opportunity';

const EMPTY: OpportunityDraft = { company_id: '', fecha_cierre_prevista: '', importe_mensual_eur: '', margen_estimado_eur: '', next_action: '', next_action_date: '' };

export const OpportunityDialog = () => {
  const [req, setReq] = useState<OpportunityRequest | null>(null);
  const [draft, setDraft] = useState<OpportunityDraft>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof OpportunityDraft, boolean>>>({});
  const { companies } = useCompanies();

  useEffect(() => subscribeOpportunityDialog((r) => {
    setReq(r);
    if (r) { setDraft({ ...EMPTY, ...r.initial }); setTouched({}); }
  }), []);

  const errors = validateOpportunity(draft);
  const set = (k: keyof OpportunityDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));
  const blur = (k: keyof OpportunityDraft) => () => setTouched((t) => ({ ...t, [k]: true }));
  const show = (k: keyof OpportunityDraft) => touched[k] && errors[k];

  const submit = () => {
    setTouched({ company_id: true, fecha_cierre_prevista: true, importe_mensual_eur: true, margen_estimado_eur: true, next_action_date: true });
    if (Object.keys(errors).length || !req) return;
    req.resolve(draftToFields(draft));
  };

  const companyName = companies.find((c) => c.id === draft.company_id)?.name;

  return (
    <Dialog open={!!req} onOpenChange={(o) => { if (!o) req?.resolve(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{req?.title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="opp-cliente">Cliente *</Label>
            {req?.lockClient && companyName ? (
              <div className="text-sm font-medium">{companyName}</div>
            ) : (
              <select id="opp-cliente" value={draft.company_id} onChange={set('company_id')} onBlur={blur('company_id')}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecciona un cliente…</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {show('company_id') && <p className="text-xs text-destructive">{errors.company_id}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="opp-fecha">Fecha prevista de cierre *</Label>
            <Input id="opp-fecha" type="date" value={draft.fecha_cierre_prevista} onChange={set('fecha_cierre_prevista')} onBlur={blur('fecha_cierre_prevista')} aria-invalid={!!show('fecha_cierre_prevista')} />
            {show('fecha_cierre_prevista') && <p className="text-xs text-destructive">{errors.fecha_cierre_prevista}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="opp-importe">Importe mensual (€) *</Label>
              <Input id="opp-importe" inputMode="decimal" placeholder="0,00" value={draft.importe_mensual_eur} onChange={set('importe_mensual_eur')} onBlur={blur('importe_mensual_eur')} aria-invalid={!!show('importe_mensual_eur')} />
              {show('importe_mensual_eur') && <p className="text-xs text-destructive">{errors.importe_mensual_eur}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="opp-margen">Margen estimado (€) *</Label>
              <Input id="opp-margen" inputMode="decimal" placeholder="0,00" value={draft.margen_estimado_eur} onChange={set('margen_estimado_eur')} onBlur={blur('margen_estimado_eur')} aria-invalid={!!show('margen_estimado_eur')} />
              {show('margen_estimado_eur') && <p className="text-xs text-destructive">{errors.margen_estimado_eur}</p>}
            </div>
          </div>
          <div className="grid grid-cols-[1.6fr_1fr] gap-3 pt-1 border-t border-border">
            <div className="space-y-1 pt-3">
              <Label htmlFor="opp-next">Próxima acción</Label>
              <Input id="opp-next" maxLength={140} placeholder="Llamar para cerrar oferta…" value={draft.next_action} onChange={set('next_action')} />
            </div>
            <div className="space-y-1 pt-3">
              <Label htmlFor="opp-next-date">Fecha</Label>
              <Input id="opp-next-date" type="date" value={draft.next_action_date} onChange={set('next_action_date')} onBlur={blur('next_action_date')} />
              {show('next_action_date') && <p className="text-xs text-destructive">{errors.next_action_date}</p>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => req?.resolve(null)}>Cancelar</Button>
          <Button onClick={submit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
