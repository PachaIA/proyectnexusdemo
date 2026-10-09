import { Money } from '@/components/Money';
import { fmtEur, useOpportunityLines } from '@/hooks/useOpportunityLines';
import { opportunityMargin } from '@/lib/dashboardSummary';
import { activityTone, daysSince, byMarginDesc } from '@/lib/pipelineBoard';
import { useUrlView, useLastActivity } from '@/hooks/useUrlView';
import { ViewToolbar } from '@/components/ViewToolbar';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState, useMemo } from 'react';
import { useLeads, Lead } from '@/hooks/useLeads';
import { useCompanies } from '@/hooks/useCompanies';
import { Company, DecisionMaker } from '@/data/companies';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DndContext, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragEndEvent,
} from '@dnd-kit/core';
import { OpportunityList } from '@/components/OpportunityList';

// ─── Theme — CSS Variable Based ─────────────────────────────────────────
const T = {
  bg: "var(--t-bg)",
  card: "var(--t-card)",
  cardAlt: "var(--t-card-alt)",
  border: "var(--t-border)",
  borderSubtle: "var(--t-border-subtle, var(--t-border))",
  accent: "var(--t-accent)",
  accentLight: "var(--t-accent-light)",
  accentDark: "var(--t-accent-dark, var(--t-accent))",
  textPrimary: "var(--t-text-primary)",
  textSecondary: "var(--t-text-secondary)",
  textTertiary: "var(--t-text-tertiary)",
  textMuted: "var(--t-text-muted)",
  textLabel: "var(--t-text-label)",
  sidebar: "var(--t-sidebar, var(--t-card))",
  cardHover: "var(--t-card-hover, var(--t-card-alt))",
};

// Merged: Contactado + Cualificado into one column
const PIPELINE_DEFAULTS = { vista: 'kanban', q: '', filtro: 'todos' };

const PIPELINE_COLUMNS = [
  { keys: ['lead'], label: 'Lead', color: 'var(--muted-text-accessible)', icon: '⚪' },
  { keys: ['contactado'], label: 'Contactado', color: 'var(--interactive)', icon: '📞' },
  { keys: ['propuesta'], label: 'Propuesta', color: 'var(--alert-text)', icon: '📋' },
  { keys: ['negociacion'], label: 'Negociación', color: 'var(--warning-text)', icon: '🤝' },
  { keys: ['ganada'], label: 'Ganada', color: 'var(--interactive)', icon: '🏆' },
  { keys: ['perdida'], label: 'Perdida', color: 'var(--alert-text)', icon: '❌' },
];

const ALL_STATES = [
  { key: 'lead', label: 'Lead', color: 'var(--muted-text-accessible)', icon: '⚪' },
  { key: 'contactado', label: 'Contactado', color: 'var(--interactive)', icon: '📞' },
  { key: 'propuesta', label: 'Propuesta', color: 'var(--alert-text)', icon: '📋' },
  { key: 'negociacion', label: 'Negociación', color: 'var(--warning-text)', icon: '🤝' },
  { key: 'ganada', label: 'Ganada', color: 'var(--interactive)', icon: '🏆' },
  { key: 'perdida', label: 'Perdida', color: 'var(--alert-text)', icon: '❌' },
];

const statusFlow = ['lead', 'contactado', 'propuesta', 'negociacion', 'ganada'];

const SECTOR_COLORS: Record<string, string> = {
  salud: 'var(--alert-text)', industria: 'var(--warning-text)', logistica: 'var(--interactive)',
  tecnologia: 'var(--interactive)', retail: 'var(--alert-text)', turismo: 'var(--success-text)',
  educacion: 'var(--success-text)', servicios: 'var(--alert-text)',
};

const sectorIcons: Record<string, string> = {
  salud: '🏥', industria: '🏭', logistica: '🚛', tecnologia: '💻',
  retail: '🛒', turismo: '🏨', educacion: '🎓', servicios: '🔧',
};

const mono: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };

