import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/hooks/useCompanies';
import { useLeads } from '@/hooks/useLeads';
import { getEffectiveUser } from '@/lib/openUser';
import { refreshLeads } from '@/lib/queryClient';
import { scoreNcs, pitchFor, recommendProducts, LeadInput, Sector, OperadorActual } from '@/lib/ncsScoring';
import { Company } from '@/data/companies';
import { Phone, ArrowLeft, PhoneOutgoing, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ─── Mapeo empresa → entrada del simulador NCS (reutiliza su lógica) ────────
const toLeadInput = (c: Company): LeadInput => {
  const s = (c.sector || '').toLowerCase();
  const sector: Sector =
    (['hosteleria', 'retail', 'servicios', 'industrial', 'salud', 'construccion'] as Sector[]).find((x) => s.includes(x)) ?? 'otro';
  const op = (c.operadorActual || '').toLowerCase();
  const operadorActual: OperadorActual = op.includes('movistar')
    ? 'movistar'
    : op.includes('orange') || op.includes('masmovil')
      ? 'orange'
      : op.includes('digi')
        ? 'digi'
        : !op.trim()
          ? 'none'
          : 'unknown';
  return {
    sector,
    empleados: c.employees || null,
    antiguedadAnios: null,
    presenciaDigital: c.website ? 'basic' : 'none',
    crecimiento: undefined,
    operadorActual,
  };
};

type OutcomeId = 'no_contesta' | 'interesado' | 'propuesta' | 'no_encaja' | 'volver';

const OUTCOMES: { id: OutcomeId; label: string; nextDays: number; estado?: string }[] = [
  { id: 'no_contesta', label: 'No contesta', nextDays: 1 },
  { id: 'interesado', label: 'Interesado', nextDays: 2, estado: 'cualificado' },
  { id: 'propuesta', label: 'Enviar propuesta', nextDays: 7, estado: 'propuesta' },
  { id: 'no_encaja', label: 'No le encaja', nextDays: 0, estado: 'perdido' },
  { id: 'volver', label: 'Volver a llamar', nextDays: 3 },
];

const addDays = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString().split('T')[0];
};

