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
import { CompanyDetailPanel } from '@/components/layout/CompanyDetailPanel';
import { ProposalModal } from '@/components/ProposalModal';
import { SpeechModal } from '@/components/SpeechModal';

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
const PIPELINE_COLUMNS = [
  { keys: ['lead'], label: 'Lead', color: '#6b7280', icon: '⚪' },
  { keys: ['contactado', 'cualificado'], label: 'Contactado / Cualificado', color: '#3b82f6', icon: '📞' },
  { keys: ['propuesta'], label: 'Propuesta', color: '#f97316', icon: '📋' },
  { keys: ['negociacion'], label: 'Negociación', color: '#eab308', icon: '🤝' },
  { keys: ['ganada'], label: 'Ganada', color: '#8b5cf6', icon: '🏆' },
  { keys: ['perdida'], label: 'Perdida', color: '#ef4444', icon: '❌' },
];

const ALL_STATES = [
  { key: 'lead', label: 'Lead', color: '#6b7280', icon: '⚪' },
  { key: 'contactado', label: 'Contactado', color: '#3b82f6', icon: '📞' },
  { key: 'cualificado', label: 'Cualificado', color: '#22c55e', icon: '✅' },
  { key: 'propuesta', label: 'Propuesta', color: '#f97316', icon: '📋' },
  { key: 'negociacion', label: 'Negociación', color: '#eab308', icon: '🤝' },
  { key: 'ganada', label: 'Ganada', color: '#8b5cf6', icon: '🏆' },
  { key: 'perdida', label: 'Perdida', color: '#ef4444', icon: '❌' },
];

const statusFlow = ['lead', 'contactado', 'cualificado', 'propuesta', 'negociacion', 'ganada'];

const SECTOR_COLORS: Record<string, string> = {
  salud: '#ef4444', industria: '#f59e0b', logistica: '#3b82f6',
  tecnologia: '#8b5cf6', retail: '#ec4899', turismo: '#14b8a6',
  educacion: '#22c55e', servicios: '#f97316',
};

const sectorIcons: Record<string, string> = {
  salud: '🏥', industria: '🏭', logistica: '🚛', tecnologia: '💻',
  retail: '🛒', turismo: '🏨', educacion: '🎓', servicios: '🔧',
};

const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace" };

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
      <div style={{ ...mono, fontSize: 24, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ ...mono, fontSize: 9, color: T.textLabel, letterSpacing: 2, marginTop: 6 }}>{label}</div>
    </div>
  );
}

