import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Copy, Mail, Save, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  scoreNcs,
  recommendProducts,
  pitchFor,
  explainNcs,
  BUCKET_STYLE,
  SECTOR_LABELS,
  type Sector,
  type PresenciaDigital,
  type Crecimiento,
  type OperadorActual,
  type LeadInput,
} from '@/lib/ncsScoring';

const PRESENCIA_OPTIONS: { value: PresenciaDigital; label: string }[] = [
  { value: 'none', label: 'Ninguna o ficha Google' },
  { value: 'basic', label: 'Web corporativa básica' },
  { value: 'advanced', label: 'Avanzada (e-commerce, app)' },
];

const CRECIMIENTO_OPTIONS: { value: Crecimiento; label: string }[] = [
  { value: 'declining', label: 'En declive' },
  { value: 'stable', label: 'Estable' },
  { value: 'growing', label: 'En crecimiento' },
  { value: 'fast', label: 'Crecimiento rápido' },
];

const OPERADOR_OPTIONS: { value: OperadorActual; label: string }[] = [
  { value: 'movistar', label: 'Movistar' },
  { value: 'orange', label: 'Orange o MásMóvil' },
  { value: 'digi', label: 'Digi u OMV low-cost' },
  { value: 'none', label: 'Sin contrato B2B' },
];

const SECTOR_ORDER: Sector[] = [
  'hosteleria',
  'retail',
  'servicios',
  'industrial',
  'salud',
  'construccion',
];

const SAVED_KEY = 'nexus_simulaciones';

interface SavedSim {
  id: string;
  name: string;
  savedAt: string;
  lead: Required<Pick<LeadInput, 'sector' | 'empleados' | 'antiguedadAnios' | 'presenciaDigital' | 'crecimiento' | 'operadorActual'>>;
  score: number;
}

function loadSaved(): SavedSim[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
  } catch {
    return [];
  }
}