const CallMode = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { companies, isLoading } = useCompanies();
  const { leads } = useLeads();
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState<OutcomeId | null>(null);

  const company = useMemo(() => companies.find((c) => c.id === companyId) ?? null, [companies, companyId]);
  const lead = useMemo(() => leads.find((l) => l.company_id === companyId) ?? null, [leads, companyId]);

  // Cola de llamadas de hoy (misma regla que "Llamar hoy" del dashboard)
  const colaHoy = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return leads
      .filter((l) => !l.archived_at && l.next_action_date && l.next_action_date <= today && l.company_id !== companyId)
      .sort((a, b) => (a.next_action_date || '').localeCompare(b.next_action_date || ''));
  }, [leads, companyId]);
  const nextCall = colaHoy[0] ?? null;

  // Última interacción registrada con esta empresa
  const { data: lastActivity } = useQuery({
    queryKey: ['callmode-last-activity', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('company_activities')
        .select('activity_type, summary, outcome, activity_date, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1);
      return (data?.[0] ?? null) as { activity_type: string; summary: string; outcome: string | null; activity_date: string } | null;
    },
  });

  // Cronómetro: arranca al abrir la pantalla
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const input = company ? toLeadInput(company) : null;
  const ncs = input ? scoreNcs(input) : null;
  const hook = input && ncs ? pitchFor(input, ncs) : '';
  const products = input && ncs ? recommendProducts(input, ncs).slice(0, 4) : [];

  const phone = company ? ((company.contactInfo as any)?.telefono || company.contactInfo?.phone || '') : '';

  const recordOutcome = async (o: (typeof OUTCOMES)[number]) => {
    if (!company || saving) return;
    setSaving(o.id);
    try {
      const { data: { user } } = await getEffectiveUser();
      await (supabase as any).from('company_activities').insert({
        company_id: company.id,
        user_id: user.id,
        activity_type: 'llamada',
        summary: `Resultado de llamada: ${o.label}`,
        outcome: o.label,
        next_step: o.nextDays > 0 ? `Volver a llamar en ${o.nextDays} día(s)` : null,
        next_action_date: o.nextDays > 0 ? addDays(o.nextDays) : null,
      });
      if (lead) {
        const upd: Record<string, unknown> = { next_action: 'call', next_action_date: o.nextDays > 0 ? addDays(o.nextDays) : null };
        if (o.estado) upd.estado = o.estado;
        await (supabase as any).from('leads').update(upd).eq('id', lead.id);
      }
      refreshLeads();
      toast.success(`${company.name} — ${o.label}`);
      if (nextCall) navigate(`/llamada/${nextCall.company_id}`, { replace: true });
      else navigate('/', { replace: true });
    } catch {
      toast.error('No se pudo guardar el resultado');
      setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!company) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <p className="text-lg text-foreground">Empresa no encontrada</p>
        <button onClick={() => navigate(-1)} className="text-primary underline">Volver</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Cronómetro discreto */}
      <div className="absolute top-3 right-4 text-sm font-mono text-muted-foreground tabular-nums">{mm}:{ss}</div>
      <button
        onClick={() => navigate(-1)}
        className="absolute top-3 left-3 p-2 text-muted-foreground hover:text-foreground"
        aria-label="Volver"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 overflow-y-auto px-5 pt-14 pb-44 max-w-xl mx-auto w-full space-y-6">
        {/* 1 · Nombre, score y llamada */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-foreground leading-tight">{company.name}</h1>
          <div className="text-sm text-muted-foreground">
            NCS <span className="font-bold text-foreground text-base">{ncs?.score ?? '—'}</span>
            {ncs && <span className="ml-2">· {ncs.bucket === 'hot' ? 'Caliente' : ncs.bucket === 'warm' ? 'Templado' : 'Frío'}</span>}
          </div>
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="flex items-center justify-center gap-3 w-full py-5 rounded-2xl bg-primary text-primary-foreground text-xl font-bold no-underline active:opacity-80"
            >
              <Phone className="w-7 h-7" /> LLAMAR · {phone}
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Sin teléfono registrado</p>
          )}
        </div>

        {/* 2 · Los tres datos que importan ahora */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Operador</div>
            <div className="text-base font-semibold text-foreground mt-1">{company.operadorActual || 'Desconocido'}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Líneas</div>
            <div className="text-base font-semibold text-foreground mt-1">{company.lineasTotal || '—'}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Antigüedad</div>
            <div className="text-base font-semibold text-foreground mt-1">Sin dato</div>
          </div>
        </div>

        {/* 3 · Gancho de apertura */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="text-[11px] uppercase tracking-wide text-primary font-semibold mb-2">Abre así</div>
          <p className="text-base text-foreground leading-relaxed">{hook}</p>
        </div>

        {/* 4 · Mix de producto recomendado */}
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Qué ofrecer</div>
          <ul className="space-y-2">
            {products.map((p) => (
              <li key={p.title} className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="text-base font-medium text-foreground">{p.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.rationale}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* 5 · Última interacción */}
        {lastActivity && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Último contacto</div>
            <div className="text-sm text-foreground">{lastActivity.summary}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(lastActivity.activity_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
              {lastActivity.outcome ? ` · ${lastActivity.outcome}` : ''}
            </div>
          </div>
        )}
      </div>

      {/* Resultados de la llamada — fijos abajo */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 safe-area-bottom">
        <div className="max-w-xl mx-auto space-y-2">
          {nextCall && (
            <button
              onClick={() => navigate(`/llamada/${nextCall.company_id}`, { replace: true })}
              className="w-full min-h-[44px] rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
            >
              <PhoneOutgoing className="w-4 h-4" /> Siguiente llamada → {nextCall.empresa} ({colaHoy.length} pendiente{colaHoy.length > 1 ? 's' : ''})
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.id}
                disabled={!!saving}
                onClick={() => recordOutcome(o)}
                className="min-h-[56px] rounded-xl border border-border bg-card text-base font-semibold text-foreground active:bg-primary active:text-primary-foreground disabled:opacity-50 last:col-span-2"
              >
                {saving === o.id ? 'Guardando…' : o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallMode;