// ─── Kanban Card ────────────────────────────────────────────────────────
function KanbanCard({ lead, onAdvance, onWin, onLose, onArchive, onOpenDetail, onChangeStatus, dragHandleProps }: {
  lead: Lead;
  onAdvance: () => void;
  onWin: () => void;
  onLose: () => void;
  onArchive: () => void;
  onOpenDetail: () => void;
  onChangeStatus: (newStatus: string) => void;
  dragHandleProps?: { listeners?: any; attributes?: any };
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const scoreColor = lead.opportunity_score >= 80 ? '#ef4444' : lead.opportunity_score >= 60 ? '#f59e0b' : '#6b7280';
  const canAdvance = statusFlow.indexOf(lead.estado || 'lead') < statusFlow.length - 1 && lead.estado !== 'perdida';
  const stageColor = ALL_STATES.find(s => s.key === lead.estado)?.color || '#6b7280';
  const subState = lead.estado === 'cualificado' ? { label: 'Cualificado', color: '#22c55e' } : null;

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
            textDecoration: 'underline', textDecorationColor: `${T.accent}44`,
          }}
        >
          {lead.empresa}
        </button>
        <span style={{
          ...mono, fontSize: 11, fontWeight: 800, color: scoreColor,
          background: `${scoreColor}18`, padding: '2px 8px', borderRadius: 6,
          border: `1px solid ${scoreColor}33`,
        }}>{lead.opportunity_score}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: T.textTertiary, textTransform: 'capitalize' }}>{lead.sector}</span>
        {subState && (
          <span style={{ ...mono, fontSize: 8, padding: '1px 6px', borderRadius: 4, background: `${subState.color}18`, color: subState.color, border: `1px solid ${subState.color}33` }}>
            {subState.label}
          </span>
        )}
      </div>
      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
        {canAdvance && (
          <button onClick={onAdvance} title="Avanzar" style={{
            background: `${T.accent}22`, border: `1px solid ${T.accent}44`, borderRadius: 5,
            padding: '3px 7px', cursor: 'pointer', color: T.accentLight, fontSize: 11,
          }}>▶</button>
        )}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowStatusMenu(!showStatusMenu)} title="Cambiar estado" style={{
            background: `${stageColor}18`, border: `1px solid ${stageColor}44`, borderRadius: 5,
            padding: '3px 7px', cursor: 'pointer', color: stageColor, fontSize: 11,
          }}>⇅</button>
          {showStatusMenu && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: 4,
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
              padding: 4, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {ALL_STATES.map(s => (
                <button key={s.key} onClick={() => { onChangeStatus(s.key); setShowStatusMenu(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 8px',
                  background: lead.estado === s.key ? `${s.color}22` : 'transparent',
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
            background: '#8b5cf618', border: '1px solid #8b5cf644', borderRadius: 5,
            padding: '3px 7px', cursor: 'pointer', color: '#8b5cf6', fontSize: 11,
          }}>🏆</button>
        )}
        {lead.estado !== 'perdida' && lead.estado !== 'ganada' && (
          <button onClick={onLose} title="Perdida" style={{
            background: '#ef444418', border: '1px solid #ef444444', borderRadius: 5,
            padding: '3px 7px', cursor: 'pointer', color: '#ef4444', fontSize: 11,
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
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showProposal, setShowProposal] = useState(false);
  const [showSpeech, setShowSpeech] = useState(false);
  const [selectedContact, setSelectedContact] = useState<DecisionMaker | null>(null);

  useEffect(() => {
    if (!selectedCompany) return;
    const freshCompany = companies.find(c => c.id === selectedCompany.id);
    if (freshCompany && freshCompany !== selectedCompany) setSelectedCompany(freshCompany);
  }, [companies, selectedCompany?.id]);

  const handleOpenDetail = (lead: Lead) => {
    const comp = companies.find(c => c.id === lead.company_id);
    if (comp) {
      setSelectedCompany(comp);
    } else {
      toast.error('No encuentro la empresa asociada a este lead');
    }
  };


  const activeLeads = useMemo(() => leads.filter(l => !l.archived_at), [leads]);
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
      .map(([name, count]) => ({ name, count, fill: SECTOR_COLORS[name] || '#6b7280' }))
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
      printWindow.document.write(`<html><head><title>Informe ${monthName}</title><style>body{font-family:monospace;white-space:pre-wrap;padding:40px;font-size:13px;line-height:1.6;color:#1a1a2a;}</style></head><body>${content}</body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Max funnel value for bar width
  const maxFunnel = Math.max(...funnelData.map(d => d.count), 1);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans', sans-serif", color: T.textPrimary, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <Header />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;700;800&display=swap');
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleExportPDF} style={{
              ...mono, fontSize: 10, letterSpacing: 1, padding: '6px 14px', borderRadius: 8,
              background: `${T.accent}11`, border: `1px solid ${T.accent}44`, color: T.accentLight, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}><Download size={13} /> EXPORTAR PDF</button>
            <button onClick={() => navigate('/map')} style={{
              ...mono, fontSize: 10, letterSpacing: 1, padding: '6px 14px', borderRadius: 8,
              background: 'transparent', border: `1px solid ${T.border}`, color: T.textTertiary, cursor: 'pointer',
            }}>← MAPA</button>
          </div>
        </div>

        {/* ROW 1: KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <KPICard label="PIPELINE TOTAL" value={`€${(pipelineTotal / 1000).toFixed(0)}k`} icon="💶" accent="#22c55e" />
          <KPICard label="LEADS ESTE MES" value={String(thisMonth)} icon="📊" accent="#7c5cfc" />
          <KPICard label="TASA CONVERSIÓN" value={`${conversionRate}%`} icon="🎯" accent="#f59e0b" />
          <KPICard label="TICKET MEDIO" value={`€${ticketMedio.toLocaleString()}`} icon="💰" accent="#9b7dff" />
        </div>

        {/* ROW 2: Kanban Pipeline — 6 columns (Contactado+Cualificado merged) */}
        <DndContext sensors={isMobile ? [] : sensors} onDragEnd={isMobile ? undefined : handleDragEnd}>
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${PIPELINE_COLUMNS.length}, minmax(0, 1fr))`, gap: 12,
            marginBottom: 20, minHeight: 300,
          }}>
            {PIPELINE_COLUMNS.map(col => {
              const stageLeads = activeLeads.filter(l => col.keys.includes(l.estado || 'lead'));
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
                          background: `${col.color}18`, padding: '2px 8px', borderRadius: 6,
                        }}>{stageLeads.length}</span>
                      </div>
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
        </DndContext>

        {/* ROW 3: Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Bar chart: leads by sector */}
          <div style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
            padding: '20px', overflow: 'hidden',
          }}>
            <div style={{ ...mono, fontSize: 9, color: T.textLabel, letterSpacing: 3, marginBottom: 16 }}>// LEADS POR SECTOR</div>
            {sectorData.length === 0 ? (
              <div style={{ ...mono, fontSize: 10, color: T.textMuted, textAlign: 'center', padding: 40 }}>SIN DATOS</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sectorData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fill: T.textTertiary, fontSize: 10, fontFamily: "'Space Mono', monospace" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textPrimary, fontSize: 12 }}
                    cursor={{ fill: `${T.accent}11` }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
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
                          background: `linear-gradient(90deg, ${stage.color}, ${stage.color}88)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'width 0.5s ease',
                          minWidth: 36,
                        }}>
                          <span style={{ ...mono, fontSize: 12, fontWeight: 800, color: '#fff' }}>{stage.count}</span>
                        </div>
                      </div>
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

      {/* Ficha unificada de empresa (misma que Clientes / Mapa, modal centrado en escritorio) */}
      <CompanyDetailPanel
        company={selectedCompany}
        isOpen={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        onGenerateProposal={() => setShowProposal(true)}
        onCreateLead={() => toast.info('Este cliente ya está en el pipeline')}
        onOpenSpeech={(contact) => { setSelectedContact(contact); setShowSpeech(true); }}
        variant="centered"
      />
      <ProposalModal company={selectedCompany} isOpen={showProposal} onClose={() => setShowProposal(false)} />
      <SpeechModal company={selectedCompany} selectedContact={selectedContact} isOpen={showSpeech} onClose={() => setShowSpeech(false)} />

    </div>
  );
};

export default MyLeads;
