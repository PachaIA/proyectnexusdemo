import { refreshCompanies } from '@/lib/queryClient';
import { useState, useEffect, useMemo, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Company } from '@/data/companies';
// CompanyAddressEditor is rendered by the parent (NexusDashboard header)
import { SedesSection } from '@/components/SedesSection';
import { getCurrentFiscalQuarterRange } from '@/lib/salesKpis';
import { fmtEur } from '@/hooks/useOpportunityLines';
import { Money } from '@/components/Money';

// ─── Inputs definidos FUERA del render para no perder foco ──────────────
const NumInput = memo(({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) => (
  <Input
    type="number"
    inputMode="numeric"
    autoFocus={autoFocus}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="h-9 text-base font-semibold tracking-tight bg-transparent border border-border/60 rounded-md px-2 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-0"
  />
));
NumInput.displayName = 'BriefNumInput';

const SelectInput = memo(({ value, onChange, options, autoFocus }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; autoFocus?: boolean }) => (
  <select
    autoFocus={autoFocus}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="h-9 text-sm font-semibold rounded-md bg-transparent border border-border/60 px-2 text-foreground outline-none focus:ring-1 focus:ring-primary/50"
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
));
SelectInput.displayName = 'BriefSelectInput';

// ─── Tile (Apple-style squircle inline-edit) ─────────────────────────────
interface TileProps {
  label: string;
  display: React.ReactNode;
  editing: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  accent?: boolean;
  children: React.ReactNode; // editor content
}
const Tile = ({ label, display, editing, onStartEdit, onCancel, onSave, saving, accent, children }: TileProps) => (
  <div
    onClick={() => { if (!editing) onStartEdit(); }}
    className={[
      'group relative rounded-xl transition-all duration-200',
      'backdrop-blur-xl border',
      editing ? 'p-3' : 'p-2.5',
      accent
        ? 'bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border-accent/25'
        : 'bg-card/40 border-border/50 hover:border-border',
      editing ? 'ring-2 ring-primary/40 bg-card/70' : 'cursor-pointer hover:bg-card/60',
    ].join(' ')}
  >
    <div className="flex items-center justify-between mb-1">
      <span className={`text-[9px] uppercase tracking-[0.14em] font-medium ${accent ? 'text-accent/80' : 'text-muted-foreground'}`}>
        {label}
      </span>
      {editing && (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={onSave} disabled={saving} className="h-6 w-6 grid place-items-center rounded-md bg-primary/15 hover:bg-primary/25 text-primary transition-colors">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onCancel} className="h-6 w-6 grid place-items-center rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
    {editing ? <div onClick={(e) => e.stopPropagation()}>{children}</div> : <div className="flex items-end leading-tight">{display}</div>}
  </div>
);

const BigNumber = ({ value, suffix }: { value: string | number; suffix?: string }) => (
  <div className="flex items-baseline gap-1">
    <span className="text-lg font-semibold tracking-tight text-foreground tabular-nums">{value}</span>
    {suffix && <span className="text-[10px] text-muted-foreground font-medium">{suffix}</span>}
  </div>
);

const Pill = ({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'on' | 'off' }) => (
  <span className={[
    'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
    tone === 'on' ? 'bg-success/15 text-success ring-1 ring-success/30' :
    tone === 'off' ? 'bg-muted/50 text-muted-foreground ring-1 ring-border' :
    'bg-foreground/10 text-foreground ring-1 ring-border',
  ].join(' ')}>{children}</span>
);

const digiLabel: Record<string, string> = { bajo: 'Baja', medio: 'Media', alto: 'Alta' };
const itcLabel: Record<string, string> = { baja: 'Baja', media: 'Media', alta: 'Alta' };

interface Props { company: Company }

export const BriefingEditableBlock = ({ company }: Props) => {
  const qc = useQueryClient();

  // Perfil
  const [employees, setEmployees] = useState<string>(String(company.employees ?? 0));
  const [digi, setDigi] = useState<string>(company.digitalizationLevel || 'medio');
  const [itc, setItc] = useState<string>(company.itComplexity || 'media');
  const [multi, setMulti] = useState<boolean>(!!company.isMultiSite);
  const [editField, setEditField] = useState<string | null>(null); // which tile is open
  const [savingField, setSavingField] = useState<string | null>(null);

  // Venta
  const [movilStr, setMovilStr] = useState<string>(String(company.lineasMovil ?? 0));
  const [fijoStr, setFijoStr] = useState<string>(String((company as any).lineasFijo ?? 0));
  const [fibrasStr, setFibrasStr] = useState<string>('0');
  const [snavStr, setSnavStr] = useState<string>('0');
  const [ssaa, setSsaa] = useState<boolean>(false);
  const [existingSaleId, setExistingSaleId] = useState<string | null>(null);

  useEffect(() => {
    setEmployees(String(company.employees ?? 0));
    setDigi(company.digitalizationLevel || 'medio');
    setItc(company.itComplexity || 'media');
    setMulti(!!company.isMultiSite);
    setMovilStr(String(company.lineasMovil ?? 0));
    setFijoStr(String((company as any).lineasFijo ?? 0));
    setEditField(null);
  }, [company.id, company.employees, company.digitalizationLevel, company.itComplexity, company.isMultiSite, company.lineasMovil, (company as any).lineasFijo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { startStr, endStr } = getCurrentFiscalQuarterRange();
      const { data, error } = await (supabase as any)
        .from('sales').select('*').eq('company_id', company.id)
        .gte('fecha', startStr).lt('fecha', endStr)
        .order('fecha', { ascending: false }).limit(1);
      if (cancelled || error) return;
      const sale = data?.[0];
      if (sale) {
        setExistingSaleId(sale.id);
        const totalVoz = Number(sale.lineas_movil || 0);
        const mv = Number(company.lineasMovil ?? 0);
        const fj = Number((company as any).lineasFijo ?? 0);
        if (mv + fj === totalVoz && totalVoz > 0) { setMovilStr(String(mv)); setFijoStr(String(fj)); }
        else { setMovilStr(String(totalVoz)); setFijoStr('0'); }
        setFibrasStr(String(Number(sale.lineas_fibra || 0)));
        setSnavStr(String(Number(sale.snav || 0)));
        setSsaa(!!sale.producto_estrategico);
      } else {
        setExistingSaleId(null);
        setFibrasStr('0'); setSnavStr('0'); setSsaa(false);
      }
    })();
    return () => { cancelled = true; };
  }, [company.id]);

  const totalLineas = useMemo(
    () => (parseInt(movilStr || '0', 10) || 0) + (parseInt(fijoStr || '0', 10) || 0),
    [movilStr, fijoStr]
  );
  const altas = totalLineas + (parseInt(fibrasStr || '0', 10) || 0);
  const snavNum = parseFloat(snavStr || '0') || 0;
  const rentEstim = altas > 0 ? (snavNum / altas) : 0;

  // ─── Save helpers ──────────────────────────────────────────────────────
  const saveProfileField = async (patch: Record<string, any>, fieldKey: string) => {
    setSavingField(fieldKey);
    try {
      const { error } = await (supabase as any).from('companies').update(patch).eq('id', company.id);
      if (error) throw error;
      toast.success('Guardado');
      refreshCompanies();
      setEditField(null);
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSavingField(null);
    }
  };

  const saveSale = async () => {
    const mv = parseInt(movilStr || '0', 10) || 0;
    const fj = parseInt(fijoStr || '0', 10) || 0;
    const fb = parseInt(fibrasStr || '0', 10) || 0;
    const snav = parseFloat(snavStr || '0') || 0;
    const total = mv + fj;
    setSavingField('sale');
    try {
      await (supabase as any).from('companies').update({ lineas_movil: mv, lineas_fijo: fj }).eq('id', company.id);
      const today = new Date().toISOString().slice(0, 10);
      const payload = {
        company_id: company.id, fecha: today,
        lineas_movil: total, lineas_fibra: fb, snav, margen: snav,
        producto_estrategico: ssaa, producto: ssaa ? 'Servicios Avanzados' : null,
        notas: 'Venta cerrada (briefing)',
      };
      if (existingSaleId) {
        const { error } = await (supabase as any).from('sales').update(payload).eq('id', existingSaleId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any).from('sales').insert(payload).select().single();
        if (error) throw error;
        setExistingSaleId(data.id);
      }
      toast.success('Venta guardada · KPIs actualizados');
      qc.invalidateQueries({ queryKey: ['sales'] });
      refreshCompanies();
      setEditField(null);
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar venta');
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Multisede */}
      <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl p-4">
        <SedesSection companyId={company.id} />
      </div>


      {/* ─── PERFIL DEL CLIENTE (neutro) ──────────────────────────── */}
      <section>
        <header className="flex items-baseline justify-between mb-3 px-1">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Perfil del cliente</h3>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Datos de cualificación</span>
        </header>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile
            label="Empleados"
            editing={editField === 'employees'}
            onStartEdit={() => setEditField('employees')}
            onCancel={() => { setEmployees(String(company.employees ?? 0)); setEditField(null); }}
            onSave={() => saveProfileField({ employees: parseInt(employees || '0', 10) || 0 }, 'employees')}
            saving={savingField === 'employees'}
            display={<BigNumber value={company.employees ?? 0} />}
          >
            <NumInput value={employees} onChange={setEmployees} autoFocus />
          </Tile>

          <Tile
            label="Digitalización"
            editing={editField === 'digi'}
            onStartEdit={() => setEditField('digi')}
            onCancel={() => { setDigi(company.digitalizationLevel || 'medio'); setEditField(null); }}
            onSave={() => saveProfileField({ digitalization_level: digi }, 'digi')}
            saving={savingField === 'digi'}
            display={<Pill>{digiLabel[company.digitalizationLevel || 'medio']}</Pill>}
          >
            <SelectInput value={digi} onChange={setDigi} autoFocus options={[
              { value: 'bajo', label: 'Baja' }, { value: 'medio', label: 'Media' }, { value: 'alto', label: 'Alta' },
            ]} />
          </Tile>

          <Tile
            label="Complejidad IT"
            editing={editField === 'itc'}
            onStartEdit={() => setEditField('itc')}
            onCancel={() => { setItc(company.itComplexity || 'media'); setEditField(null); }}
            onSave={() => saveProfileField({ it_complexity: itc }, 'itc')}
            saving={savingField === 'itc'}
            display={<Pill>{itcLabel[company.itComplexity || 'media']}</Pill>}
          >
            <SelectInput value={itc} onChange={setItc} autoFocus options={[
              { value: 'baja', label: 'Baja' }, { value: 'media', label: 'Media' }, { value: 'alta', label: 'Alta' },
            ]} />
          </Tile>

          <Tile
            label="Multi-sede"
            editing={editField === 'multi'}
            onStartEdit={() => setEditField('multi')}
            onCancel={() => { setMulti(!!company.isMultiSite); setEditField(null); }}
            onSave={() => saveProfileField({ is_multi_site: multi }, 'multi')}
            saving={savingField === 'multi'}
            display={<Pill tone={company.isMultiSite ? 'on' : 'off'}>{company.isMultiSite ? 'SÍ' : 'NO'}</Pill>}
          >
            <div className="flex gap-2 pt-1">
              <button onClick={() => setMulti(true)} className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors ${multi ? 'bg-success/20 text-success ring-1 ring-success/40' : 'bg-muted/40 text-muted-foreground'}`}>SÍ</button>
              <button onClick={() => setMulti(false)} className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors ${!multi ? 'bg-foreground/10 text-foreground ring-1 ring-border' : 'bg-muted/40 text-muted-foreground'}`}>NO</button>
            </div>
          </Tile>
        </div>
      </section>

      {/* ─── VENTA CERRADA (acento + glow) ────────────────────────── */}
      <section className="relative">
        {/* halo glow */}
        <div aria-hidden className="pointer-events-none absolute -inset-2 rounded-3xl bg-accent/5 blur-2xl" />
        <div className="relative rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/[0.08] via-card/40 to-transparent backdrop-blur-xl p-5">
          <header className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <div>
                <h3 className="text-sm font-semibold text-foreground tracking-tight">Venta cerrada</h3>
                <p className="text-[10px] uppercase tracking-[0.14em] text-accent/80">Trimestre actual · alimenta KPIs</p>
              </div>
            </div>
            <Button size="sm" onClick={saveSale} disabled={savingField === 'sale'} className="h-8 px-3 text-xs bg-accent text-accent-foreground hover:bg-accent/90">
              {savingField === 'sale' ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Check className="w-3 h-3 mr-1.5" />}
              {existingSaleId ? 'Actualizar' : 'Guardar'}
            </Button>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Líneas (móvil + fijo) */}
            <Tile
              label="Líneas voz"
              accent
              editing={editField === 'lineas'}
              onStartEdit={() => setEditField('lineas')}
              onCancel={() => setEditField(null)}
              onSave={() => setEditField(null)}
              display={
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-semibold tabular-nums text-foreground">{totalLineas}</span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                    M{movilStr}·F{fijoStr}
                  </span>
                </div>
              }
            >
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Móvil</div>
                  <NumInput value={movilStr} onChange={setMovilStr} autoFocus />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Fijo</div>
                  <NumInput value={fijoStr} onChange={setFijoStr} />
                </div>
              </div>
            </Tile>

            <Tile
              label="Fibras"
              accent
              editing={editField === 'fibras'}
              onStartEdit={() => setEditField('fibras')}
              onCancel={() => setEditField(null)}
              onSave={() => setEditField(null)}
              display={<BigNumber value={fibrasStr || '0'} />}
            >
              <NumInput value={fibrasStr} onChange={setFibrasStr} autoFocus />
            </Tile>

            <Tile
              label="SNAV"
              accent
              editing={editField === 'snav'}
              onStartEdit={() => setEditField('snav')}
              onCancel={() => setEditField(null)}
              onSave={() => setEditField(null)}
              display={<span className="text-lg font-semibold tabular-nums"><Money>{fmtEur(snavNum)}</Money></span>}
            >
              <NumInput value={snavStr} onChange={setSnavStr} autoFocus />
            </Tile>

            <Tile
              label="SSAA"
              accent
              editing={editField === 'ssaa'}
              onStartEdit={() => setEditField('ssaa')}
              onCancel={() => setEditField(null)}
              onSave={() => setEditField(null)}
              display={<Pill tone={ssaa ? 'on' : 'off'}>{ssaa ? 'SÍ' : 'NO'}</Pill>}
            >
              <div className="flex gap-2 pt-1">
                <button onClick={() => setSsaa(true)} className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors ${ssaa ? 'bg-accent/20 text-accent ring-1 ring-accent/50' : 'bg-muted/40 text-muted-foreground'}`}>SÍ</button>
                <button onClick={() => setSsaa(false)} className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors ${!ssaa ? 'bg-foreground/10 text-foreground ring-1 ring-border' : 'bg-muted/40 text-muted-foreground'}`}>NO</button>
              </div>
            </Tile>
          </div>

          {/* Resumen */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 border-t border-accent/15">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Altas</span>
              <span className="text-lg font-semibold tabular-nums text-foreground">{altas}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Rentabilidad</span>
              <span className="text-lg font-semibold tabular-nums text-accent">
                <Money>{altas > 0 ? `${fmtEur(rentEstim)}/alta` : '—'}</Money>
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground ml-auto">Pulsa cualquier tarjeta para editar · Guarda con el botón</span>
          </div>
        </div>
      </section>
    </div>
  );
};
