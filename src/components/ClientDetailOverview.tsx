import { useEffect, useState, type ReactNode } from 'react';
import { Phone, Send, FileText, History, Contact, Save } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useOpportunityLines, fmtEur } from '@/hooks/useOpportunityLines';
import { useCompanyActivities, ACTIVITY_TYPES } from '@/hooks/useCompanyActivities';
import { useSales } from '@/hooks/useSales';
import { opportunityMargin } from '@/lib/dashboardSummary';
import { STAGE_LABEL, normalizeStage } from '@/lib/opportunity';
import type { Company } from '@/data/companies';
import { Money } from '@/components/Money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { InformesTab } from '@/components/InformesTab';
import { Label } from '@/components/ui/label';
import { refreshLeads } from '@/lib/queryClient';
import { supabase } from '@/integrations/supabase/client';

type LegacyNote = { fecha: string; texto: string };
function legacyNotes(companyId: string): LegacyNote[] {
  try {
    const data = JSON.parse(localStorage.getItem('nexus_interactions') || '{}');
    return Array.isArray(data[companyId]?.notas) ? data[companyId].notas.filter((n: LegacyNote) => n.fecha && n.texto) : [];
  } catch { return []; }
}

export function ClientDetailOverview({ company, children, headerAction }: { company: Company; children: ReactNode; headerAction?: ReactNode }) {
  const { leads } = useLeads();
  const { lines } = useOpportunityLines();
  const { activities, isLoading, createActivity } = useCompanyActivities(company.id);
  const { sales } = useSales(company.id);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'ficha' | 'informe' | 'actividad'>('ficha');
  const ownLeads = leads.filter(l => l.company_id === company.id);
  const margins = ownLeads.filter(l => !l.archived_at).map(l => opportunityMargin(l, lines));
  const known = margins.filter((m): m is number => m !== null);
  const current = ownLeads.filter(l => !l.archived_at).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const [nextAction, setNextAction] = useState({ type: 'call', date: '', note: '' });
  const [savingAction, setSavingAction] = useState(false);
  const stages = [...new Set(ownLeads.filter(l => !l.archived_at).map(l => STAGE_LABEL[normalizeStage(l.estado)]))];
  const contact = company.contactInfo as Record<string, unknown>;
  const principal = company.decisionMakers?.find(c => 'principal' in c && c.principal);
  const phone = String(principal?.mobile || contact?.telefono || contact?.phone || company.decisionMakers?.find(c => c.mobile)?.mobile || '');
  const events = [
    ...activities.map(a => ({ id: a.id, date: a.activity_date, time: a.created_at, type: ACTIVITY_TYPES.find(t => t.id === a.activity_type)?.label || 'Actividad', text: [a.summary, a.outcome].filter(Boolean).join(' · ') })),
    ...legacyNotes(company.id).map((n, i) => ({ id: `legacy-${i}`, date: n.fecha.slice(0, 10), time: n.fecha, type: 'Nota', text: n.texto })),
    ...sales.map(s => ({ id: `sale-${s.id}`, date: s.fecha, time: s.created_at, type: 'Venta', text: [s.producto || 'Venta registrada', s.notas].filter(Boolean).join(' · ') })),
    ...ownLeads.filter(l => l.notas?.trim()).map(l => ({ id: `lead-note-${l.id}`, date: l.updated_at.slice(0, 10), time: l.updated_at, type: 'Notas de oportunidad', text: l.notas || '' })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  useEffect(() => {
    setNextAction({
      type: current?.next_action || 'call',
      date: current?.next_action_date || '',
      note: current?.notas || '',
    });
  }, [current?.id, current?.next_action, current?.next_action_date, current?.notas]);

  const saveNextAction = async () => {
    if (!current) return toast.error('Este cliente no tiene una oportunidad activa');
    if (!nextAction.date) return toast.error('Falta la fecha de la próxima acción');
    setSavingAction(true);
    const { error: updateError } = await supabase.from('leads').update({
      next_action: nextAction.type,
      next_action_date: nextAction.date,
      notas: nextAction.note.trim() || null,
    } as never).eq('id', current.id);
    setSavingAction(false);
    if (updateError) return toast.error('No se pudo guardar la próxima acción');
    refreshLeads();
    toast.success('Próxima acción guardada');
  };

  const saveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const summary = note.trim();
    if (!summary || createActivity.isPending) return;
    setError('');
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    try {
      await createActivity.mutateAsync({ activity_date: date, activity_type: 'nota', summary });
      setNote('');
      toast.success('Nota guardada');
    } catch { setError('No se ha podido guardar la nota. Inténtalo de nuevo.'); }
  };

  return <div className="flex flex-col min-w-0 text-foreground">
    <header className="sticky top-14 z-30 bg-background py-4 border-b border-border space-y-4">
      <div className="flex justify-between items-start gap-3">
        <h2 className="text-xl font-bold break-words min-w-0">{company.name}</h2>
        {headerAction}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div><p className="text-xs text-muted-foreground mb-1">Margen total de oportunidades</p><span className="text-xl font-semibold"><Money>{known.length ? fmtEur(known.reduce((s, m) => s + m, 0)) : '—'}</Money></span>{margins.some(m => m === null) && <p className="text-xs text-muted-foreground mt-1">Hay oportunidades sin margen registrado</p>}</div>
        <div><p className="text-xs text-muted-foreground mb-1">Etapa actual</p><span className="text-sm font-semibold">{stages.length > 1 ? stages.join(' · ') : current ? STAGE_LABEL[normalizeStage(current.estado)] : 'Sin oportunidad'}</span></div>
        {phone ? <a href={`tel:${phone.replace(/\s/g, '')}`} className="text-primary inline-flex items-center gap-2 text-sm"><Phone className="w-4 h-4" />{phone}</a> : <span className="text-xs text-muted-foreground">Sin teléfono</span>}
        <div className="min-w-0"><p className="text-xs text-muted-foreground mb-1">Próxima acción</p><span className="text-sm font-semibold">{current?.next_action_date ? `${current.next_action || 'Seguimiento'} · ${new Date(`${current.next_action_date}T00:00:00`).toLocaleDateString('es-ES')}` : 'Sin programar'}</span></div>
      </div>
      <div className="grid gap-3 border-t border-border pt-3 md:grid-cols-[150px_170px_1fr_auto] md:items-end">
        <div><Label htmlFor="next-action-type">Tipo de acción</Label><select id="next-action-type" value={nextAction.type} onChange={e => setNextAction(value => ({ ...value, type: e.target.value }))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="call">Llamada</option><option value="visit">Visita</option><option value="proposal">Propuesta</option><option value="follow-up">Seguimiento</option></select></div>
        <div><Label htmlFor="next-action-date">Fecha</Label><Input id="next-action-date" type="date" value={nextAction.date} onChange={e => setNextAction(value => ({ ...value, date: e.target.value }))} className="mt-1" /></div>
        <div><Label htmlFor="next-action-note">Nota</Label><Input id="next-action-note" value={nextAction.note} maxLength={500} placeholder="Objetivo o contexto de la acción" onChange={e => setNextAction(value => ({ ...value, note: e.target.value }))} className="mt-1" /></div>
        <Button onClick={saveNextAction} disabled={!current || savingAction}><Save className="mr-2 h-4 w-4" />Guardar</Button>
      </div>
    </header>
    <div className="flex gap-1 border-b border-border pt-3"><Button variant={tab === 'ficha' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('ficha')}><Contact className="w-4 h-4 mr-2" />Ficha</Button><Button variant={tab === 'informe' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('informe')}><FileText className="w-4 h-4 mr-2" />Informe</Button><Button variant={tab === 'actividad' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('actividad')}><History className="w-4 h-4 mr-2" />Actividad</Button></div>
    {tab === 'ficha' && <section className="py-5 min-w-0">{children}</section>}
    {tab === 'informe' && <section className="py-4"><InformesTab companyId={company.id} compact onCompanySelect={() => undefined} /></section>}
    {tab === 'actividad' && <section className="py-4">
      <h3 className="font-semibold mb-3">Actividad</h3>
      <form onSubmit={saveNote} className="sticky top-0 z-10 bg-card py-2 flex gap-2">
        <Input aria-label="Añadir nota" placeholder="Añadir una nota…" value={note} onChange={e => setNote(e.target.value)} disabled={createActivity.isPending} />
        <Button type="submit" size="icon" disabled={!note.trim() || createActivity.isPending} aria-label="Guardar nota" title="Guardar nota"><Send className="w-4 h-4" /></Button>
      </form>
      {error && <p role="alert" className="text-destructive text-sm my-2">{error}</p>}
      {isLoading && <p className="text-muted-foreground text-sm py-3">Cargando historial…</p>}
      {!isLoading && !events.length && <p className="text-muted-foreground text-sm py-3">Sin actividad registrada</p>}
      <ol className="divide-y divide-border">
        {events.map(event => <li key={event.id} className="py-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mb-1"><span className="text-primary font-medium">{event.type}</span><time className="text-muted-foreground" dateTime={event.date}>{new Date(event.date + 'T00:00:00').toLocaleDateString('es-ES')}</time></div>
          <p className="text-sm break-words" title={event.text}>{event.text}</p>
        </li>)}
      </ol>
    </section>}
  </div>;
}