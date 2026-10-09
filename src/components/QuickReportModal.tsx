import { fmtEur } from '@/hooks/useOpportunityLines';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Company } from '@/data/companies';
import { useSedes } from '@/hooks/useSedes';
import { useSales } from '@/hooks/useSales';
import { useLeads } from '@/hooks/useLeads';
import { useCompanyActivities, ACTIVITY_TYPES } from '@/hooks/useCompanyActivities';

interface QuickReportModalProps {
  company: Company;
  estado?: string | null;
  proximoContacto?: string | null;
  ultimoContacto?: string | null;
  onClose: () => void;
}

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
  textLabel: 'var(--t-text-label)',
};

const mono: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };

const fmtDate = (d?: string | null) => {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const typeLabel = (t: string) => ACTIVITY_TYPES.find((a) => a.id === t)?.label || t;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: T.cardAlt,
        border: `1px solid ${T.borderSubtle}`,
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <div style={{ ...mono, fontSize: 9, letterSpacing: 2, color: T.textLabel, marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <span style={{ ...mono, fontSize: 9, letterSpacing: 1, color: T.textMuted, minWidth: 120 }}>
        {label}
      </span>
      <span style={{ fontSize: 12.5, color: T.textSecondary, flex: 1, minWidth: 140 }}>
        {value || <span style={{ color: T.textMuted }}>—</span>}
      </span>
    </div>
  );
}

export function QuickReportModal({
  company,
  estado,
  proximoContacto,
  ultimoContacto,
  onClose,
}: QuickReportModalProps) {
  const { sedes } = useSedes(company.id);
  const { sales } = useSales(company.id);
  const { activities } = useCompanyActivities(company.id);
  const { leads } = useLeads();

  const lead = useMemo(
    () => (leads || []).find((l: any) => l.company_id === company.id) || null,
    [leads, company.id],
  );

  const principalSede = useMemo(() => sedes.find((s) => s.principal) || sedes[0] || null, [sedes]);
  const direccion = useMemo(() => {
    if (principalSede) {
      return [
        principalSede.direccion,
        [principalSede.cp, principalSede.localidad, principalSede.provincia].filter(Boolean).join(' · '),
      ]
        .filter(Boolean)
        .join(' — ');
    }
    return company.address || '';
  }, [principalSede, company.address]);

  const contactos = (company.decisionMakers || []) as any[];
  const contactoPrincipal = useMemo(
    () => contactos.find((c: any) => c?.principal) || contactos[0] || null,
    [contactos],
  );

  const totals = useMemo(() => {
    return (sales || []).reduce(
      (acc, s) => ({
        movil: acc.movil + (s.lineas_movil || 0),
        fibra: acc.fibra + (s.lineas_fibra || 0),
        snav: acc.snav + Number(s.snav || 0),
        margen: acc.margen + Number(s.margen || 0),
      }),
      { movil: 0, fibra: 0, snav: 0, margen: 0 },
    );
  }, [sales]);

  const recent = (activities || []).slice(0, 5);
  const lastActivity = recent[0] || null;
  const nextSteps = (activities || [])
    .filter((a) => a.next_step && a.next_step.trim())
    .slice(0, 3);

  const proximaAccion = proximoContacto || lead?.next_action_date || null;

  const pendientes = useMemo(() => {
    const p: string[] = [];
    if (!contactoPrincipal) p.push('Sin contacto principal marcado');
    if (!contactos.length) p.push('Sin decisores registrados');
    if (!company.contactInfo?.phone && !(company.contactInfo as any)?.telefono) p.push('Sin teléfono');
    if (!company.contactInfo?.email) p.push('Sin email');
    if (!direccion) p.push('Sin dirección');
    if (!company.cif) p.push('Sin CIF');
    if (!proximaAccion) p.push('Sin próxima acción planificada');
    if (!activities.length) p.push('Sin actividad registrada');
    return p;
  }, [contactoPrincipal, contactos.length, company, direccion, proximaAccion, activities.length]);

  const generado = new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const buildText = () => {
    const L: string[] = [];
    L.push(`INFORME RÁPIDO DEL CLIENTE — ${company.name}`);
    L.push(`Generado el ${generado}`);
    L.push('');
    L.push('1. RESUMEN EJECUTIVO');
    L.push(`- Empresa: ${company.name}`);
    L.push(`- CIF: ${company.cif || '—'}`);
    L.push(`- Ubicación: ${direccion || company.location || '—'}`);
    L.push(`- Estado: ${estado || lead?.estado || 'lead'}`);
    L.push(`- Score: ${company.opportunityScore}`);
    L.push(`- Digitalización: ${company.digitalizationLevel || '—'}`);
    L.push(`- Empleados: ${company.employees}`);
    L.push(`- Multisede: ${sedes.length > 1 || company.isMultiSite ? `Sí (${sedes.length || 1} sedes)` : 'No'}`);
    L.push('');
    L.push('2. SITUACIÓN COMERCIAL');
    L.push(`- Productos recomendados: ${(company.recommendedProducts || []).join(', ') || '—'}`);
    L.push(`- Necesidades: ${(company.detectedNeeds || []).join(', ') || '—'}`);
    L.push(`- Señales de crecimiento: ${(company.growthSignals || []).join(', ') || '—'}`);
    L.push(
      `- Venta cerrada: ${sales.length} operaciones · ${totals.movil} móvil · ${totals.fibra} fibra · SNAV ${fmtEur(totals.snav)} · margen ${fmtEur(totals.margen)}`,
    );
    L.push(
      `- Pipeline: ${lead ? `${lead.estado} · próx. acción ${lead.next_action || '—'} ${fmtDate(lead.next_action_date) || ''}` : 'Sin lead asociado'}`,
    );
    L.push('');
    L.push('3. RELACIÓN Y ACTIVIDAD');
    L.push(
      `- Contacto principal: ${contactoPrincipal ? `${contactoPrincipal.name || contactoPrincipal.role || '—'} (${contactoPrincipal.role || '—'})` : '—'}`,
    );
    L.push(
      `- Decisores: ${contactos.map((c: any) => `${c.name || '—'} · ${c.role || '—'}`).join(' | ') || '—'}`,
    );
    L.push(
      `- Última actividad: ${lastActivity ? `${fmtDate(lastActivity.activity_date)} · ${typeLabel(lastActivity.activity_type)} · ${lastActivity.summary}` : '—'}`,
    );
    recent.forEach((a) => {
      L.push(`  · ${fmtDate(a.activity_date)} — ${typeLabel(a.activity_type)}: ${a.summary}${a.outcome ? ` (${a.outcome})` : ''}`);
    });
    L.push('');
    L.push('4. PRÓXIMOS PASOS');
    L.push(`- Próximo contacto: ${fmtDate(proximaAccion) || '—'}`);
    nextSteps.forEach((a) => L.push(`- ${a.next_step}${a.next_action_date ? ` (${fmtDate(a.next_action_date)})` : ''}`));
    L.push(`- Acción recomendada: ${company.nextBestAction?.type || '—'} — ${company.nextBestAction?.reason || '—'}`);
    L.push('');
    L.push('5. DATOS PENDIENTES');
    if (pendientes.length) pendientes.forEach((p) => L.push(`- ${p}`));
    else L.push('- Ficha completa');
    return L.join('\n');
  };

  const copyToClipboard = async (text: string, okMsg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(okMsg);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast.success(okMsg);
    }
  };

  const handleCopy = () => copyToClipboard(buildText(), 'Resumen copiado al portapapeles');

  const buildMarkdown = () => {
    const L: string[] = [];
    L.push(`# Informe rápido del cliente — ${company.name}`);
    L.push(`_Generado el ${generado}_`);
    L.push('');
    L.push('## 1. Resumen ejecutivo');
    L.push(`- **Empresa:** ${company.name}`);
    L.push(`- **CIF:** ${company.cif || '—'}`);
    L.push(`- **Ubicación:** ${direccion || company.location || '—'}`);
    L.push(`- **Estado:** ${estado || lead?.estado || 'lead'}`);
    L.push(`- **Score:** ${company.opportunityScore}`);
    L.push(`- **Digitalización:** ${company.digitalizationLevel || '—'}`);
    L.push(`- **Empleados:** ${company.employees}`);
    L.push(`- **Multisede:** ${sedes.length > 1 || company.isMultiSite ? `Sí (${sedes.length || 1} sedes)` : 'No'}`);
    L.push('');
    L.push('## 2. Situación comercial');
    L.push(`- **Productos recomendados:** ${(company.recommendedProducts || []).join(', ') || '—'}`);
    L.push(`- **Necesidades:** ${(company.detectedNeeds || []).join(', ') || '—'}`);
    L.push(`- **Señales de crecimiento:** ${(company.growthSignals || []).join(', ') || '—'}`);
    L.push(
      `- **Venta cerrada:** ${sales.length} operaciones · ${totals.movil} móvil · ${totals.fibra} fibra · SNAV ${fmtEur(totals.snav)} · margen ${fmtEur(totals.margen)}`,
    );
    L.push(
      `- **Pipeline:** ${lead ? `${lead.estado} · próx. acción ${lead.next_action || '—'} ${fmtDate(lead.next_action_date) || ''}` : 'Sin lead asociado'}`,
    );
    L.push('');
    L.push('## 3. Relación y actividad');
    L.push(
      `- **Contacto principal:** ${contactoPrincipal ? `${contactoPrincipal.name || '—'} (${contactoPrincipal.role || '—'})` : '—'}`,
    );
    L.push(
      `- **Decisores:** ${contactos.map((c: any) => `${c.name || '—'} · ${c.role || '—'}`).join(' | ') || '—'}`,
    );
    L.push(
      `- **Última actividad:** ${lastActivity ? `${fmtDate(lastActivity.activity_date)} · ${typeLabel(lastActivity.activity_type)} · ${lastActivity.summary}` : '—'}`,
    );
    recent.forEach((a) => {
      L.push(`  - ${fmtDate(a.activity_date)} — ${typeLabel(a.activity_type)}: ${a.summary}${a.outcome ? ` (${a.outcome})` : ''}`);
    });
    L.push('');
    L.push('## 4. Próximos pasos');
    L.push(`- **Próximo contacto:** ${fmtDate(proximaAccion) || '—'}`);
    nextSteps.forEach((a) => L.push(`- ${a.next_step}${a.next_action_date ? ` (${fmtDate(a.next_action_date)})` : ''}`));
    L.push(`- **Acción recomendada:** ${company.nextBestAction?.type || '—'} — ${company.nextBestAction?.reason || '—'}`);
    L.push('');
    L.push('## 5. Datos pendientes');
    if (pendientes.length) pendientes.forEach((p) => L.push(`- ⚠ ${p}`));
    else L.push('- ✓ Ficha completa');
    return L.join('\n');
  };

  const handleCopyMarkdown = () => copyToClipboard(buildMarkdown(), 'Markdown copiado al portapapeles');

  const handlePrint = () => {
    const esc = (s: string) =>
      String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const row = (label: string, value: string) =>
      `<tr><td class="lbl">${esc(label)}</td><td>${esc(value || '—')}</td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<title>Informe rápido — ${esc(company.name)}</title>
<style>
  :root { --bg: #EFE7D7; --surface: #F8F4EC; --border: #DED4C2; --text: #101A22; --muted-text-accessible: #5A6066; --alert-text: #A33D33; --success-text: #30624C; }
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; background: var(--surface); color: var(--text); margin: 0; font-size: 12px; line-height: 1.5; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .meta { color: var(--muted-text-accessible); font-size: 11px; margin-bottom: 16px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border); padding-bottom: 4px; margin: 18px 0 8px; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
  td { padding: 3px 6px; vertical-align: top; border-bottom: 1px solid var(--border); }
  td.lbl { width: 150px; font-weight: 600; color: var(--muted-text-accessible); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
  ul { margin: 4px 0; padding-left: 18px; }
  li { margin-bottom: 2px; }
  .warn { color: var(--alert-text); }
  .ok { color: var(--success-text); }
  .act { border-left: 3px solid var(--muted-text-accessible); padding-left: 8px; margin-bottom: 6px; }
  .act .d { font-size: 10px; color: var(--muted-text-accessible); text-transform: uppercase; }
</style></head><body>
<h1>Informe rápido del cliente — ${esc(company.name)}</h1>
<div class="meta">Generado el ${esc(generado)} · Grupo Enertel</div>

<h2>1. Resumen ejecutivo</h2>
<table>
${row('Empresa', company.name)}
${row('CIF', company.cif)}
${row('Ubicación', direccion || company.location)}
${row('Estado', (estado || lead?.estado || 'lead').toUpperCase())}
${row('Score', String(company.opportunityScore))}
${row('Digitalización', company.digitalizationLevel)}
${row('Empleados', String(company.employees))}
${row('Multisede', sedes.length > 1 || company.isMultiSite ? `Sí · ${sedes.length || 1} sedes` : 'No')}
</table>

<h2>2. Situación comercial</h2>
<table>
${row('Productos', (company.recommendedProducts || []).join(' · '))}
${row('Necesidades', (company.detectedNeeds || []).join(' · '))}
${row('Crecimiento', (company.growthSignals || []).join(' · '))}
${row('Venta cerrada', sales.length ? `${sales.length} ops · ${totals.movil} móvil · ${totals.fibra} fibra · SNAV ${fmtEur(totals.snav)} · margen ${fmtEur(totals.margen)}` : '')}
${row('Pipeline', lead ? `${lead.estado} · ${lead.next_action || '—'} ${fmtDate(lead.next_action_date) || ''}` : '')}
</table>

<h2>3. Relación y actividad</h2>
<table>
${row('Contacto ppal.', contactoPrincipal ? `${contactoPrincipal.name || '—'} · ${contactoPrincipal.role || '—'}${contactoPrincipal.phone ? ` · ${contactoPrincipal.phone}` : ''}` : '')}
${row('Decisores', contactos.map((c: any) => `${c.name || '—'} (${c.role || '—'})`).join(' · '))}
${row('Última actividad', lastActivity ? `${fmtDate(lastActivity.activity_date)} · ${typeLabel(lastActivity.activity_type)} · ${lastActivity.summary}` : fmtDate(ultimoContacto) || '')}
</table>
${recent.length
    ? recent.map((a) => `<div class="act"><div class="d">${esc(fmtDate(a.activity_date) || '')} · ${esc(typeLabel(a.activity_type))}</div>${esc(a.summary)}${a.outcome ? `<div style="font-size:11px;color:var(--muted-text-accessible)">Resultado: ${esc(a.outcome)}</div>` : ''}</div>`).join('')
    : '<p style="color:var(--muted-text-accessible)">Sin actividades registradas</p>'}

<h2>4. Próximos pasos</h2>
<table>
${row('Próximo contacto', fmtDate(proximaAccion) || '')}
${nextSteps.map((a) => row('Paso', `${a.next_step}${a.next_action_date ? ` · ${fmtDate(a.next_action_date)}` : ''}`)).join('')}
${row('Acción recom.', company.nextBestAction?.reason ? `${(company.nextBestAction.type || '').toUpperCase()} — ${company.nextBestAction.reason}` : '')}
</table>

<h2>5. Datos pendientes</h2>
${pendientes.length
    ? `<ul>${pendientes.map((p) => `<li class="warn">⚠ ${esc(p)}</li>`).join('')}</ul>`
    : '<p class="ok">✓ Ficha completa</p>'}
</body></html>`;

    // Vista imprimible limpia en iframe oculto: sin navegación ni botones
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) {
      document.body.removeChild(iframe);
      toast.error('No se pudo preparar la impresión');
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      window.removeEventListener('focus', onFocus);
    };
    const onFocus = () => setTimeout(cleanup, 500);
    window.addEventListener('focus', onFocus);
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        toast.error('No se pudo lanzar la impresión');
        cleanup();
      }
    }, 250);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Informe rápido del cliente"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 760,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${T.borderSubtle}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: T.textPrimary }}>
              📄 INFORME RÁPIDO DEL CLIENTE
            </div>
            <div style={{ ...mono, fontSize: 9, color: T.textMuted, marginTop: 4 }}>
              {company.name} · Generado el {generado}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'transparent',
              border: `1px solid ${T.borderSubtle}`,
              color: T.textTertiary,
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              ...mono,
              fontSize: 10,
            }}
          >
            ✕ CERRAR
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Section title="1 · RESUMEN EJECUTIVO">
            <Row label="EMPRESA" value={company.name} />
            <Row label="CIF" value={company.cif} />
            <Row label="UBICACIÓN" value={direccion || company.location} />
            <Row label="ESTADO" value={(estado || lead?.estado || 'lead').toUpperCase()} />
            <Row label="SCORE" value={String(company.opportunityScore)} />
            <Row label="DIGITALIZACIÓN" value={company.digitalizationLevel} />
            <Row label="EMPLEADOS" value={String(company.employees)} />
            <Row
              label="MULTISEDE"
              value={sedes.length > 1 || company.isMultiSite ? `Sí · ${sedes.length || 1} sedes` : 'No'}
            />
          </Section>

          <Section title="2 · SITUACIÓN COMERCIAL">
            <Row label="PRODUCTOS" value={(company.recommendedProducts || []).join(' · ')} />
            <Row label="NECESIDADES" value={(company.detectedNeeds || []).join(' · ')} />
            <Row label="CRECIMIENTO" value={(company.growthSignals || []).join(' · ')} />
            <Row
              label="VENTA CERRADA"
              value={
                sales.length
                  ? `${sales.length} ops · ${totals.movil} móvil · ${totals.fibra} fibra · SNAV ${fmtEur(totals.snav)} · margen ${fmtEur(totals.margen)}`
                  : null
              }
            />
            <Row
              label="PIPELINE"
              value={
                lead
                  ? `${lead.estado} · ${lead.next_action || '—'} ${fmtDate(lead.next_action_date) || ''}`
                  : null
              }
            />
          </Section>

          <Section title="3 · RELACIÓN Y ACTIVIDAD">
            <Row
              label="CONTACTO PPAL."
              value={
                contactoPrincipal
                  ? `${contactoPrincipal.name || '—'} · ${contactoPrincipal.role || '—'}${contactoPrincipal.phone ? ` · ${contactoPrincipal.phone}` : ''}`
                  : null
              }
            />
            <Row
              label="DECISORES"
              value={contactos.map((c: any) => `${c.name || '—'} (${c.role || '—'})`).join(' · ')}
            />
            <Row
              label="ÚLTIMA ACTIVIDAD"
              value={
                lastActivity
                  ? `${fmtDate(lastActivity.activity_date)} · ${typeLabel(lastActivity.activity_type)} · ${lastActivity.summary}`
                  : fmtDate(ultimoContacto)
              }
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {recent.length ? (
                recent.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      fontSize: 12,
                      color: T.textSecondary,
                      borderLeft: `2px solid ${T.border}`,
                      paddingLeft: 8,
                    }}
                  >
                    <span style={{ ...mono, fontSize: 9, color: T.textMuted }}>
                      {fmtDate(a.activity_date)} · {typeLabel(a.activity_type)}
                    </span>
                    <div>{a.summary}</div>
                    {a.outcome && (
                      <div style={{ fontSize: 11, color: T.textTertiary }}>Resultado: {a.outcome}</div>
                    )}
                  </div>
                ))
              ) : (
                <span style={{ fontSize: 12, color: T.textMuted }}>Sin actividades registradas</span>
              )}
            </div>
          </Section>

          <Section title="4 · PRÓXIMOS PASOS">
            <Row label="PRÓXIMO CONTACTO" value={fmtDate(proximaAccion)} />
            {nextSteps.length ? (
              nextSteps.map((a) => (
                <Row
                  key={a.id}
                  label="PASO REGISTRADO"
                  value={`${a.next_step}${a.next_action_date ? ` · ${fmtDate(a.next_action_date)}` : ''}`}
                />
              ))
            ) : (
              <Row label="PASOS" value={null} />
            )}
            <Row
              label="ACCIÓN RECOM."
              value={
                company.nextBestAction?.reason
                  ? `${(company.nextBestAction.type || '').toUpperCase()} — ${company.nextBestAction.reason}`
                  : null
              }
            />
          </Section>

          <Section title="5 · DATOS PENDIENTES">
            {pendientes.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {pendientes.map((p) => (
                  <span
                    key={p}
                    style={{
                      ...mono,
                      fontSize: 9,
                      letterSpacing: 1,
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: 'color-mix(in srgb, var(--alert-text) 9.4%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--alert-text) 25.1%, transparent)',
                      color: 'var(--alert-text)',
                    }}
                  >
                    ⚠ {p.toUpperCase()}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--success-text)' }}>✓ Ficha completa</span>
            )}
          </Section>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${T.borderSubtle}`,
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              background: T.cardAlt,
              border: `1px solid ${T.border}`,
              color: T.textTertiary,
              cursor: 'pointer',
              ...mono,
              fontSize: 10,
              letterSpacing: 1,
            }}
          >
            CERRAR
          </button>
          <button
            onClick={handleCopyMarkdown}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              background: T.cardAlt,
              border: `1px solid ${T.border}`,
              color: T.textSecondary,
              cursor: 'pointer',
              ...mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            📋 COPIAR MARKDOWN
          </button>
          <button
            onClick={handlePrint}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              background: T.cardAlt,
              border: `1px solid ${T.border}`,
              color: T.textSecondary,
              cursor: 'pointer',
              ...mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            🖨️ IMPRIMIR / GUARDAR PDF
          </button>
          <button
            onClick={handleCopy}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              background: `color-mix(in srgb, ${T.accent} 13.3%, transparent)`,
              border: `1px solid color-mix(in srgb, ${T.accent} 40.0%, transparent)`,
              color: T.accent,
              cursor: 'pointer',
              ...mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            📋 COPIAR RESUMEN
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
