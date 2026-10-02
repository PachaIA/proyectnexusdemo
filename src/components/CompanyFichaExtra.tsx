import { refreshCompanies } from '@/lib/queryClient';
import { useEffect, useState, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileSignature, Phone, Save, Loader2, Wifi, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  companyId: string;
  initial?: {
    representante_legal?: any;
    telefono_secundario?: string | null;
    tamanio_cliente?: string | null;
    comercial_wasp?: string | null;
    operador_actual?: string | null;
    operador_fijo?: string | null;
  };
}

interface FormState {
  rep_nombre: string;
  rep_apellidos: string;
  rep_dni: string;
  telefono_secundario: string;
  tamanio_cliente: string;
  comercial_wasp: string;
  operador_actual: string;
  operador_fijo: string;
}

const EMPTY: FormState = {
  rep_nombre: '', rep_apellidos: '', rep_dni: '',
  telefono_secundario: '', tamanio_cliente: '', comercial_wasp: '',
  operador_actual: '', operador_fijo: '',
};

// Defined OUTSIDE the render to prevent input remounting and focus loss
const FieldText = memo(function FieldText({
  id, label, value, onChange, placeholder,
}: {
  id: string; label: string; value: string;
  onChange: (k: keyof FormState, v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={`fext-${id}`} className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        id={`fext-${id}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(id as keyof FormState, e.target.value)}
        className="h-9 text-sm"
      />
    </div>
  );
});

export function CompanyFichaExtra({ companyId, initial }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Always fetch fresh values so panel reflects DB even if initial is stale.
      const { data } = await supabase
        .from('companies' as any)
        .select('representante_legal, telefono_secundario, tamanio_cliente, comercial_wasp, operador_actual, operador_fijo')
        .eq('id', companyId)
        .maybeSingle();
      if (cancelled) return;
      const row: any = data || initial || {};
      const rep = row.representante_legal && typeof row.representante_legal === 'object' ? row.representante_legal : {};
      setForm({
        rep_nombre: rep.nombre || '',
        rep_apellidos: rep.apellidos || '',
        rep_dni: rep.dni || '',
        telefono_secundario: row.telefono_secundario || '',
        tamanio_cliente: row.tamanio_cliente || '',
        comercial_wasp: row.comercial_wasp || '',
        operador_actual: row.operador_actual || '',
        operador_fijo: row.operador_fijo || '',
      });
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const handleChange = useCallback((k: keyof FormState, v: string) => {
    setForm(prev => ({ ...prev, [k]: v }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        representante_legal: {
          nombre: form.rep_nombre.trim(),
          apellidos: form.rep_apellidos.trim(),
          dni: form.rep_dni.trim(),
        },
        telefono_secundario: form.telefono_secundario.trim() || null,
        tamanio_cliente: form.tamanio_cliente.trim() || null,
        comercial_wasp: form.comercial_wasp.trim() || null,
        operador_actual: form.operador_actual.trim() || null,
        operador_fijo: form.operador_fijo.trim() || null,
      };
      const { error } = await supabase.from('companies' as any).update(updates).eq('id', companyId);
      if (error) throw error;
      toast.success('Datos guardados');
      refreshCompanies();
    } catch (e: any) {
      console.error(e);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-3">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          <FileSignature className="w-3.5 h-3.5" />
          Datos fiscales / Representante
        </p>
        <div className="grid grid-cols-2 gap-2">
          <FieldText id="rep_nombre" label="Nombre" value={form.rep_nombre} onChange={handleChange} />
          <FieldText id="rep_apellidos" label="Apellidos" value={form.rep_apellidos} onChange={handleChange} />
        </div>
        <div className="mt-2">
          <FieldText id="rep_dni" label="DNI / NIE" value={form.rep_dni} onChange={handleChange} placeholder="00000000X" />
        </div>
      </div>

      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          <Phone className="w-3.5 h-3.5" />
          Contacto adicional
        </p>
        <FieldText id="telefono_secundario" label="2º Teléfono" value={form.telefono_secundario} onChange={handleChange} placeholder="+34 ..." />
      </div>

      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          <Smartphone className="w-3.5 h-3.5" />
          Operadores actuales
        </p>
        <div className="grid grid-cols-2 gap-2">
          <FieldText id="operador_actual" label="Operador móvil" value={form.operador_actual} onChange={handleChange} placeholder="Vodafone / Movistar / Orange" />
          <FieldText id="operador_fijo" label="Operador fijo" value={form.operador_fijo} onChange={handleChange} placeholder="MásMóvil / Jazztel / Digi" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FieldText id="tamanio_cliente" label="Tamaño cliente" value={form.tamanio_cliente} onChange={handleChange} placeholder="Pyme / Mediana / Gran cuenta" />
        <FieldText id="comercial_wasp" label="Comercial asignado" value={form.comercial_wasp} onChange={handleChange} />
      </div>

      <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Guardar datos
      </Button>
    </div>
  );
}

