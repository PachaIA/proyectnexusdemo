import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/data/companies';
import { useCompanies } from '@/hooks/useCompanies';
import { useLeads } from '@/hooks/useLeads';
import { QuickReportModal } from '@/components/QuickReportModal';
import { QuickActivityModal } from '@/components/QuickActivityModal';


const T = {
  card: 'var(--t-card)',
  cardAlt: 'var(--t-card-alt)',
  cardHover: 'var(--t-card-hover)',
  border: 'var(--t-border)',
  borderSubtle: 'var(--t-border-subtle)',
  accent: 'var(--t-accent)',
  textPrimary: 'var(--t-text-primary)',
  textSecondary: 'var(--t-text-secondary)',
  textTertiary: 'var(--t-text-tertiary)',
  textMuted: 'var(--t-text-muted)',
  textLabel: 'var(--t-text-label)',
};

const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace" };

const ESTADOS = [
  { id: 'sin_empezar', label: 'Sin empezar', color: '#6b7280' },
  { id: 'contactado', label: 'Contactado', color: '#3b82f6' },
  { id: 'cualificado', label: 'Cualificado', color: '#22c55e' },
  { id: 'propuesta', label: 'Propuesta', color: '#f97316' },
  { id: 'negociacion', label: 'Negociación', color: '#eab308' },
  { id: 'ganado', label: 'Ganado', color: '#8b5cf6' },
  { id: 'perdido', label: 'Perdido', color: '#ef4444' },
];

const ACTIVOS = ['contactado', 'cualificado', 'propuesta', 'negociacion'];

type MotivoId = 'sin_actividad' | 'sin_proxima' | 'propuesta_pendiente' | 'datos_incompletos';

const MOTIVOS: { id: MotivoId; title: string; icon: string; color: string; desc: string }[] = [
  { id: 'sin_actividad', title: 'SIN ACTIVIDAD RECIENTE', icon: '🕒', color: '#f59e0b', desc: 'Sin actividades en los últimos 30 días' },
  { id: 'sin_proxima', title: 'SIN PRÓXIMA ACCIÓN', icon: '📅', color: '#3b82f6', desc: 'Clientes activos sin fecha de próximo contacto' },
  { id: 'propuesta_pendiente', title: 'PROPUESTAS PENDIENTES', icon: '📋', color: '#f97316', desc: 'En estado propuesta o negociación' },
  { id: 'datos_incompletos', title: 'DATOS INCOMPLETOS', icon: '⚠️', color: '#ef4444', desc: 'Sin contacto, decisor, dirección o actividad' },
];

interface InteractionsMap {
  [id: string]: { estado?: string; proximoContacto?: string | null; ultimoContacto?: string | null };
}