// ─── Interactions storage (shared with NexusDashboard) ──────────────────
const INTERACTIONS_KEY = 'nexus_interactions';
interface Nota { fecha: string; texto: string; }
interface InteractionData {
  estado: string;
  notas: Nota[];
  proximoContacto: string;
  ultimoContacto: string;
  contactadoHoy: boolean;
}
function loadInteractions(): Record<string, InteractionData> {
  try { const raw = localStorage.getItem(INTERACTIONS_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function saveInteractions(data: Record<string, InteractionData>) {
  localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(data));
}
function getInteraction(map: Record<string, InteractionData>, id: string): InteractionData {
  return map[id] || { estado: 'lead', notas: [], proximoContacto: '', ultimoContacto: '', contactadoHoy: false };
}

// ─── KPI Card ───────────────────────────────────────────────────────────
function KPICard({ label, value, icon, accent = T.accent }: { label: string; value: string; icon: string; accent?: string }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
      padding: '20px 22px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
      <div className="nexus-kpi" style={{ ...mono, fontSize: 24, fontWeight: 800, color: accent, lineHeight: 1 }}>{value.includes('€') ? <Money>{value}</Money> : value}</div>
      <div style={{ ...mono, fontSize: 9, color: T.textLabel, letterSpacing: 2, marginTop: 6 }}>{label}</div>
    </div>
  );
}

// ─── Kanban Card ────────────────────────────────────────────────────────
function KanbanCard({ lead, margin, lastActivity, onAdvance, onWin, onLose, onArchive, onOpenDetail, onChangeStatus, dragHandleProps }: {
  lead: Lead;
  margin: number | null;
  lastActivity: string;
  onAdvance: () => void;
  onWin: () => void;
  onLose: () => void;
  onArchive: () => void;
  onOpenDetail: () => void;
  onChangeStatus: (newStatus: string) => void;
  dragHandleProps?: { listeners?: any; attributes?: any };
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const scoreColor = lead.opportunity_score >= 80 ? 'var(--alert-text)' : lead.opportunity_score >= 60 ? 'var(--warning-text)' : 'var(--muted-text-accessible)';
  const canAdvance = statusFlow.indexOf(lead.estado || 'lead') < statusFlow.length - 1 && lead.estado !== 'perdida';
  const stageColor = ALL_STATES.find(s => s.key === lead.estado)?.color || 'var(--muted-text-accessible)';
  const subState = null as { label: string; color: string } | null;

  return (
    <div
      style={{
        background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10,
        padding: '12px 14px', marginBottom: 8, transition: 'all 0.15s',
        cursor: 'pointer', borderLeft: `3px solid ${stageColor}`,
      }}
      onClick={onOpenDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail(); } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 6 }}>
        {/* Drag handle — solo este elemento captura el drag */}
        <span
          {...(dragHandleProps?.listeners || {})}
          {...(dragHandleProps?.attributes || {})}
          onClick={(e) => e.stopPropagation()}
          title="Arrastrar para mover de columna"
          style={{
            cursor: dragHandleProps ? 'grab' : 'default',
            color: T.textMuted, fontSize: 12, lineHeight: 1, padding: '0 2px',
            userSelect: 'none', touchAction: 'none',
          }}
        >⋮⋮</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
          style={{
            flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            fontWeight: 700, fontSize: 12, color: T.accentLight,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textDecoration: 'underline', textDecorationColor: `color-mix(in srgb, ${T.accent} 26.7%, transparent)`,
          }}
        >
          {lead.empresa}
        </button>
        <span style={{
          ...mono, fontSize: 11, fontWeight: 800, color: scoreColor,
          background: `color-mix(in srgb, ${scoreColor} 9.4%, transparent)`, padding: '2px 8px', borderRadius: 6,
          border: `1px solid color-mix(in srgb, ${scoreColor} 20.0%, transparent)`,
        }}>{lead.opportunity_score}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <span className="tabular-nums" style={{ fontSize: 13, fontWeight: 700 }}><Money>{fmtEur(margin)}</Money></span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="tabular-nums" style={{ fontSize: 10, color: T.textTertiary }} title="Cierre previsto">
            {lead.fecha_cierre_prevista ? new Date(`${lead.fecha_cierre_prevista}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Sin cierre'}
          </span>
          {(() => { const d = daysSince(lastActivity); const tip = `Sin actividad desde hace ${d} ${d === 1 ? 'día' : 'días'}`; return (
            <UITooltip><TooltipTrigger asChild>
              <span role="img" aria-label={tip} onClick={e => e.stopPropagation()} style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--${activityTone(d)})`, display: 'inline-block' }} />
            </TooltipTrigger><TooltipContent>{tip}</TooltipContent></UITooltip>
          ); })()}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: T.textTertiary, textTransform: 'capitalize' }}>{lead.sector}</span>
        {subState && (
          <span style={{ ...mono, fontSize: 8, padding: '1px 6px', borderRadius: 4, background: `color-mix(in srgb, ${subState.color} 9.4%, transparent)`, color: subState.color, border: `1px solid color-mix(in srgb, ${subState.color} 20.0%, transparent)` }}>
            {subState.label}
          </span>
        )}
      </div>
      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
        {canAdvance && (
          <button onClick={onAdvance} title="Avanzar" style={{
            background: `color-mix(in srgb, ${T.accent} 13.3%, transparent)`, border: `1px solid color-mix(in srgb, ${T.accent} 26.7%, transparent)`, borderRadius: 5,
            padding: '3px 7px', cursor: 'pointer', color: T.accentLight, fontSize: 11,
          }}>▶</button>
        )}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowStatusMenu(!showStatusMenu)} title="Cambiar estado" style={{
            background: `color-mix(in srgb, ${stageColor} 9.4%, transparent)`, border: `1px solid color-mix(in srgb, ${stageColor} 26.7%, transparent)`, borderRadius: 5,
            padding: '3px 7px', cursor: 'pointer', color: stageColor, fontSize: 11,
          }}>⇅</button>
          {showStatusMenu && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: 4,
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
              padding: 4, minWidth: 140, boxShadow: "none",
            }}>
              {ALL_STATES.map(s => (
                <button key={s.key} onClick={() => { onChangeStatus(s.key); setShowStatusMenu(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 8px',
                  background: lead.estado === s.key ? `color-mix(in srgb, ${s.color} 13.3%, transparent)` : 'transparent',
                  border: 'none', borderRadius: 4, cursor: 'pointer', color: T.textPrimary, fontSize: 11,
                }}>
                  <span>{s.icon}</span>
                  <span style={{ color: s.color, fontWeight: lead.estado === s.key ? 700 : 400 }}>{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {lead.estado !== 'ganada' && lead.estado !== 'perdida' && (
          <button onClick={onWin} title="Ganada" style={{
            background: 'color-mix(in srgb, var(--interactive) 9.4%, transparent)', border: '1px solid color-mix(in srgb, var(--interactive) 26.7%, transparent)', borderRadius: 5,
            padding: '3px 7px', cursor: 'pointer', color: 'var(--interactive)', fontSize: 11,
          }}>🏆</button>
        )}
        {lead.estado !== 'perdida' && lead.estado !== 'ganada' && (
          <button onClick={onLose} title="Perdida" style={{
            background: 'color-mix(in srgb, var(--alert-text) 9.4%, transparent)', border: '1px solid color-mix(in srgb, var(--alert-text) 26.7%, transparent)', borderRadius: 5,
            padding: '3px 7px', cursor: 'pointer', color: 'var(--alert-text)', fontSize: 11,
          }}>✕</button>
        )}
        <button onClick={onArchive} title="Archivar" style={{
          background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 5,
          padding: '3px 7px', cursor: 'pointer', color: T.textMuted, fontSize: 11,
        }}>🗄</button>
      </div>
    </div>
  );
}

// ─── DnD wrappers (desktop pipeline only) ──────────────────────────────
function DraggableCard({ id, enabled, children }: {
  id: string;
  enabled: boolean;
  children: (handle: { listeners?: any; attributes?: any } | undefined) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({ id, disabled: !enabled });
  if (!enabled) return <>{children(undefined)}</>;
  const style: React.CSSProperties = {
    opacity: isDragging ? 0.4 : 1,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ listeners, attributes })}
    </div>
  );
}


function DroppableColumn({ id, enabled, children }: { id: string; enabled: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !enabled });
  return (
    <div
      ref={enabled ? setNodeRef : undefined}
      style={{
        width: '100%',
        minWidth: 0,
        height: '100%',
        outline: enabled && isOver ? `2px dashed ${T.accent}` : 'none',
        outlineOffset: -4,
        borderRadius: 14,
      }}
    >
      {children}
    </div>
  );
}

