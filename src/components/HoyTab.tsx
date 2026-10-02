import { refreshCompanies, refreshLeads } from '@/lib/queryClient';
import { useState, useMemo } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { useCompanies } from '@/hooks/useCompanies';
import { useSales } from '@/hooks/useSales';
import { supabase } from '@/integrations/supabase/client';
import { useQuarterlyKpis } from '@/hooks/useQuarterlyKpis';
import { computeQuarterKpis, rentLabel } from '@/lib/salesKpis';
import { Company } from '@/data/companies';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Phone, Target, TrendingUp, Zap, FileText, PhoneCall, Flame, Calendar, Edit2, Check, X, Compass } from 'lucide-react';
import { NexusRecommendModal } from '@/components/NexusRecommendModal';
import { toast } from 'sonner';

interface HoyTabProps {
  onCompanySelect: (company: Company) => void;
}

// ─── Multiplicador color ──────────────────────────────────────────
const multColor = (m: number) => {
  if (m <= 0) return 'text-red-500';
  if (m < 0.6) return 'text-orange-400';
  if (m < 1.0) return 'text-yellow-400';
  if (m < 1.4) return 'text-green-400';
  return 'text-emerald-400';
};

const snavColor = (v: number) => {
  if (v < 1500) return 'bg-red-500';
  if (v < 3500) return 'bg-orange-400';
  if (v < 5000) return 'bg-yellow-400';
  return 'bg-green-500';
};

