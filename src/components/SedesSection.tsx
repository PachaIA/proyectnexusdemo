import { useState, useCallback, memo, useEffect } from 'react';
import { useSedes, type Sede, type SedeTipo } from '@/hooks/useSedes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Star, Loader2, MapPin, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface SedesSectionProps {
  companyId: string;
}

const TIPOS: SedeTipo[] = ['Oficina', 'Nave', 'Domicilio', 'Otro'];

interface FormState {
  tipo: SedeTipo;
  direccion: string;
  cp: string;
  localidad: string;
  provincia: string;
}

const emptyForm = (): FormState => ({
  tipo: 'Oficina',
  direccion: '',
  cp: '',
  localidad: '',
  provincia: '',
});

// IMPORTANT: Field defined OUTSIDE parent render to prevent input focus loss on each keystroke
interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}
const Field = memo(({ label, value, onChange, placeholder }: FieldProps) => (
  <label className="flex flex-col gap-1 text-xs">
    <span className="text-muted-foreground font-medium">{label}</span>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 text-sm"
    />
  </label>
));
Field.displayName = 'SedeField';

// Editor inline para una sede existente (definido fuera del render del padre)
interface SedeEditorProps {
  sede: Sede;
  saving: boolean;
  onCancel: () => void;
  onSave: (patch: FormState) => void;
}
const SedeEditor = memo(({ sede, saving, onCancel, onSave }: SedeEditorProps) => {
  const [form, setForm] = useState<FormState>({
    tipo: sede.tipo,
    direccion: sede.direccion || '',
    cp: sede.cp || '',
    localidad: sede.localidad || '',
    provincia: sede.provincia || '',
  });

  useEffect(() => {
    setForm({
      tipo: sede.tipo,
      direccion: sede.direccion || '',
      cp: sede.cp || '',
      localidad: sede.localidad || '',
      provincia: sede.provincia || '',
    });
  }, [sede.id]);

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  }, []);

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground font-medium">Tipo</span>
        <Select value={form.tipo} onValueChange={(v) => set('tipo', v as SedeTipo)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <Field
        label="Dirección"
        value={form.direccion}
        onChange={(v) => set('direccion', v)}
        placeholder="Calle, número…"
      />
      <div className="grid grid-cols-3 gap-2">
        <Field label="CP" value={form.cp} onChange={(v) => set('cp', v)} placeholder="29001" />
        <Field
          label="Localidad"
          value={form.localidad}
          onChange={(v) => set('localidad', v)}
          placeholder="Málaga"
        />
        <Field
          label="Provincia"
          value={form.provincia}
          onChange={(v) => set('provincia', v)}
          placeholder="Málaga"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(form)} disabled={saving} className="flex-1">
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 mr-1" />
          )}
          Guardar cambios
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          <X className="w-3.5 h-3.5 mr-1" /> Cancelar
        </Button>
      </div>
    </div>
  );
});
SedeEditor.displayName = 'SedeEditor';

