import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Company } from '@/data/companies';
import { useCompanyActivities, ACTIVITY_TYPES, ActivityType, ActivityInput } from '@/hooks/useCompanyActivities';

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

const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace" };

const inputStyle: React.CSSProperties = {
  width: '100%', background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 6,
  padding: '6px 10px', color: T.textSecondary, fontSize: 11, outline: 'none',
  fontFamily: "'DM Sans', sans-serif", colorScheme: 'var(--t-color-scheme)' as any,
};

const labelStyle: React.CSSProperties = {
  ...mono, fontSize: 8, color: T.textMuted, letterSpacing: 1, marginBottom: 4, display: 'block',
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): ActivityInput => ({
  activity_date: today(),
  activity_type: 'llamada',
  summary: '',
  outcome: '',
  next_step: '',
  next_action_date: '',
});

interface Props {
  company: Company;
  onClose: () => void;
  onSaved?: (nextActionDate: string | null) => void;
}

export function QuickActivityModal({ company, onClose, onSaved }: Props) {
  const qc = useQueryClient();
  const { createActivity } = useCompanyActivities(company.id);
  const [form, setForm] = useState<ActivityInput>(emptyForm());

  const patch = useCallback((p: Partial<ActivityInput>) => setForm(prev => ({ ...prev, ...p })), []);

  const saving = createActivity.isPending;
  const canSave = !!form.summary.trim() && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    const payload: ActivityInput = {
      ...form,
      summary: form.summary.trim(),
      outcome: form.outcome?.trim() || null,
      next_step: form.next_step?.trim() || null,
      next_action_date: form.next_action_date || null,
    };
    try {
      await createActivity.mutateAsync(payload);
      // Refresca el panel Informes (contadores y listas)
      await qc.invalidateQueries({ queryKey: ['informes-activities'] });
      await qc.invalidateQueries({ queryKey: ['agenda-activities'] });
      toast.success('Actividad registrada');
      onSaved?.(payload.next_action_date || null);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Error al guardar la actividad');
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 14,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 14,
          width: '100%', maxWidth: 460, maxHeight: '88vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
          padding: '14px 16px', borderBottom: `1px solid ${T.borderSubtle}`,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: T.accent }}>
              ＋ REGISTRAR ACTIVIDAD
            </div>
            <div style={{
              fontSize: 12.5, fontWeight: 600, color: T.textPrimary, marginTop: 3,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {company.name}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 15 }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <span style={labelStyle}>TIPO</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {ACTIVITY_TYPES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => patch({ activity_type: t.id as ActivityType })}
                  style={{
                    padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
                    background: form.activity_type === t.id ? `${'var(--t-accent)'}22` : 'transparent',
                    border: `1px solid ${form.activity_type === t.id ? T.accent : T.borderSubtle}`,
                    color: form.activity_type === t.id ? T.accent : T.textTertiary,
                    ...mono, fontSize: 9, letterSpacing: 1,
                  }}
                >
                  {t.icon} {t.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 130px' }}>
              <span style={labelStyle}>FECHA</span>
              <input
                type="date" aria-label="Fecha" value={form.activity_date}
                onChange={e => patch({ activity_date: e.target.value })} style={inputStyle}
              />
            </div>
            <div style={{ flex: '1 1 130px' }}>
              <span style={labelStyle}>PRÓXIMA ACCIÓN</span>
              <input
                type="date" aria-label="Próxima acción" value={form.next_action_date || ''}
                onChange={e => patch({ next_action_date: e.target.value })} style={inputStyle}
              />
            </div>
          </div>

          <div>
            <span style={labelStyle}>RESUMEN</span>
            <textarea
              rows={2} aria-label="Resumen" value={form.summary} placeholder="¿Qué se habló?"
              onChange={e => patch({ summary: e.target.value })}
              style={{ ...inputStyle, resize: 'none', fontSize: 12 }}
            />
          </div>

          <div>
            <span style={labelStyle}>RESULTADO</span>
            <input
              aria-label="Resultado" value={form.outcome || ''} placeholder="Interesado, no contesta, pide oferta..."
              onChange={e => patch({ outcome: e.target.value })} style={inputStyle}
            />
          </div>

          <div>
            <span style={labelStyle}>PRÓXIMO PASO</span>
            <input
              aria-label="Próximo paso" value={form.next_step || ''} placeholder="Enviar propuesta de fibra..."
              onChange={e => patch({ next_step: e.target.value })} style={inputStyle}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          padding: '12px 16px', borderTop: `1px solid ${T.borderSubtle}`,
        }}>
          <button
            type="button" onClick={onClose}
            style={{
              padding: '7px 14px', borderRadius: 7, cursor: 'pointer', background: 'none',
              border: `1px solid ${T.borderSubtle}`, color: T.textTertiary, ...mono, fontSize: 9, letterSpacing: 1,
            }}
          >
            CANCELAR
          </button>
          <button
            type="button" onClick={handleSave} disabled={!canSave}
            style={{
              padding: '7px 16px', borderRadius: 7, cursor: canSave ? 'pointer' : 'not-allowed',
              background: T.accent, border: `1px solid ${T.accent}`, color: '#fff',
              ...mono, fontSize: 9, letterSpacing: 1, opacity: canSave ? 1 : 0.4,
            }}
          >
            {saving ? 'GUARDANDO...' : 'GUARDAR'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