export const HoyTab = ({ onCompanySelect }: HoyTabProps) => {
  const { leads } = useLeads();
  const { companies } = useCompanies();
  const { sales } = useSales();
  const { kpi, isLoading, quarterLabel, updateKpi } = useQuarterlyKpis();

  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [recommendOpen, setRecommendOpen] = useState(false);


  // ─── Derived data ──────────────────────────────────────────────
  const activeLeads = useMemo(() => leads.filter(l => !l.archived_at), [leads]);

  const propuestasPendientes = useMemo(() =>
    activeLeads
      .filter(l => l.estado === 'propuesta' || l.estado === 'negociacion')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10),
    [activeLeads]
  );

  const llamarHoy = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return activeLeads
      .filter(l => l.next_action_date && l.next_action_date <= today)
      .sort((a, b) => (a.next_action_date || '').localeCompare(b.next_action_date || ''));
  }, [activeLeads]);

  const topCalientes = useMemo(() =>
    companies
      .filter(c => (c as any).isHot && !c.archivedAt)
      .sort((a, b) => b.opportunityScore - a.opportunityScore),
    [companies]
  );

  // (Recommendations now handled by NexusRecommendModal)

  // Weekly stats
  const weekStats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekStr = startOfWeek.toISOString();

    return {
      contactados: activeLeads.filter(l => l.updated_at && l.updated_at >= weekStr && l.estado !== 'sin_empezar').length,
      propuestas: activeLeads.filter(l => l.updated_at && l.updated_at >= weekStr && (l.estado === 'propuesta' || l.estado === 'negociacion')).length,
      cerrados: activeLeads.filter(l => l.updated_at && l.updated_at >= weekStr && l.estado === 'ganado').length,
    };
  }, [activeLeads]);

  // KPI values — calculated LIVE from sales of current fiscal quarter
  const quarterKpis = useMemo(() => computeQuarterKpis(sales), [sales]);
  const altas = quarterKpis.altas;
  const altasTarget = kpi?.altas_target ?? 70;
  const snav = quarterKpis.snav;
  const rent = quarterKpis.rentabilidadMedia;
  const mult = quarterKpis.multiplicador;

  // Find company for a lead
  const findCompany = (companyId: string) => companies.find(c => c.id === companyId);

  const startEdit = (field: string, value: number) => {
    setEditing(field);
    setEditValue(String(value));
  };

  const saveEdit = async (field: string) => {
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0) {
      toast.error('Valor no válido');
      return;
    }
    try {
      await updateKpi({ [field]: num });
      toast.success('KPI actualizado');
    } catch {
      toast.error('Error al guardar');
    }
    setEditing(null);
  };

  const cancelEdit = () => setEditing(null);

  const EditableValue = ({ field, value, suffix = '' }: { field: string; value: number; suffix?: string }) => {
    if (editing === field) {
      return (
        <div className="flex items-center gap-1">
          <Input
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            className="h-7 w-20 text-sm"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(field); if (e.key === 'Escape') cancelEdit(); }}
          />
          <button onClick={() => saveEdit(field)} className="text-green-500 hover:text-green-400"><Check className="w-4 h-4" /></button>
          <button onClick={cancelEdit} className="text-red-500 hover:text-red-400"><X className="w-4 h-4" /></button>
        </div>
      );
    }
    return (
      <button onClick={() => startEdit(field, value)} className="group flex items-center gap-1 hover:opacity-80">
        <span className="text-2xl font-bold text-foreground">{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{suffix}</span>
        <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  };

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando...</div>;

  // ─── Liquid Glass surface helpers (tailwind class composition) ─────────
  const glassBase =
    "relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl " +
    "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.45)] " +
    "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px " +
    "before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent";

  return (
    <div className="space-y-6">

      {/* ── SECTION 1: KPIs del trimestre ────────────────────────── */}
      <div>
        <h2 className="text-[10px] font-mono tracking-[4px] text-muted-foreground mb-4 uppercase">/ / KPIs {quarterLabel}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Altas */}
          <div className={`${glassBase} p-5 hover:bg-card/60 transition-colors`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 ring-1 ring-primary/25 flex items-center justify-center backdrop-blur-sm"><Target className="w-4 h-4 text-primary" /></div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.14em]">Altas {quarterLabel}</span>
            </div>
            <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">{altas}</span>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5 font-mono">
                <span>{altas}/{altasTarget}</span>
                <span>{Math.round((altas / altasTarget) * 100)}%</span>
              </div>
              <Progress value={Math.min((altas / altasTarget) * 100, 100)} className="h-1.5 [&>div]:bg-primary" />
            </div>
          </div>

          {/* SNAV */}
          <div className={`${glassBase} p-5 hover:bg-card/60 transition-colors`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-green-500/10 ring-1 ring-green-500/25 flex items-center justify-center backdrop-blur-sm"><TrendingUp className="w-4 h-4 text-green-500" /></div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.14em]">SNAV</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">{snav.toFixed(0)}</span>
              <span className="text-sm text-muted-foreground">€</span>
            </div>
            <div className="mt-3 flex gap-1.5">
              {[1500, 3500, 5000].map(threshold => (
                <div key={threshold} className="flex-1">
                  <div className={`h-1.5 rounded-full ${snav >= threshold ? snavColor(threshold) : 'bg-muted/40'}`} />
                  <div className="text-[9px] text-muted-foreground text-center mt-1 font-mono">{threshold >= 1000 ? `${threshold / 1000}k` : threshold}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rentabilidad */}
          <div className={`${glassBase} p-5 hover:bg-card/60 transition-colors`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 ring-1 ring-purple-500/25 flex items-center justify-center backdrop-blur-sm"><Zap className="w-4 h-4 text-purple-500" /></div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.14em]">Rentabilidad</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">{rent.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">€/línea</span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">Tramo: <span className="text-foreground/80 font-medium">{rentLabel(rent)}</span></div>
          </div>

          {/* Multiplicador */}
          <div className={`${glassBase} p-5 hover:bg-card/60 transition-colors`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/25 flex items-center justify-center backdrop-blur-sm"><span className="text-amber-500 font-bold text-sm">×</span></div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.14em]">Multiplicador</span>
            </div>
            <span className={`text-3xl font-semibold tracking-tight tabular-nums ${multColor(mult)}`}>×{mult}</span>
            <div className="mt-2 text-[10px] text-muted-foreground leading-tight">
              SNAV {snav >= 5000 ? '≥5k' : snav >= 3500 ? '≥3.5k' : snav >= 1500 ? '≥1.5k' : '<1.5k'} + Rent {rentLabel(rent)}
              {quarterKpis.acelerador && <span className="ml-1 text-emerald-400 font-semibold">+0.2 ⚡</span>}
            </div>
          </div>
        </div>
      </div>


      {/* ── SECTION 2: Nexus recomienda (botón) ────────────── */}
      <button
        onClick={() => setRecommendOpen(true)}
        className={`${glassBase} w-full p-5 text-left group ring-1 ring-primary/20 bg-gradient-to-br from-primary/10 via-card/40 to-transparent hover:from-primary/15 transition-colors shadow-[0_0_40px_-15px_hsl(var(--primary)/0.6)]`}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center shrink-0 backdrop-blur-sm">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-mono tracking-[3px] text-primary/80 mb-0.5 uppercase">🎯 Nexus recomienda</div>
            <p className="text-sm text-foreground/80">¿Por dónde empiezo hoy? Click para ver la mejor empresa para llamar ahora.</p>
          </div>
          <span className="text-muted-foreground group-hover:text-primary transition-colors text-lg">→</span>
        </div>
      </button>
      <NexusRecommendModal open={recommendOpen} onClose={() => setRecommendOpen(false)} onCompanySelect={onCompanySelect} />


      {/* ── SECTION 3: Bloques de trabajo (3 columnas) ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Propuestas pendientes */}
        <div className={`${glassBase} p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-foreground">Propuestas pendientes</h3>
            <span className="ml-auto text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">{propuestasPendientes.length}</span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {propuestasPendientes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Sin propuestas pendientes</p>
            ) : propuestasPendientes.map(lead => (
              <div key={lead.id} className="flex items-center gap-1">
                <button
                  onClick={() => { const c = findCompany(lead.company_id); if (c) onCompanySelect(c); }}
                  className="flex-1 text-left p-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border min-w-0"
                >
                  <div className="font-medium text-sm text-foreground truncate">{lead.empresa}</div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-muted-foreground">{new Date(lead.updated_at).toLocaleDateString('es-ES')}</span>
                  </div>
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 7);
                    await (supabase as any).from('leads').update({ next_action_date: tomorrow.toISOString().split('T')[0], next_action: 'seguimiento' }).eq('id', lead.id);
                    refreshLeads();
                    toast.success(`"${lead.empresa}" aplazada 7 días`);
                  }}
                  className="shrink-0 w-7 h-7 rounded-md hover:bg-green-500/20 text-muted-foreground hover:text-green-400 transition-colors flex items-center justify-center"
                  title="Marcar como gestionada"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Llamar hoy */}
        <div className={`${glassBase} p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <PhoneCall className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-foreground">Llamar hoy</h3>
            <span className="ml-auto text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">{llamarHoy.length}</span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {llamarHoy.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Sin llamadas pendientes</p>
            ) : llamarHoy.map(lead => {
              const company = findCompany(lead.company_id);
              const phone = (company?.contactInfo as any)?.telefono || company?.contactInfo?.phone || '';
              return (
                <div key={lead.id} className="flex items-center gap-1">
                  <button
                    onClick={() => { if (company) onCompanySelect(company); }}
                    className="flex-1 text-left p-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border min-w-0"
                  >
                    <div className="font-medium text-sm text-foreground truncate">{lead.empresa}</div>
                    <div className="flex justify-between items-center mt-1">
                      {phone && (
                        <a href={`tel:${phone}`} onClick={e => e.stopPropagation()} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" />{phone}
                        </a>
                      )}
                      <span className="text-[10px] text-muted-foreground">{lead.next_action || 'Llamar'}</span>
                    </div>
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      await (supabase as any).from('leads').update({ next_action_date: tomorrow.toISOString().split('T')[0] }).eq('id', lead.id);
                      refreshLeads();
                      toast.success(`"${lead.empresa}" — llamada hecha ✓`);
                    }}
                    className="shrink-0 w-7 h-7 rounded-md hover:bg-green-500/20 text-muted-foreground hover:text-green-400 transition-colors flex items-center justify-center"
                    title="Marcar como llamado"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top calientes */}
        <div className={`${glassBase} p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-foreground">Top calientes 🔥</h3>
            <span className="ml-auto text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">{topCalientes.length}</span>
          </div>
          {topCalientes.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Marca empresas como "calientes" desde su ficha</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {topCalientes.map(company => (
                <div key={company.id} className="flex items-center gap-1">
                  <button
                    onClick={() => onCompanySelect(company)}
                    className="flex-1 text-left p-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border min-w-0"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm text-foreground truncate">{company.name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        company.opportunityScore >= 85 ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'
                      }`}>{company.opportunityScore}</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span>{company.operadorActual || company.sector}</span>
                      {(company.lineasMovil || 0) > 0 && <span>📱 {company.lineasMovil} líneas</span>}
                    </div>
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await (supabase as any).from('companies').update({ is_hot: false }).eq('id', company.id);
                      refreshCompanies();
                      toast.success(`"${company.name}" ya no es caliente`);
                    }}
                    className="shrink-0 w-7 h-7 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors flex items-center justify-center"
                    title="Quitar de calientes"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 3: Resumen semanal ───────────────────────────── */}
      <div className={`${glassBase} p-5`}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-mono tracking-[3px] text-muted-foreground uppercase">Resumen semanal</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Contactados', value: weekStats.contactados, color: 'text-blue-400' },
            { label: 'Propuestas', value: weekStats.propuestas, color: 'text-orange-400' },
            { label: 'Cerrados', value: weekStats.cerrados, color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
