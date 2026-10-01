import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
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

export default function Simulador() {
  const [sector, setSector] = useState<Sector>('servicios');
  const [empleados, setEmpleados] = useState(28);
  const [antiguedad, setAntiguedad] = useState(9);
  const [presenciaDigital, setPresenciaDigital] = useState<PresenciaDigital>('basic');
  const [crecimiento, setCrecimiento] = useState<Crecimiento>('stable');
  const [operadorActual, setOperadorActual] = useState<OperadorActual>('orange');
  const [reasonsOpen, setReasonsOpen] = useState(false);

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
                style={{
                  backgroundColor: bucketStyle.bg,
                  color: bucketStyle.fg,
                }}
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
                {result.reasons.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground bg-card border border-border rounded-md p-4">
                    {result.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Sin razones destacadas — perfil estándar.
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </section>
        </div>
      </div>
    </div>
  );
}