function loadInteractions(): InteractionsMap {
  try {
    const raw = localStorage.getItem('nexus_interactions');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

interface CompanyAttention {
  company: Company;
  estado: string;
  motivos: { id: MotivoId; detalle: string }[];
}

interface InformesTabProps {
  onCompanySelect: (company: Company) => void;
}

export function InformesTab({ onCompanySelect }: InformesTabProps) {
  const { companies } = useCompanies();
  const { leads } = useLeads();
  const [motivoFilter, setMotivoFilter] = useState<'todos' | MotivoId>('todos');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [minScore, setMinScore] = useState<number>(0);
  const [reportCompany, setReportCompany] = useState<Company | null>(null);
  const [activityCompany, setActivityCompany] = useState<Company | null>(null);


  // Todas las actividades del usuario (solo lectura)
  const { data: allActivities = [] } = useQuery({
    queryKey: ['informes-activities'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('company_activities')
        .select('company_id, activity_date, next_action_date')
        .eq('user_id', user.id)
        .order('activity_date', { ascending: false });
      if (error) throw error;
      return (data || []) as { company_id: string; activity_date: string; next_action_date: string | null }[];
    },
  });

  const interactions = useMemo(loadInteractions, []);

  const items = useMemo<CompanyAttention[]>(() => {
    const now = new Date();
    const hace30 = new Date(now.getTime() - 30 * 86400000);

    const lastActivityByCompany = new Map<string, string>();
    const nextActionByCompany = new Map<string, string>();
    allActivities.forEach((a) => {
      if (!lastActivityByCompany.has(a.company_id)) {
        lastActivityByCompany.set(a.company_id, a.activity_date);
      }
      if (a.next_action_date && a.next_action_date >= now.toISOString().slice(0, 10)) {
        const cur = nextActionByCompany.get(a.company_id);
        if (!cur || a.next_action_date < cur) nextActionByCompany.set(a.company_id, a.next_action_date);
      }
    });

    return (companies || [])
      .filter((c) => !(c as any).archivedAt)
      .map((c) => {
        const lead = (leads || []).find((l: any) => l.company_id === c.id);
        const inter = interactions[c.id] || {};
        const estado = lead?.estado || inter.estado || 'sin_empezar';
        const lastAct = lastActivityByCompany.get(c.id) || null;
        const proxima =
          lead?.next_action_date || inter.proximoContacto || nextActionByCompany.get(c.id) || null;

        const motivos: { id: MotivoId; detalle: string }[] = [];

        // 1. Sin actividad reciente
        if (!lastAct) {
          motivos.push({ id: 'sin_actividad', detalle: 'Sin actividad registrada' });
        } else if (new Date(lastAct) < hace30) {
          const dias = Math.floor((now.getTime() - new Date(lastAct).getTime()) / 86400000);
          motivos.push({ id: 'sin_actividad', detalle: `Última actividad hace ${dias} días` });
        }

        // 2. Sin próxima acción (solo clientes activos)
        if (ACTIVOS.includes(estado) && !proxima) {
          motivos.push({ id: 'sin_proxima', detalle: 'Activo sin próximo contacto' });
        }

        // 3. Propuestas pendientes
        if (estado === 'propuesta' || estado === 'negociacion') {
          motivos.push({
            id: 'propuesta_pendiente',
            detalle: estado === 'propuesta' ? 'Propuesta enviada' : 'En negociación',
          });
        }

        // 4. Datos incompletos
        const faltan: string[] = [];
        const tel = c.contactInfo?.phone || (c.contactInfo as any)?.telefono;
        if (!tel) faltan.push('teléfono');
        if (!(c.decisionMakers || []).length) faltan.push('decisor');
        if (!c.address) faltan.push('dirección');
        if (!lastAct) faltan.push('actividad');
        if (faltan.length) {
          motivos.push({ id: 'datos_incompletos', detalle: `Falta: ${faltan.join(', ')}` });
        }

        return { company: c, estado, motivos };
      })
      .filter((i) => i.motivos.length > 0);
  }, [companies, leads, allActivities, interactions]);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (motivoFilter === 'todos' || i.motivos.some((m) => m.id === motivoFilter)) &&
          (estadoFilter === 'todos' || i.estado === estadoFilter) &&
          i.company.opportunityScore >= minScore,
      ),
    [items, motivoFilter, estadoFilter, minScore],
  );

  const byMotivo = useMemo(() => {
    const map = new Map<MotivoId, CompanyAttention[]>();
    MOTIVOS.forEach((m) => map.set(m.id, []));
    filtered.forEach((i) => {
      i.motivos.forEach((m) => {
        if (motivoFilter === 'todos' || m.id === motivoFilter) {
          map.get(m.id)!.push({ ...i, motivos: [m] });
        }
      });
    });
    // Ordenar por score descendente
    map.forEach((arr) => arr.sort((a, b) => b.company.opportunityScore - a.company.opportunityScore));
    return map;
  }, [filtered, motivoFilter]);

  const estadoInfo = (id: string) => ESTADOS.find((e) => e.id === id) || ESTADOS[0];

  const selectStyle: React.CSSProperties = {
    ...mono,
    fontSize: 10,
    letterSpacing: 1,
    background: T.cardAlt,
    border: `1px solid ${T.borderSubtle}`,
    color: T.textSecondary,
    borderRadius: 8,
    padding: '7px 10px',
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div>
      {/* Cabecera */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ ...mono, fontSize: 12, fontWeight: 700, letterSpacing: 2, color: T.textPrimary }}>
          📑 PANEL DE SEGUIMIENTO DE INFORMES
        </div>
        <div style={{ ...mono, fontSize: 9, color: T.textMuted, letterSpacing: 1, marginTop: 4 }}>
          {filtered.length} CLIENTES REQUIEREN ATENCIÓN · SOLO LECTURA
        </div>
      </div>

      {/* Filtros */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          marginBottom: 16,
          padding: '10px 12px',
          background: T.card,
          border: `1px solid ${T.borderSubtle}`,
          borderRadius: 12,
        }}
      >
        <span style={{ ...mono, fontSize: 9, letterSpacing: 1, color: T.textLabel }}>FILTROS:</span>
        <select
          aria-label="Filtrar por motivo"
          value={motivoFilter}
          onChange={(e) => setMotivoFilter(e.target.value as any)}
          style={selectStyle}
        >
          <option value="todos">TODOS LOS MOTIVOS</option>
          {MOTIVOS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.icon} {m.title}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por estado"
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="todos">TODOS LOS ESTADOS</option>
          {ESTADOS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label.toUpperCase()}
            </option>
          ))}
        </select>
        <select
          aria-label="Score mínimo"
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          style={selectStyle}
        >
          <option value={0}>SCORE ≥ 0</option>
          <option value={50}>SCORE ≥ 50</option>
          <option value={60}>SCORE ≥ 60</option>
          <option value={70}>SCORE ≥ 70</option>
          <option value={80}>SCORE ≥ 80</option>
        </select>
        {(motivoFilter !== 'todos' || estadoFilter !== 'todos' || minScore > 0) && (
          <button
            onClick={() => {
              setMotivoFilter('todos');
              setEstadoFilter('todos');
              setMinScore(0);
            }}
            style={{
              ...selectStyle,
              color: T.accent,
              border: `1px solid ${T.accent}55`,
              background: `${T.accent}11`,
            }}
          >
            ✕ LIMPIAR
          </button>
        )}
      </div>

      {/* Tarjetas por motivo */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 14,
          alignItems: 'start',
        }}
      >
        {MOTIVOS.filter((m) => motivoFilter === 'todos' || m.id === motivoFilter).map((m) => {
          const list = byMotivo.get(m.id) || [];
          return (
            <div
              key={m.id}
              style={{
                background: T.card,
                border: `1px solid ${T.borderSubtle}`,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              {/* Card header */}
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: `1px solid ${T.borderSubtle}`,
                  background: `${m.color}0d`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: m.color }}>
                    {m.icon} {m.title}
                  </div>
                  <div style={{ ...mono, fontSize: 8.5, color: T.textMuted, marginTop: 3, letterSpacing: 0.5 }}>
                    {m.desc}
                  </div>
                </div>
                <span
                  style={{
                    ...mono,
                    fontSize: 14,
                    fontWeight: 700,
                    color: m.color,
                    background: `${m.color}1a`,
                    border: `1px solid ${m.color}44`,
                    borderRadius: 8,
                    padding: '4px 10px',
                    minWidth: 34,
                    textAlign: 'center',
                  }}
                >
                  {list.length}
                </span>
              </div>

              {/* Rows */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {list.length === 0 && (
                  <div style={{ padding: '16px 14px', ...mono, fontSize: 10, color: T.textMuted }}>
                    ✓ Nada pendiente aquí
                  </div>
                )}
                {list.slice(0, 10).map((item) => {
                  const est = estadoInfo(item.estado);
                  const motivo = item.motivos[0];
                  return (
                    <div
                      key={`${m.id}-${item.company.id}`}
                      onClick={() => onCompanySelect(item.company)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderBottom: `1px solid ${T.borderSubtle}`,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = T.cardHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Score */}
                      <span
                        style={{
                          ...mono,
                          fontSize: 11,
                          fontWeight: 700,
                          minWidth: 30,
                          textAlign: 'center',
                          padding: '3px 0',
                          borderRadius: 6,
                          color:
                            item.company.opportunityScore >= 80
                              ? '#ef4444'
                              : item.company.opportunityScore >= 60
                                ? '#f59e0b'
                                : T.textMuted,
                          background:
                            item.company.opportunityScore >= 80
                              ? '#ef444415'
                              : item.company.opportunityScore >= 60
                                ? '#f59e0b15'
                                : T.cardAlt,
                        }}
                      >
                        {item.company.opportunityScore}
                      </span>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: T.textPrimary,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.company.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              ...mono,
                              fontSize: 8.5,
                              letterSpacing: 0.5,
                              padding: '2px 6px',
                              borderRadius: 5,
                              background: `${est.color}18`,
                              color: est.color,
                              border: `1px solid ${est.color}33`,
                            }}
                          >
                            {est.label.toUpperCase()}
                          </span>
                          <span style={{ ...mono, fontSize: 8.5, color: T.textMuted }}>{motivo.detalle}</span>
                        </div>
                      </div>

                      {/* Registrar actividad */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivityCompany(item.company);
                        }}
                        style={{
                          ...mono,
                          fontSize: 8.5,
                          letterSpacing: 0.5,
                          padding: '6px 9px',
                          borderRadius: 7,
                          background: '#22c55e15',
                          border: '1px solid #22c55e44',
                          color: '#22c55e',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        ＋ ACTIVIDAD
                      </button>

                      {/* Ver informe */}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportCompany(item.company);
                        }}
                        style={{
                          ...mono,
                          fontSize: 8.5,
                          letterSpacing: 0.5,
                          padding: '6px 9px',
                          borderRadius: 7,
                          background: `${T.accent}15`,
                          border: `1px solid ${T.accent}44`,
                          color: T.accent,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        📄 VER INFORME
                      </button>
                    </div>
                  );
                })}
                {list.length > 10 && (
                  <div style={{ padding: '8px 14px', ...mono, fontSize: 9, color: T.textMuted, textAlign: 'center' }}>
                    + {list.length - 10} MÁS · USA LOS FILTROS PARA ACOTAR
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Informe rápido directo */}
      {reportCompany && (
        <QuickReportModal
          company={reportCompany}
          estado={
            (leads || []).find((l: any) => l.company_id === reportCompany.id)?.estado ||
            interactions[reportCompany.id]?.estado ||
            'sin_empezar'
          }
          proximoContacto={interactions[reportCompany.id]?.proximoContacto || null}
          ultimoContacto={interactions[reportCompany.id]?.ultimoContacto || null}
          onClose={() => setReportCompany(null)}
        />
      )}

      {/* Registro rápido de actividad */}
      {activityCompany && (
        <QuickActivityModal
          company={activityCompany}
          onClose={() => setActivityCompany(null)}
          onSaved={(nextDate) => {
            if (!nextDate) return;
            try {
              const raw = localStorage.getItem('nexus_interactions');
              const map = raw ? JSON.parse(raw) : {};
              const prev = map[activityCompany.id] || {};
              const current = prev.proximoContacto;
              if (!current || nextDate > current) {
                map[activityCompany.id] = { ...prev, proximoContacto: nextDate };
                localStorage.setItem('nexus_interactions', JSON.stringify(map));
              }
            } catch {
              /* ignore */
            }
          }}
        />
      )}

    </div>
  );
}
