import { refreshCompanies } from '@/lib/queryClient';
import { useState, useEffect, memo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Pencil, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyAddressEditorProps {
  companyId: string;
  initialAddress: string;
}

// Input definido FUERA del render del padre para conservar el foco
interface AddressInputProps {
  value: string;
  onChange: (v: string) => void;
}
const AddressInput = memo(({ value, onChange }: AddressInputProps) => (
  <Input
    autoFocus
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder="Calle, número, CP, localidad…"
    className="h-9 text-sm"
  />
));
AddressInput.displayName = 'CompanyAddressInput';

export const CompanyAddressEditor = ({ companyId, initialAddress }: CompanyAddressEditorProps) => {
  const [address, setAddress] = useState(initialAddress || '');
  const [draft, setDraft] = useState(initialAddress || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAddress(initialAddress || '');
    setDraft(initialAddress || '');
  }, [companyId, initialAddress]);

  const setDraftCb = useCallback((v: string) => setDraft(v), []);

  const handleSave = async () => {
    const next = draft.trim();
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('companies')
        .update({ address: next })
        .eq('id', companyId);
      if (error) throw error;
      setAddress(next);
      setEditing(false);
      toast.success('Dirección actualizada');
      refreshCompanies();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 text-primary mt-2 shrink-0" />
        <div className="flex-1 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Dirección principal
          </p>
          <AddressInput value={draft} onChange={setDraftCb} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs">
              {saving ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Check className="w-3 h-3 mr-1" />
              )}
              Guardar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(address);
                setEditing(false);
              }}
              disabled={saving}
              className="h-7 text-xs"
            >
              <X className="w-3 h-3 mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 group">
      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Dirección principal
        </p>
        <p className="text-sm text-foreground break-words">
          {address || <span className="text-muted-foreground italic">Sin dirección</span>}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setEditing(true)}
        className="h-8 px-2 text-xs shrink-0"
        title="Editar dirección"
      >
        <Pencil className="w-3.5 h-3.5 mr-1" />
        Editar
      </Button>
    </div>
  );
};