interface SedeRowProps {
  sede: Sede;
  onDelete: (id: string) => void;
  onSetPrincipal: (id: string) => void;
  onEdit: (id: string) => void;
}
const SedeRow = memo(({ sede, onDelete, onSetPrincipal, onEdit }: SedeRowProps) => {
  const linea2 = [sede.cp, sede.localidad, sede.provincia].filter(Boolean).join(' · ');
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-muted/30 text-xs">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium text-[10px] uppercase">
            <MapPin className="w-3 h-3" />
            {sede.tipo}
          </span>
          {sede.principal && (
            <span className="inline-flex items-center gap-1 text-warning text-[10px] font-semibold uppercase">
              <Star className="w-3 h-3 fill-warning" /> Principal
            </span>
          )}
        </div>
        <div className="mt-1 text-foreground truncate">{sede.direccion || '—'}</div>
        {linea2 && <div className="text-[11px] text-muted-foreground">{linea2}</div>}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onEdit(sede.id)}
          className="h-7 px-2 text-[11px]"
          title="Editar sede"
        >
          <Pencil className="w-3.5 h-3.5 mr-1" />
          Editar
        </Button>
        {!sede.principal && (
          <button
            onClick={() => onSetPrincipal(sede.id)}
            className="p-1.5 rounded hover:bg-warning/10 text-muted-foreground hover:text-warning transition-colors"
            title="Marcar como principal"
          >
            <Star className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(sede.id)}
          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Eliminar sede"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});
SedeRow.displayName = 'SedeRow';

export const SedesSection = ({ companyId }: SedesSectionProps) => {
  const { sedes, isLoading, createSede, updateSede, deleteSede, setPrincipal } = useSedes(companyId);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  }, []);

  const handleSubmit = async () => {
    if (!form.direccion.trim()) {
      toast.error('Introduce una dirección');
      return;
    }
    setSaving(true);
    try {
      await createSede({
        company_id: companyId,
        tipo: form.tipo,
        direccion: form.direccion.trim(),
        cp: form.cp.trim() || null,
        localidad: form.localidad.trim() || null,
        provincia: form.provincia.trim() || null,
        lat: 0,
        lng: 0,
        principal: sedes.length === 0,
      });
      toast.success('Sede añadida');
      setForm(emptyForm());
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('¿Eliminar esta sede?')) return;
      try {
        await deleteSede(id);
        toast.success('Sede eliminada');
      } catch (e: any) {
        toast.error(e.message || 'Error al eliminar');
      }
    },
    [deleteSede],
  );

  const handleSetPrincipal = useCallback(
    async (id: string) => {
      try {
        await setPrincipal(id);
        toast.success('Sede principal actualizada');
      } catch (e: any) {
        toast.error(e.message || 'Error al actualizar');
      }
    },
    [setPrincipal],
  );

  const handleEdit = useCallback((id: string) => {
    setEditingId(id);
  }, []);

  const handleSaveEdit = useCallback(
    async (patch: FormState) => {
      if (!editingId) return;
      if (!patch.direccion.trim()) {
        toast.error('Introduce una dirección');
        return;
      }
      setSavingEdit(true);
      try {
        await updateSede({
          id: editingId,
          patch: {
            tipo: patch.tipo,
            direccion: patch.direccion.trim(),
            cp: patch.cp.trim() || null,
            localidad: patch.localidad.trim() || null,
            provincia: patch.provincia.trim() || null,
          },
        });
        toast.success('Sede actualizada');
        setEditingId(null);
      } catch (e: any) {
        toast.error(e.message || 'Error al actualizar');
      } finally {
        setSavingEdit(false);
      }
    },
    [editingId, updateSede],
  );

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Multisede / Sedes {sedes.length > 0 && <span className="text-foreground">({sedes.length})</span>}
          </h3>
        </div>
        <Button
          size="sm"
          variant={showForm ? 'ghost' : 'outline'}
          onClick={() => setShowForm((v) => !v)}
          className="h-7 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          {showForm ? 'Cerrar' : 'Añadir sede'}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 mb-3 space-y-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground font-medium">Tipo</span>
            <Select value={form.tipo} onValueChange={(v) => set('tipo', v as SedeTipo)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <Field
            label="Dirección"
            value={form.direccion}
            onChange={(v) => set('direccion', v)}
            placeholder="Calle, número…"
          />
          <div className="grid grid-cols-3 gap-2">
            <Field label="CP" value={form.cp} onChange={(v) => set('cp', v)} placeholder="29001" />
            <Field
              label="Localidad"
              value={form.localidad}
              onChange={(v) => set('localidad', v)}
              placeholder="Málaga"
            />
            <Field
              label="Provincia"
              value={form.provincia}
              onChange={(v) => set('provincia', v)}
              placeholder="Málaga"
            />
          </div>
          <Button onClick={handleSubmit} disabled={saving} size="sm" className="w-full">
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5 mr-1" />
            )}
            Guardar sede
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-3 text-center">Cargando sedes…</p>
      ) : sedes.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">Sin sedes registradas</p>
      ) : (
        <div className="space-y-1.5">
          {sedes.map((s) =>
            editingId === s.id ? (
              <SedeEditor
                key={s.id}
                sede={s}
                saving={savingEdit}
                onCancel={() => setEditingId(null)}
                onSave={handleSaveEdit}
              />
            ) : (
              <SedeRow
                key={s.id}
                sede={s}
                onDelete={handleDelete}
                onSetPrincipal={handleSetPrincipal}
                onEdit={handleEdit}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
};