// (Editor inline eliminado — la ficha se abre con CompanyDetailPanel compartido)


// ─── Main Component ─────────────────────────────────────────────────────
const MyLeads = () => {
  const { leads, isLoading, updateLead, archiveLead, getLeadStats } = useLeads();
  const { companies } = useCompanies();
  const navigate = useNavigate();
  const { lines } = useOpportunityLines();
  const lastActivity = useLastActivity();
  const [view, setView, viewQuery] = useUrlView(PIPELINE_DEFAULTS);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);

  const handleOpenDetail = (lead: Lead) => {
    const comp = companies.find(c => c.id === lead.company_id);
    if (comp) {
      navigate(`/clientes/${encodeURIComponent(comp.id)}`);
    } else {
      toast.error('No encuentro la empresa asociada a este lead');
    }
  };


  const activeLeads = useMemo(() => leads.filter(l => !l.archived_at), [leads]);
  // Mismo conjunto filtrado para Kanban y Tabla; los KPIs siguen mostrando todo el pipeline.
  const viewLeads = useMemo(() => activeLeads.filter(l => {
    if (view.q && !l.empresa.toLowerCase().includes(view.q.toLowerCase())) return false;
    if (view.filtro === 'sin-actividad' && daysSince(lastActivity.get(l.company_id) ?? l.updated_at) <= 14) return false;
    return true;
  }), [activeLeads, view.q, view.filtro, lastActivity]);
  const stats = getLeadStats();

  // KPI calculations
  const pipelineTotal = useMemo(() =>
    activeLeads.filter(l => !['ganada', 'perdida'].includes(l.estado || '')).reduce((s, l) => s + (l.arpu_estimado || 0), 0) * 12,
    [activeLeads]
  );
  const thisMonth = useMemo(() => {
    const now = new Date();
    return activeLeads.filter(l => {
      const d = new Date(l.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [activeLeads]);
  const conversionRate = useMemo(() => {
    const total = activeLeads.length;
    const won = activeLeads.filter(l => l.estado === 'ganada').length;
    return total > 0 ? Math.round((won / total) * 100) : 0;
  }, [activeLeads]);
  const ticketMedio = useMemo(() => {
    const withArpu = activeLeads.filter(l => l.arpu_estimado && l.arpu_estimado > 0);
    return withArpu.length > 0 ? Math.round(withArpu.reduce((s, l) => s + (l.arpu_estimado || 0), 0) / withArpu.length) : 0;
  }, [activeLeads]);

  // Chart data: leads by sector
  const sectorData = useMemo(() => {
    const map: Record<string, number> = {};
    activeLeads.forEach(l => {
      const s = l.sector || 'otros';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count, fill: SECTOR_COLORS[name] || 'var(--muted-text-accessible)' }))
      .sort((a, b) => b.count - a.count);
  }, [activeLeads]);

  // Funnel data
  const funnelData = useMemo(() => {
    return ALL_STATES.filter(s => s.key !== 'perdida').map(stage => ({
      name: stage.label,
      count: activeLeads.filter(l => l.estado === stage.key).length,
      color: stage.color,
    }));
  }, [activeLeads]);

  const handleStatusChange = (leadId: string, newStatus: string) => {
    updateLead({ id: leadId, updates: { estado: newStatus } });
  };

  const handleNextStatus = (lead: Lead) => {
    const currentIdx = statusFlow.indexOf(lead.estado || 'lead');
    if (currentIdx < statusFlow.length - 1) {
      handleStatusChange(lead.id, statusFlow[currentIdx + 1]);
    }
  };

  // ── Drag & drop (desktop only) ──────────────────────────────────────
  const isMobile = useIsMobile();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const leadId = String(active.id);
    const targetCol = PIPELINE_COLUMNS.find(c => c.keys.join('-') === String(over.id));
    if (!targetCol) return;
    const lead = activeLeads.find(l => l.id === leadId);
    if (!lead) return;
    // If lead already in this merged column, do nothing
    if (targetCol.keys.includes(lead.estado || 'lead')) return;
    handleStatusChange(leadId, targetCol.keys[0]);
  };

  const confirmArchive = () => {
    if (archiveTarget) {
      archiveLead(archiveTarget);
      setArchiveTarget(null);
    }
  };

  const handleExportPDF = () => {
    const now = new Date();
    const monthName = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    const wonLeads = activeLeads.filter(l => l.estado === 'ganada');
    const lostLeads = activeLeads.filter(l => l.estado === 'perdida');
    const inPipeline = activeLeads.filter(l => !['ganada', 'perdida'].includes(l.estado || ''));
    const top5 = [...activeLeads].sort((a, b) => b.opportunity_score - a.opportunity_score).slice(0, 5);

    const lines = [
      `INFORME COMERCIAL MENSUAL — ${monthName.toUpperCase()}`,
      `Generado por: Alejandro González · Senior Strategic Consultant · Grupo Enertel`,
      `Fecha: ${now.toLocaleDateString('es-ES')}`,
      ``,
      `═══════════════════════════════════════`,
      `RESUMEN DEL PIPELINE`,
      `═══════════════════════════════════════`,
      `Total leads activos: ${activeLeads.length}`,
      `En pipeline: ${inPipeline.length}`,
      `Ganados: ${wonLeads.length}`,
      `Perdidos: ${lostLeads.length}`,
      `Tasa de conversión: ${conversionRate}%`,
      ``,
      `═══════════════════════════════════════`,
      `LEADS POR FASE`,
      `═══════════════════════════════════════`,
      ...ALL_STATES.map(stage => {
        const count = activeLeads.filter(l => l.estado === stage.key).length;
        return `${stage.icon} ${stage.label}: ${count}`;
      }),
      ``,
      `═══════════════════════════════════════`,
      `TOP 5 EMPRESAS POR SCORE`,
      `═══════════════════════════════════════`,
      ...top5.map((l, i) => `${i + 1}. ${l.empresa} — Score: ${l.opportunity_score} | Sector: ${l.sector}`),
      ``,
      `— Nexus Inteligencia Comercial · Grupo Enertel`,
    ];

    const content = lines.join('\n');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>Informe ${monthName}</title><style>body{font-family:monospace;white-space:pre-wrap;padding:40px;font-size:13px;line-height:1.6;color:var(--muted-text-accessible);}</style></head><body>${content}</body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Max funnel value for bar width
  const maxFunnel = Math.max(...funnelData.map(d => d.count), 1);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'Inter', sans-serif", color: T.textPrimary, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <Header />
      </div>

      <style>{`
        700&family=DM+Sans:wght@300;400;500;700;800&display=swap');
        .leads-page ::-webkit-scrollbar { width: 4px; }
        .leads-page ::-webkit-scrollbar-track { background: ${T.card}; }
        .leads-page ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
      `}</style>

      <div className="leads-page" style={{ flex: 1, padding: '20px 24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ ...mono, fontSize: 9, color: T.textLabel, letterSpacing: 3 }}>// PIPELINE COMERCIAL</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input aria-label="Buscar cliente" placeholder="Buscar cliente…" value={view.q} onChange={e => setView({ q: e.target.value })} className="h-8 rounded-md border border-border bg-background px-2 text-xs" />
            <select aria-label="Actividad" value={view.filtro} onChange={e => setView({ filtro: e.target.value })} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
              <option value="todos">Toda actividad</option>
              <option value="sin-actividad">Sin actividad (+14 días)</option>
            </select>
            <ViewToolbar page="pipeline" views={[{ id: 'kanban', label: 'Kanban' }, { id: 'tabla', label: 'Tabla' }]} current={view.vista} onChange={vista => setView({ vista })} query={viewQuery} />
            <button onClick={handleExportPDF} style={{
              ...mono, fontSize: 10, letterSpacing: 1, padding: '6px 14px', borderRadius: 8,
              background: `color-mix(in srgb, ${T.accent} 6.7%, transparent)`, border: `1px solid color-mix(in srgb, ${T.accent} 26.7%, transparent)`, color: T.accentLight, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}><Download size={13} /> EXPORTAR PDF</button>
            <button onClick={() => navigate('/mapa')} style={{
              ...mono, fontSize: 10, letterSpacing: 1, padding: '6px 14px', borderRadius: 8,
              background: 'transparent', border: `1px solid ${T.border}`, color: T.textTertiary, cursor: 'pointer',
            }}>← MAPA</button>
          </div>
        </div>

        {/* ROW 1: KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <KPICard label="PIPELINE TOTAL" value={fmtEur(pipelineTotal)} icon="💶" accent="var(--success-text)" />
          <KPICard label="LEADS ESTE MES" value={String(thisMonth)} icon="📊" accent="var(--interactive)" />
          <KPICard label="TASA CONVERSIÓN" value={`${conversionRate}%`} icon="🎯" accent="var(--warning-text)" />
          <KPICard label="TICKET MEDIO" value={fmtEur(ticketMedio)} icon="💰" accent="var(--interactive)" />
        </div>

        {/* ROW 2: Kanban Pipeline — 6 columns (Contactado+Cualificado merged) */}
        {view.vista !== 'tabla' && <DndContext sensors={isMobile ? [] : sensors} onDragEnd={isMobile ? undefined : handleDragEnd}>
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${PIPELINE_COLUMNS.length}, minmax(0, 1fr))`, gap: 12,
            marginBottom: 20, minHeight: 300,
          }}>
            {PIPELINE_COLUMNS.map(col => {
              const stageLeads = byMarginDesc(viewLeads.filter(l => col.keys.includes(l.estado || 'lead')), l => opportunityMargin(l, lines));
              const stageMargin = stageLeads.reduce((sum, l) => sum + (opportunityMargin(l, lines) ?? 0), 0);
              const colId = col.keys.join('-');
              return (
                <DroppableColumn key={colId} id={colId} enabled={!isMobile}>
                  <div style={{
                    background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
                    display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%',
                  }}>
                    {/* Column header */}
                    <div style={{
                      padding: '14px 16px 10px', borderBottom: `1px solid ${T.border}`,
                      position: 'relative',
                    }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: col.color }} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{col.icon}</span>
                          <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: T.textPrimary, letterSpacing: 1 }}>{col.label.toUpperCase()}</span>
                        </div>
                        <span style={{
                          ...mono, fontSize: 12, fontWeight: 800, color: col.color,
                          background: `color-mix(in srgb, ${col.color} 9.4%, transparent)`, padding: '2px 8px', borderRadius: 6,
                        }}>{stageLeads.length}</span>
                      </div>
                      <div className="tabular-nums" style={{ marginTop: 6, fontSize: 13, fontWeight: 700 }} aria-label={`Margen de ${col.label}`}><Money>{fmtEur(stageMargin)}</Money></div>
                    </div>
                    {/* Cards */}
                    <div style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
                      {stageLeads.length === 0 ? (
                        <div style={{ ...mono, fontSize: 9, color: T.textMuted, textAlign: 'center', padding: '20px 0', letterSpacing: 1 }}>SIN LEADS</div>
                      ) : (
                        stageLeads.map(lead => (
                          <DraggableCard key={lead.id} id={lead.id} enabled={!isMobile}>
                            {(handle) => (
                              <KanbanCard
                                lead={lead}
                                margin={opportunityMargin(lead, lines)}
                                lastActivity={lastActivity.get(lead.company_id) ?? lead.updated_at}
                                onAdvance={() => handleNextStatus(lead)}
                                onWin={() => handleStatusChange(lead.id, 'ganada')}
                                onLose={() => handleStatusChange(lead.id, 'perdida')}
                                onArchive={() => setArchiveTarget(lead.id)}
                                onOpenDetail={() => handleOpenDetail(lead)}
                                onChangeStatus={(newStatus) => handleStatusChange(lead.id, newStatus)}
                                dragHandleProps={handle}
                              />
                            )}
                          </DraggableCard>
                        ))
                      )}
                    </div>
                  </div>
                </DroppableColumn>
              );
            })}
          </div>
        </DndContext>}

        {view.vista === 'tabla' && <OpportunityList leads={viewLeads as any} />}

        {/* ROW 3: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Bar chart: leads by sector */}
          <div style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
            padding: '20px', overflow: 'hidden',
          }}>
            <div style={{ ...mono, fontSize: 9, color: T.textLabel, letterSpacing: 3, marginBottom: 16 }}>// LEADS POR SECTOR</div>
            {sectorData.length === 0 ? (
              <div style={{ ...mono, fontSize: 10, color: T.textMuted, textAlign: 'center', padding: 40 }}>SIN DATOS</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, sectorData.length * 42)}>
                <BarChart data={sectorData} layout="vertical" barCategoryGap={12} margin={{ left: 0, right: 20, top: 8, bottom: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={110} interval={0} tick={{ fill: T.textTertiary, fontSize: 11, fontFamily: "'Inter', sans-serif" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textPrimary, fontSize: 12 }}
                    cursor={{ fill: `color-mix(in srgb, ${T.accent} 6.7%, transparent)` }}
                  />
                  <Bar dataKey="count" name="Oportunidades" label={{ position: 'right', fill: 'var(--text)', fontSize: 12 }} radius={[0, 4, 4, 0]} barSize={18}>
                    {sectorData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Funnel chart: conversion by stage */}
          <div style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
            padding: '20px', overflow: 'hidden',
          }}>
            <div style={{ ...mono, fontSize: 9, color: T.textLabel, letterSpacing: 3, marginBottom: 16 }}>// EMBUDO DE CONVERSIÓN</div>
            {funnelData.every(d => d.count === 0) ? (
              <div style={{ ...mono, fontSize: 10, color: T.textMuted, textAlign: 'center', padding: 40 }}>SIN DATOS</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {funnelData.map((stage) => {
                  const widthPct = maxFunnel > 0 ? Math.max(8, (stage.count / maxFunnel) * 100) : 8;
                  return (
                    <div key={stage.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 90, flexShrink: 0, textAlign: 'right' }}>
                        <span style={{ ...mono, fontSize: 10, color: T.textTertiary }}>{stage.name}</span>
                      </div>
                      <div style={{ flex: 1, position: 'relative', height: 28 }}>
                        <div style={{
                          width: `${widthPct}%`, height: '100%', borderRadius: 6,
                          background: stage.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'width 0.5s ease',
                          minWidth: 36,
                        }}>
                        </div>
                      </div>
                      <span className="text-foreground text-sm font-semibold tabular-nums w-8 text-right">{stage.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Archive Dialog */}
      <Dialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <DialogContent style={{ background: T.card, border: `1px solid ${T.border}`, color: T.textPrimary }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.textPrimary }}>Archivar lead</DialogTitle>
            <DialogDescription style={{ color: T.textSecondary }}>
              ¿Estás seguro de que quieres archivar este lead?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setArchiveTarget(null)} style={{ borderColor: T.border, color: T.textTertiary }}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmArchive}>Archivar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default MyLeads;
