import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  useCompanyActivities, ACTIVITY_TYPES, ActivityType, CompanyActivity, ActivityInput,
} from '@/hooks/useCompanyActivities';

const T = {
  card: 'var(--t-card)',
  cardAlt: 'var(--t-card-alt)',
  border: 'var(--t-border)',
  borderSubtle: 'var(--t-border-subtle)',
  accent: 'var(--t-accent)',
  textPrimary: 'var(--t-text-primary)',
  textSecondary: 'var(--t-text-secondary)',
  textTertiary: 'var(--t-text-tertiary)',
  textMuted: 'var(--t-text-muted)',
};

const mono: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%', background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 6,
  padding: '6px 10px', color: T.textSecondary, fontSize: 11, outline: 'none',
  fontFamily: "'Inter', sans-serif", colorScheme: 'var(--t-color-scheme)' as any,
};

const labelStyle: React.CSSProperties = { ...mono, fontSize: 8, color: T.textMuted, letterSpacing: 1, marginBottom: 4, display: 'block' };

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): ActivityInput => ({
  activity_date: today(),
  activity_type: 'llamada',
  summary: '',
  outcome: '',
  next_step: '',
  next_action_date: '',
});

interface FormProps {
  value: ActivityInput;
  onChange: (patch: Partial<ActivityInput>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

// Defined outside render scope to keep input focus stable
function ActivityForm({ value, onChange, onSave, onCancel, saving }: FormProps) {
  return (
    <div style={{
      background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10,
      padding: 12, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10,
    }}>
      <div>
        <span style={labelStyle}>TIPO</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {ACTIVITY_TYPES.map(t => (
            <button key={t.id} type="button" onClick={() => onChange({ activity_type: t.id as ActivityType })} style={{
              padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
              background: value.activity_type === t.id ? `color-mix(in srgb, ${'var(--t-accent)'} 13.3%, transparent)` : 'transparent',
              border: `1px solid ${value.activity_type === t.id ? T.accent : T.borderSubtle}`,
              color: value.activity_type === t.id ? T.accent : T.textTertiary,
              ...mono, fontSize: 9, letterSpacing: 1,
            }}>{t.icon} {t.label.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 130px' }}>
          <span style={labelStyle}>FECHA</span>
          <input type="date" value={value.activity_date}
            onChange={e => onChange({ activity_date: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: '1 1 130px' }}>
          <span style={labelStyle}>PRÓXIMA ACCIÓN</span>
          <input type="date" value={value.next_action_date || ''}
            onChange={e => onChange({ next_action_date: e.target.value })} style={inputStyle} />
        </div>
      </div>

      <div>
        <span style={labelStyle}>RESUMEN</span>
        <textarea rows={2} value={value.summary} placeholder="¿Qué se habló?"
          onChange={e => onChange({ summary: e.target.value })}
          style={{ ...inputStyle, resize: 'none', fontSize: 12 }} />
      </div>

      <div>
        <span style={labelStyle}>RESULTADO</span>
        <input value={value.outcome || ''} placeholder="Interesado, no contesta, pide oferta..."
          onChange={e => onChange({ outcome: e.target.value })} style={inputStyle} />
      </div>

      <div>
        <span style={labelStyle}>PRÓXIMO PASO</span>
        <input value={value.next_step || ''} placeholder="Enviar propuesta de fibra..."
          onChange={e => onChange({ next_step: e.target.value })} style={inputStyle} />
      </div>

      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{
          padding: '6px 14px', borderRadius: 6, cursor: 'pointer', background: 'none',
          border: `1px solid ${T.borderSubtle}`, color: T.textTertiary, ...mono, fontSize: 9, letterSpacing: 1,
        }}>CANCELAR</button>
        <button type="button" onClick={onSave} disabled={saving || !value.summary.trim()} style={{
          padding: '6px 14px', borderRadius: 6,
          cursor: saving || !value.summary.trim() ? 'not-allowed' : 'pointer',
          background: T.accent, border: `1px solid ${T.accent}`, color: 'var(--text)',
          ...mono, fontSize: 9, letterSpacing: 1, opacity: saving || !value.summary.trim() ? 0.4 : 1,
        }}>GUARDAR</button>
      </div>
    </div>
  );
}

interface Props {
  companyId: string;
  /** Called with a next action date so the panel can update "Próximo contacto" */
  onNextActionDate?: (date: string) => void;
}

export function ActivitySection({ companyId, onNextActionDate }: Props) {
  const { activities, isLoading, createActivity, updateActivity, deleteActivity } = useCompanyActivities(companyId);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ActivityInput>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const patch = useCallback((p: Partial<ActivityInput>) => setForm(prev => ({ ...prev, ...p })), []);

  const closeForm = useCallback(() => {
    setAdding(false); setEditingId(null); setForm(emptyForm());
  }, []);

  const propagateNextDate = (date?: string | null) => {
    if (!date || !onNextActionDate) return;
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    if (d.getTime() >= now.getTime()) onNextActionDate(date);
  };

  const handleSave = async () => {
    const payload: ActivityInput = {
      ...form,
      summary: form.summary.trim(),
      outcome: form.outcome?.trim() || null,
      next_step: form.next_step?.trim() || null,
      next_action_date: form.next_action_date || null,
    };
    try {
      if (editingId) {
        await updateActivity.mutateAsync({ id: editingId, ...payload });
        toast.success('Actividad actualizada');
      } else {
        await createActivity.mutateAsync(payload);
        toast.success('Actividad registrada');
      }
      propagateNextDate(payload.next_action_date);
      closeForm();
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar la actividad');
    }
  };

  const startEdit = (a: CompanyActivity) => {
    setEditingId(a.id);
    setAdding(false);
    setForm({
      activity_date: a.activity_date,
      activity_type: a.activity_type,
      summary: a.summary,
      outcome: a.outcome || '',
      next_step: a.next_step || '',
      next_action_date: a.next_action_date || '',
    });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteActivity.mutateAsync(deleteId);
      toast.success('Actividad eliminada');
    } catch (e: any) {
      toast.error(e?.message || 'Error al eliminar');
    }
    setDeleteId(null);
  };

  const saving = createActivity.isPending || updateActivity.isPending;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ ...mono, fontSize: 9, color: 'var(--t-text-tertiary)', letterSpacing: 2 }}>ACTIVIDAD Y SEGUIMIENTO</div>
        {!adding && !editingId && (
          <button onClick={() => { setForm(emptyForm()); setAdding(true); }} style={{
            padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${T.accent}`, color: T.accent,
            ...mono, fontSize: 9, letterSpacing: 1,
          }}>+ REGISTRAR ACTIVIDAD</button>
        )}
      </div>

      {(adding || editingId) && (
        <ActivityForm value={form} onChange={patch} onSave={handleSave} onCancel={closeForm} saving={saving} />
      )}

      {isLoading ? (
        <div style={{ ...mono, fontSize: 9, color: T.textMuted }}>CARGANDO...</div>
      ) : activities.length === 0 ? (
        <div style={{ ...mono, fontSize: 9, color: T.textMuted }}>SIN ACTIVIDADES REGISTRADAS</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {activities.map(a => {
            const type = ACTIVITY_TYPES.find(t => t.id === a.activity_type);
            return (
              <div key={a.id} style={{
                background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 8, padding: '8px 10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ ...mono, fontSize: 9, color: T.accent, letterSpacing: 1 }}>
                    {type?.icon} {(type?.label || a.activity_type).toUpperCase()}
                  </span>
                  <span style={{ ...mono, fontSize: 9, color: T.textMuted }}>
                    {new Date(a.activity_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </span>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => startEdit(a)} title="Editar" style={{
                    background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 11, padding: '0 2px',
                  }}>✎</button>
                  <button onClick={() => setDeleteId(a.id)} title="Eliminar" style={{
                    background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 11, padding: '0 2px',
                  }}>✕</button>
                </div>
                {a.summary && (
                  <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5, marginTop: 4 }}>{a.summary}</div>
                )}
                {(a.outcome || a.next_step || a.next_action_date) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 5 }}>
                    {a.outcome && <span style={{ ...mono, fontSize: 9, color: T.textTertiary }}>RESULTADO: {a.outcome}</span>}
                    {a.next_step && <span style={{ ...mono, fontSize: 9, color: T.textTertiary }}>SIGUIENTE: {a.next_step}</span>}
                    {a.next_action_date && (
                      <span style={{ ...mono, fontSize: 9, color: 'var(--alert-text)' }}>
                        📅 {new Date(a.next_action_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
            padding: '24px 28px', maxWidth: 360, width: '90%', boxShadow: "none",
          }}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: T.textPrimary, letterSpacing: 1, marginBottom: 10 }}>
              ¿Eliminar esta actividad?
            </div>
            <p style={{ fontSize: 12, color: T.textTertiary, marginBottom: 18, lineHeight: 1.5 }}>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteId(null)} style={{
                padding: '7px 16px', borderRadius: 6, cursor: 'pointer', background: 'none',
                border: `1px solid ${T.borderSubtle}`, color: T.textTertiary, ...mono, fontSize: 10, letterSpacing: 1,
              }}>CANCELAR</button>
              <button onClick={confirmDelete} style={{
                padding: '7px 16px', borderRadius: 6, cursor: 'pointer', background: 'var(--alert-text)',
                border: 'none', color: 'var(--text)', ...mono, fontSize: 10, fontWeight: 700, letterSpacing: 1,
              }}>ELIMINAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