const fmtPts = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1).replace('.', ',')}`;

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function buildExportText(
  lead: LeadInput,
  pitch: string,
  products: { title: string; rationale: string }[],
  factors: ReturnType<typeof explainNcs>['factors'],
): string {
  const sectorLabel = SECTOR_LABELS[lead.sector];
  const top = factors
    .filter((f) => f.key !== 'base' && f.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);
  const argText: Record<string, string> = {
    sector: `el sector de ${lowerFirst(sectorLabel)} tiene una necesidad real de conectividad fiable y ciberseguridad`,
    empleados: `con ${lead.empleados} empleados, la empresa tiene el tamaño en el que consolidar proveedor genera un ahorro operativo tangible`,
    antiguedad: `sus ${lead.antiguedadAnios} años de trayectoria indican una estructura asentada y lista para renovar su infraestructura`,
    presencia: 'su presencia digital revela una empresa que depende de estar conectada y protegida',
    crecimiento: 'las señales de crecimiento anticipan más puestos, más líneas y necesidad de escalar sin fricción',
    operador: 'su situación con el operador actual abre una ventana clara para mejorar condiciones y servicio',
    engagement: 'su actividad en Google muestra un negocio con clientes activos que no puede permitirse cortes',
  };
  const ordinals = ['En primer lugar', 'En segundo lugar', 'Por último'];
  const args = top.map((f, i) => `${ordinals[i]}, ${argText[f.key]}.`).join(' ');
  const mix = products.map((p) => p.title);
  const mixText = mix.length > 1 ? `${mix.slice(0, -1).join(', ')} y ${mix[mix.length - 1]}` : mix[0];

  return [
    `Planteamiento comercial — ${sectorLabel}, ${lead.empleados} empleados`,
    '',
    pitch,
    '',
    `Propuesta recomendada: una solución integrada que combina ${mixText}. ${products[0]?.rationale ?? ''}`,
    '',
    `Por qué ahora: ${args || 'el perfil encaja con nuestra propuesta de valor estándar.'}`,
    '',
    'Alejandro González',
    'Consultor Estratégico Senior · Grupo Enertel',
  ].join('\n');
}

export default function Simulador() {
  const [sector, setSector] = useState<Sector>('servicios');
  const [empleados, setEmpleados] = useState(28);
  const [antiguedad, setAntiguedad] = useState(9);
  const [presenciaDigital, setPresenciaDigital] = useState<PresenciaDigital>('basic');
  const [crecimiento, setCrecimiento] = useState<Crecimiento>('stable');
  const [operadorActual, setOperadorActual] = useState<OperadorActual>('orange');
  const [reasonsOpen, setReasonsOpen] = useState(false);
  const [simName, setSimName] = useState('');
  const [saved, setSaved] = useState<SavedSim[]>(() => loadSaved());

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  }, [saved]);

  const lead: LeadInput = useMemo(
    () => ({
      sector,
      empleados,
      antiguedadAnios: antiguedad,
      presenciaDigital,
      crecimiento,
      operadorActual,
    }),
    [sector, empleados, antiguedad, presenciaDigital, crecimiento, operadorActual],
  );

  const result = useMemo(() => scoreNcs(lead), [lead]);
  const products = useMemo(() => recommendProducts(lead, result), [lead, result]);
  const pitch = useMemo(() => pitchFor(lead, result), [lead, result]);
  const bucketStyle = BUCKET_STYLE[result.bucket];
  const breakdown = useMemo(() => explainNcs(lead), [lead]);
  const exportText = useMemo(
    () => buildExportText(lead, pitch, products, breakdown.factors),
    [lead, pitch, products, breakdown],
  );
  const mailSubject = `Propuesta de conectividad y seguridad para su empresa (${SECTOR_LABELS[sector]})`;
  const mailHref = `mailto:?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(exportText)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      toast.success('Texto copiado al portapapeles');
    } catch {
      // Reserva para navegadores sin permiso de portapapeles
      const ta = document.createElement('textarea');
      ta.value = exportText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) toast.success('Texto copiado al portapapeles');
      else toast.error('No se pudo copiar el texto');
    }
  };

  const handleSave = () => {
    const now = new Date();
    const name =
      simName.trim() ||
      `${SECTOR_LABELS[sector]} · ${empleados} emp. · ${now.toLocaleDateString('es-ES')}`;
    const sim: SavedSim = {
      id: crypto.randomUUID(),
      name,
      savedAt: now.toISOString(),
      lead: { sector, empleados, antiguedadAnios: antiguedad, presenciaDigital, crecimiento, operadorActual },
      score: result.score,
    };
    setSaved((prev) => [sim, ...prev]);
    setSimName('');
    toast.success(`Simulación «${name}» guardada`);
  };

  const handleRestore = (sim: SavedSim) => {
    setSector(sim.lead.sector);
    setEmpleados(sim.lead.empleados);
    setAntiguedad(sim.lead.antiguedadAnios);
    setPresenciaDigital(sim.lead.presenciaDigital);
    setCrecimiento(sim.lead.crecimiento);
    setOperadorActual(sim.lead.operadorActual);
    toast.success(`Simulación «${sim.name}» restaurada`);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-muted/30">
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground">Simulador NCS</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ajusta los parámetros y valida en tiempo real la prioridad comercial del lead.
            </p>
          </div>

          {/* Two columns: controls + result */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: controls */}
            <Card className="p-6 space-y-6">
              <div className="space-y-2">
                <Label>Sector</Label>
                <Select value={sector} onValueChange={(v) => setSector(v as Sector)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {SECTOR_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SECTOR_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Empleados</Label>
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {empleados}
                  </span>
                </div>
                <Slider
                  min={5}
                  max={99}
                  step={1}
                  value={[empleados]}
                  onValueChange={(v) => setEmpleados(v[0])}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Antigüedad (años)</Label>
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {antiguedad}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={30}
                  step={1}
                  value={[antiguedad]}
                  onValueChange={(v) => setAntiguedad(v[0])}
                />
              </div>

              <div className="space-y-2">
                <Label>Presencia digital</Label>
                <Select
                  value={presenciaDigital}
                  onValueChange={(v) => setPresenciaDigital(v as PresenciaDigital)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {PRESENCIA_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Señal de crecimiento</Label>
                <Select
                  value={crecimiento}
                  onValueChange={(v) => setCrecimiento(v as Crecimiento)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {CRECIMIENTO_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Operador actual</Label>
                <Select
                  value={operadorActual}
                  onValueChange={(v) => setOperadorActual(v as OperadorActual)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {OPERADOR_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Right: result */}
            <Card className="bg-muted p-10 flex flex-col items-center justify-center text-center">
              <span className="text-xs uppercase tracking-[2px] text-muted-foreground">
                Score NCS
              </span>
              <div className="text-5xl font-medium text-primary mt-3 tabular-nums">
                {result.score}
              </div>
              <div
                className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                data-score-bucket={result.bucket}
              >
                {bucketStyle.label}
              </div>
              <p className="text-xs text-muted-foreground mt-3">{result.priority}</p>
            </Card>
          </div>

          {/* Product mix */}
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
              Mix de producto recomendado
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {products.map((p) => (
                <Card key={p.title} className="p-4">
                  <p className="font-medium text-foreground">{p.title}</p>
                  <p className="text-muted-foreground text-sm mt-1">{p.rationale}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* Pitch */}
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
              Gancho comercial
            </h2>
            <div className="bg-secondary text-secondary-foreground rounded-md p-5 text-sm leading-relaxed">
              {pitch}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" /> Copiar
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={mailHref}>
                  <Mail className="w-4 h-4 mr-2" /> Abrir en email
                </a>
              </Button>
            </div>
          </section>

          {/* Reasons */}
          <section className="mt-8">
            <Collapsible open={reasonsOpen} onOpenChange={setReasonsOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider hover:text-primary transition-colors">
                Por qué este score
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    reasonsOpen ? 'rotate-180' : ''
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="bg-card border border-border rounded-md p-4 space-y-3">
                  {breakdown.factors.map((f) => {
                    const pct = Math.min(100, (Math.abs(f.points) / 28) * 50);
                    const positive = f.points >= 0;
                    return (
                      <div key={f.key} className="grid grid-cols-12 items-center gap-2 text-sm">
                        <div className="col-span-12 sm:col-span-4">
                          <p className="font-medium text-foreground">{f.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {f.detail} · peso {f.weight}
                          </p>
                        </div>
                        <div className="col-span-9 sm:col-span-6 relative h-3 bg-muted rounded">
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
                          <div
                            className={`absolute top-0 bottom-0 rounded ${positive ? 'bg-primary' : 'bg-destructive'}`}
                            style={positive ? { left: '50%', width: `${pct}%` } : { right: '50%', width: `${pct}%` }}
                          />
                        </div>
                        <div
                          className={`col-span-3 sm:col-span-2 text-right tabular-nums font-semibold ${
                            positive ? 'text-foreground' : 'text-destructive'
                          }`}
                        >
                          {fmtPts(f.points)} pts
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between border-t border-border pt-3 text-sm">
                    <span className="text-muted-foreground">
                      Total {breakdown.raw.toFixed(1).replace('.', ',')} → score {breakdown.score} (limitado a 0–100)
                    </span>
                  </div>
                  {result.reasons.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                      {result.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>

          {/* Saved simulations */}
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
              Simulaciones guardadas
            </h2>
            <div className="flex gap-2 mb-3">
              <Input
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                placeholder="Nombre (p. ej. Clínica Dental Teatinos)"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" /> Guardar simulación
              </Button>
            </div>
            {saved.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aún no hay simulaciones guardadas.</p>
            ) : (
              <ul className="divide-y divide-border border border-border rounded-md bg-card">
                {saved.map((sim) => (
                  <li key={sim.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="font-semibold tabular-nums text-primary w-8">{sim.score}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{sim.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sim.savedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })} ·{' '}
                        {SECTOR_LABELS[sim.lead.sector]} · {sim.lead.empleados} emp.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleRestore(sim)}>
                      <RotateCcw className="w-4 h-4 mr-1" /> Restaurar
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Eliminar simulación"
                      onClick={() => setSaved((prev) => prev.filter((x) => x.id !== sim.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
