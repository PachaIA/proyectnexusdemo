import { fmtEur } from '@/hooks/useOpportunityLines';
import { Money } from '@/components/Money';
import { useState, useCallback, memo } from 'react';
import { useSales, type Sale } from '@/hooks/useSales';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SalesSectionProps {
  companyId: string;
}

interface FormState {
  fecha: string;
  lineas_movil: string;
  lineas_fibra: string;
  snav: string;
  margen: string;
  producto: string;
  producto_estrategico: boolean;
}

const emptyForm = (): FormState => ({
  fecha: new Date().toISOString().slice(0, 10),
  lineas_movil: '',
  lineas_fibra: '',
  snav: '',
  margen: '',
  producto: '',
  producto_estrategico: false,
});

// IMPORTANT: defined OUTSIDE parent render so inputs don't lose focus on each keystroke
interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}
const Field = memo(({ label, value, onChange, type = 'text', placeholder }: FieldProps) => (
  <label className="flex flex-col gap-1 text-xs">
    <span className="text-muted-foreground font-medium">{label}</span>
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 text-sm"
    />
  </label>
));
Field.displayName = 'SalesField';

interface SaleRowProps {
  sale: Sale;
  onDelete: (id: string) => void;
}
const SaleRow = memo(({ sale, onDelete }: SaleRowProps) => {
  const lineas = (sale.lineas_movil || 0) + (sale.lineas_fibra || 0);
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30 text-xs">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-muted-foreground">{sale.fecha}</span>
          {sale.producto_estrategico && (
            <Star className="w-3 h-3 text-warning fill-warning" />
          )}
          {sale.producto && <span className="text-foreground truncate">{sale.producto}</span>}
        </div>
        <div className="flex gap-3 mt-1 text-[11px] text-muted-foreground">
          <span>📱{sale.lineas_movil} 🌐{sale.lineas_fibra} ({lineas})</span>
          <span>SNAV <Money>{fmtEur(Number(sale.snav))}</Money></span>
          <span>Margen <Money>{fmtEur(Number(sale.margen))}</Money></span>
        </div>
      </div>
      <button
        onClick={() => onDelete(sale.id)}
        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        title="Eliminar venta"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});
SaleRow.displayName = 'SaleRow';

export const SalesSection = ({ companyId }: SalesSectionProps) => {
  const { sales, isLoading, createSale, deleteSale } = useSales(companyId);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  }, []);

  const handleSubmit = async () => {
    const lm = parseInt(form.lineas_movil) || 0;
    const lf = parseInt(form.lineas_fibra) || 0;
    const snav = parseFloat(form.snav) || 0;
    const margen = parseFloat(form.margen) || 0;
    if (lm + lf === 0 && snav === 0 && margen === 0) {
      toast.error('Introduce al menos líneas, SNAV o margen');
      return;
    }
    setSaving(true);
    try {
      await createSale({
        company_id: companyId,
        fecha: form.fecha,
        lineas_movil: lm,
        lineas_fibra: lf,
        snav,
        margen,
        producto: form.producto.trim() || null,
        producto_estrategico: form.producto_estrategico,
        notas: null,
      });
      toast.success('Venta registrada');
      setForm(emptyForm());
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    try {
      await deleteSale(id);
      toast.success('Venta eliminada');
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
    }
  }, [deleteSale]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Ventas cerradas {sales.length > 0 && <span className="text-foreground">({sales.length})</span>}
        </h3>
        <Button
          size="sm"
          variant={showForm ? 'ghost' : 'outline'}
          onClick={() => setShowForm((v) => !v)}
          className="h-7 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          {showForm ? 'Cerrar' : 'Registrar venta'}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Fecha" type="date" value={form.fecha} onChange={(v) => set('fecha', v)} />
            <Field label="Producto" value={form.producto} onChange={(v) => set('producto', v)} placeholder="Ej. Fibra 1Gb" />
            <Field label="Líneas móvil" type="number" value={form.lineas_movil} onChange={(v) => set('lineas_movil', v)} placeholder="0" />
            <Field label="Líneas fibra" type="number" value={form.lineas_fibra} onChange={(v) => set('lineas_fibra', v)} placeholder="0" />
            <Field label="SNAV (€)" type="number" value={form.snav} onChange={(v) => set('snav', v)} placeholder="0" />
            <Field label="Margen (€)" type="number" value={form.margen} onChange={(v) => set('margen', v)} placeholder="0" />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.producto_estrategico}
              onChange={(e) => set('producto_estrategico', e.target.checked)}
              className="rounded border-border"
            />
            <Star className="w-3.5 h-3.5 text-warning" />
            <span className="text-foreground">Producto estratégico</span>
          </label>
          <Button onClick={handleSubmit} disabled={saving} size="sm" className="w-full">
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            Guardar venta
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-3 text-center">Cargando ventas…</p>
      ) : sales.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">Sin ventas registradas</p>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {sales.map((s) => (
            <SaleRow key={s.id} sale={s} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
};
