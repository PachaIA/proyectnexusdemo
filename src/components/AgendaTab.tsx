import { getEffectiveUser } from '@/lib/openUser';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/data/companies';
import { useCompanies } from '@/hooks/useCompanies';
import { useLeads } from '@/hooks/useLeads';
import { QuickReportModal } from '@/components/QuickReportModal';
import { QuickActivityModal } from '@/components/QuickActivityModal';
import { ACTIVITY_TYPES } from '@/hooks/useCompanyActivities';

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

const mono: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };

const ESTADOS = [
  { id: 'lead', label: 'Lead', color: 'var(--muted-text-accessible)' },
  { id: 'contactado', label: 'Contactado', color: 'var(--interactive)' },
  { id: 'propuesta', label: 'Propuesta', color: 'var(--alert-text)' },
  { id: 'negociacion', label: 'Negociación', color: 'var(--warning-text)' },
  { id: 'ganada', label: 'Ganada', color: 'var(--interactive)' },
  { id: 'perdida', label: 'Perdida', color: 'var(--alert-text)' },
];

const ACTIVOS = ['contactado', 'propuesta', 'negociacion'];

type BloqueId = 'vencidas' | 'hoy' | 'proximos7' | 'sin_fecha';

const BLOQUES: { id: BloqueId; title: string; icon: string; color: string; desc: string; empty: string }[] = [
  { id: 'vencidas', title: 'VENCIDAS', icon: '🔴', color: 'var(--alert-text)', desc: 'Fecha de acción anterior a hoy', empty: '✓ Ninguna tarea vencida' },
  { id: 'hoy', title: 'HOY', icon: '🟢', color: 'var(--success-text)', desc: 'Acciones previstas para hoy', empty: '✓ Nada previsto para hoy' },
  { id: 'proximos7', title: 'PRÓXIMOS 7 DÍAS', icon: '🔵', color: 'var(--interactive)', desc: 'Acciones en la próxima semana', empty: '✓ Nada en los próximos 7 días' },
  { id: 'sin_fecha', title: 'SIN FECHA', icon: '⚪', color: 'var(--muted-text-accessible)', desc: 'Activos sin próxima acción definida', empty: '✓ Todo el activo tiene fecha' },
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

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

interface AgendaRow {
  company: Company;
  estado: string;
  activityId: string | null; // null para filas "sin fecha" derivadas de clientes activos
  tipo: string;
  fecha: string | null;
  resumen: string;
  proximoPaso: string;
  bloque: BloqueId;
}

interface AgendaTabProps {
  onCompanySelect: (company: Company) => void;
}

export function AgendaTab({ onCompanySelect }: AgendaTabProps) {
  const qc = useQueryClient();
  const { companies } = useCompanies();
  const { leads } = useLeads();
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [minScore, setMinScore] = useState<number>(0);
  const [reportCompany, setReportCompany] = useState<Company | null>(null);
  const [activityCompany, setActivityCompany] = useState<Company | null>(null);

  // Todas las actividades del usuario (solo lectura)
  const { data: allActivities = [] } = useQuery({
    queryKey: ['agenda-activities'],
    queryFn: async () => {
      const { data: { user } } = await getEffectiveUser();
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('company_activities')
        .select('id, company_id, activity_type, activity_date, next_action_date, summary, next_step')
        .eq('user_id', user.id)
        .order('next_action_date', { ascending: true });
      if (error) throw error;
      return (data || []) as {
        id: string; company_id: string; activity_type: string; activity_date: string;
        next_action_date: string | null; summary: string; next_step: string | null;
      }[];
    },
  });

  const interactions = useMemo(loadInteractions, []);

  const estadoDe = (c: Company): string => {
    const lead = (leads || []).find((l: any) => l.company_id === c.id);
    return lead?.estado || interactions[c.id]?.estado || 'lead';
  };

  const rows = useMemo<AgendaRow[]>(() => {
    const today = new Date();
    const hoy = isoDay(today);
    const limite7 = isoDay(new Date(today.getTime() + 7 * 86400000));
    const byId = new Map((companies || []).map((c) => [c.id, c]));

    const out: AgendaRow[] = [];
    const companiesConFecha = new Set<string>();

    allActivities.forEach((a) => {
      const company = byId.get(a.company_id);
      if (!company || (company as any).archivedAt) return;

      let bloque: BloqueId | null = null;
      if (a.next_action_date) {
        companiesConFecha.add(a.company_id);
        if (a.next_action_date < hoy) bloque = 'vencidas';
        else if (a.next_action_date === hoy) bloque = 'hoy';
        else if (a.next_action_date <= limite7) bloque = 'proximos7';
        else bloque = null; // fuera de ventana
      } else {
        bloque = 'sin_fecha';
      }
      if (!bloque) return;

      out.push({
        company,
        estado: estadoDe(company),
        activityId: a.id,
        tipo: a.activity_type,
        fecha: a.next_action_date,
        resumen: a.summary || '',
        proximoPaso: a.next_step || '',
        bloque,
      });
    });

    // Clientes activos sin ninguna próxima acción registrada
    (companies || [])
      .filter((c) => !(c as any).archivedAt)
      .forEach((c) => {
        if (companiesConFecha.has(c.id)) return;
        const estado = estadoDe(c);
        if (!ACTIVOS.includes(estado)) return;
        const tieneSinFecha = out.some((r) => r.bloque === 'sin_fecha' && r.company.id === c.id);
        if (tieneSinFecha) return;
        out.push({
          company: c,
          estado,
          activityId: null,
          tipo: 'sin_accion',
          fecha: null,
          resumen: 'Cliente activo sin próxima acción',
          proximoPaso: '',
          bloque: 'sin_fecha',
        });
      });

    return out;
  }, [companies, leads, allActivities, interactions]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (tipoFilter === 'todos' || r.tipo === tipoFilter) &&
          (estadoFilter === 'todos' || r.estado === estadoFilter) &&
          r.company.opportunityScore >= minScore,
      ),
    [rows, tipoFilter, estadoFilter, minScore],
  );

  const byBloque = useMemo(() => {
    const map = new Map<BloqueId, AgendaRow[]>();
    BLOQUES.forEach((b) => map.set(b.id, []));
    filtered.forEach((r) => map.get(r.bloque)!.push(r));
    // Urgencia: por fecha ascendente dentro del bloque, luego score descendente
    map.forEach((arr) =>
      arr.sort((a, b) => {
        const fa = a.fecha || '9999-12-31';
        const fb = b.fecha || '9999-12-31';
        if (fa !== fb) return fa < fb ? -1 : 1;
        return b.company.opportunityScore - a.company.opportunityScore;
      }),
    );
    return map;
  }, [filtered]);

  const estadoInfo = (id: string) => ESTADOS.find((e) => e.id === id) || ESTADOS[0];
  const tipoInfo = (id: string) =>
    ACTIVITY_TYPES.find((t) => t.id === id) || { id, label: id === 'sin_accion' ? 'Sin acción' : id, icon: '•' };

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

  const total = filtered.length;

  return (
    <div>
      {/* Cabecera */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ ...mono, fontSize: 12, fontWeight: 700, letterSpacing: 2, color: T.textPrimary }}>
          🗓️ AGENDA · ACTIVIDADES PENDIENTES
        </div>
        <div style={{ ...mono, fontSize: 9, color: T.textMuted, letterSpacing: 1, marginTop: 4 }}>
          {total} TAREAS · ORDENADAS POR URGENCIA Y SCORE
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
          aria-label="Filtrar por tipo de actividad"
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="todos">TODOS LOS TIPOS</option>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon} {t.label.toUpperCase()}
            </option>
          ))}
          <option value="sin_accion">⚪ SIN ACCIÓN</option>
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
        {(tipoFilter !== 'todos' || estadoFilter !== 'todos' || minScore > 0) && (
          <button
            onClick={() => {
              setTipoFilter('todos');
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

      {/* Bloques */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 14,
          alignItems: 'start',
        }}
      >
        {BLOQUES.map((b) => {
          const list = byBloque.get(b.id) || [];
          return (
            <div
              key={b.id}
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
                  background: `${b.color}0d`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: b.color }}>
                    {b.icon} {b.title}
                  </div>
                  <div style={{ ...mono, fontSize: 8.5, color: T.textMuted, marginTop: 3, letterSpacing: 0.5 }}>
                    {b.desc}
                  </div>
                </div>
                <span
                  style={{
                    ...mono,
                    fontSize: 14,
                    fontWeight: 700,
                    color: b.color,
                    background: `${b.color}1a`,
                    border: `1px solid ${b.color}44`,
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
                  <div style={{ padding: '16px 14px', ...mono, fontSize: 10, color: T.textMuted }}>{b.empty}</div>
                )}
                {list.map((row, idx) => {
                  const est = estadoInfo(row.estado);
                  const tipo = tipoInfo(row.tipo);
                  return (
                    <div
                      key={row.activityId || `${row.company.id}-${idx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderBottom: `1px solid ${T.borderSubtle}`,
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
                            row.company.opportunityScore >= 80
                              ? 'var(--alert-text)'
                              : row.company.opportunityScore >= 60
                                ? 'var(--warning-text)'
                                : T.textMuted,
                          background:
                            row.company.opportunityScore >= 80
                              ? 'color-mix(in srgb, var(--alert-text) 8.2%, transparent)'
                              : row.company.opportunityScore >= 60
                                ? 'color-mix(in srgb, var(--warning-text) 8.2%, transparent)'
                                : T.cardAlt,
                        }}
                      >
                        {row.company.opportunityScore}
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
                          {row.company.name}
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
                          <span style={{ ...mono, fontSize: 8.5, color: T.textTertiary }}>
                            {tipo.icon} {tipo.label.toUpperCase()}
                          </span>
                          <span style={{ ...mono, fontSize: 8.5, color: b.color }}>
                            {row.fecha ? new Date(row.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase() : 'SIN FECHA'}
                          </span>
                        </div>
                        {row.resumen && (
                          <div
                            style={{
                              fontSize: 11,
                              color: T.textTertiary,
                              marginTop: 3,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {row.resumen}
                          </div>
                        )}
                        {row.proximoPaso && (
                          <div
                            style={{
                              ...mono,
                              fontSize: 8.5,
                              color: T.textMuted,
                              marginTop: 2,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            → {row.proximoPaso}
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => setActivityCompany(row.company)}
                          style={{
                            ...mono,
                            fontSize: 8.5,
                            letterSpacing: 0.5,
                            padding: '5px 9px',
                            borderRadius: 7,
                            background: 'color-mix(in srgb, var(--success-text) 8.2%, transparent)',
                            border: '1px solid color-mix(in srgb, var(--success-text) 26.7%, transparent)',
                            color: 'var(--success-text)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ＋ ACTIVIDAD
                        </button>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => onCompanySelect(row.company)}
                            style={{
                              ...mono,
                              fontSize: 8,
                              letterSpacing: 0.5,
                              padding: '5px 8px',
                              borderRadius: 7,
                              background: T.cardAlt,
                              border: `1px solid ${T.borderSubtle}`,
                              color: T.textSecondary,
                              cursor: 'pointer',
                              flex: 1,
                            }}
                          >
                            FICHA
                          </button>
                          <button
                            onClick={() => setReportCompany(row.company)}
                            style={{
                              ...mono,
                              fontSize: 8,
                              letterSpacing: 0.5,
                              padding: '5px 8px',
                              borderRadius: 7,
                              background: `${T.accent}15`,
                              border: `1px solid ${T.accent}44`,
                              color: T.accent,
                              cursor: 'pointer',
                              flex: 1,
                            }}
                          >
                            INFORME
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal informe rápido */}
      {reportCompany && (
        <QuickReportModal
          company={reportCompany}
          estado={estadoDe(reportCompany)}
          onClose={() => setReportCompany(null)}
        />
      )}

      {/* Modal actividad rápida */}
      {activityCompany && (
        <QuickActivityModal
          company={activityCompany}
          onClose={() => setActivityCompany(null)}
          onSaved={async () => {
            setActivityCompany(null);
            // Refresca la agenda sin recargar
            await qc.invalidateQueries({ queryKey: ['agenda-activities'] });
            await qc.invalidateQueries({ queryKey: ['company-activities'] });
          }}
        />
      )}
    </div>
  );
}
