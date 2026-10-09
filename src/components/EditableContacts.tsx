import { refreshCompanies } from '@/lib/queryClient';
import { useState } from 'react';
import { User, Plus, Trash2, Save, X, Linkedin, Phone, Mail, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KeyContact {
  name: string;
  role: string;
  mobile?: string;
  email?: string;
  linkedin_url?: string;
  principal?: boolean;
  // permitimos passthrough de campos extra (decisionPower, accessibility, etc.) sin perderlos
  [key: string]: any;
}

interface EditableContactsProps {
  companyId: string;
  contacts: KeyContact[];
  onUpdate: (contacts: KeyContact[]) => void;
  /** If true, stores in localStorage instead of Supabase (for CSV companies) */
  localStorageKey?: string;
}

const STORAGE_PREFIX = 'contacts_';

function loadLocalContacts(key: string): KeyContact[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocalContacts(key: string, contacts: KeyContact[]) {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(contacts));
}

const EditableContacts = ({ companyId, contacts, onUpdate, localStorageKey }: EditableContactsProps) => {
  const resolvedContacts = localStorageKey ? loadLocalContacts(localStorageKey) : contacts;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<KeyContact[]>(resolvedContacts);
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    setDraft([...draft, { name: '', role: '', mobile: '', email: '', linkedin_url: '' }]);
    if (!editing) setEditing(true);
  };

  const handleRemove = (index: number) => {
    setDraft(draft.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof KeyContact, value: string) => {
    const updated = [...draft];
    updated[index] = { ...updated[index], [field]: value };
    setDraft(updated);
  };

  const handleSave = async () => {
    const valid = draft.filter(c => c.name.trim() && c.role.trim());
    if (valid.length === 0 && draft.length > 0) {
      toast.error('Cada contacto necesita nombre y cargo');
      return;
    }

    const cleaned: KeyContact[] = valid.map(c => ({
      // Conservamos cualquier campo extra existente (decisionPower, accessibility, principal, etc.)
      ...c,
      name: c.name.trim(),
      role: c.role.trim(),
      mobile: c.mobile?.trim() || undefined,
      email: c.email?.trim() || undefined,
      linkedin_url: c.linkedin_url?.trim()
        ? (c.linkedin_url.trim().startsWith('http') ? c.linkedin_url.trim() : `https://${c.linkedin_url.trim()}`)
        : undefined,
    }));

    setSaving(true);
    try {
      if (localStorageKey) {
        saveLocalContacts(localStorageKey, cleaned);
      } else {
        const { error } = await supabase
          .from('companies')
          .update({ decision_makers: cleaned as any })
          .eq('id', companyId);
        if (error) throw error;
      }

      onUpdate(cleaned);
      setDraft(cleaned);
      setEditing(false);
      toast.success('Contactos guardados');
      refreshCompanies();
    } catch (err) {
      console.error('Error saving contacts:', err);
      toast.error('Error al guardar contactos');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrincipal = async (index: number) => {
    const base = localStorageKey ? loadLocalContacts(localStorageKey) : contacts;
    const next = base.map((c, i) => ({ ...c, principal: i === index }));
    try {
      if (localStorageKey) {
        saveLocalContacts(localStorageKey, next);
      } else {
        const { error } = await supabase
          .from('companies')
          .update({ decision_makers: next as any })
          .eq('id', companyId);
        if (error) throw error;
      }
      onUpdate(next);
      setDraft(next);
      toast.success('Contacto principal actualizado');
      refreshCompanies();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al marcar principal');
    }
  };

  const handleCancel = () => {
    setDraft(localStorageKey ? loadLocalContacts(localStorageKey) : contacts);
    setEditing(false);
  };

  const displayContacts = editing ? draft : (localStorageKey ? loadLocalContacts(localStorageKey) : contacts);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-primary" />
          Contactos Clave
        </h4>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={handleCancel} disabled={saving}>
                <X className="w-3 h-3 mr-1" /> Cancelar
              </Button>
              <Button variant="default" size="sm" className="h-6 px-2 text-[10px]" onClick={handleSave} disabled={saving}>
                <Save className="w-3 h-3 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setEditing(true)}>
              Editar
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {displayContacts.length === 0 && !editing && (
          <p className="text-xs text-muted-foreground italic">Sin contactos registrados</p>
        )}

        {displayContacts.map((contact, index) => (
          <div key={index} className="bg-muted/30 rounded-lg p-2.5 border border-border">
            {editing ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Input
                    value={contact.name}
                    onChange={(e) => handleChange(index, 'name', e.target.value)}
                    placeholder="Nombre *"
                    className="h-7 text-xs"
                  />
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 text-destructive" onClick={() => handleRemove(index)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <Input
                  value={contact.role}
                  onChange={(e) => handleChange(index, 'role', e.target.value)}
                  placeholder="Cargo *"
                  className="h-7 text-xs"
                />
                <Input
                  value={contact.mobile || ''}
                  onChange={(e) => handleChange(index, 'mobile', e.target.value)}
                  placeholder="Móvil (opcional)"
                  className="h-7 text-xs"
                  type="tel"
                />
                <Input
                  value={contact.email || ''}
                  onChange={(e) => handleChange(index, 'email', e.target.value)}
                  placeholder="Email (opcional)"
                  className="h-7 text-xs"
                  type="email"
                />
                <Input
                  value={contact.linkedin_url || ''}
                  onChange={(e) => handleChange(index, 'linkedin_url', e.target.value)}
                  placeholder="LinkedIn URL (opcional)"
                  className="h-7 text-xs"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <span className="truncate">{contact.name}</span>
                        {contact.principal && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-warning">
                            <Star className="w-2.5 h-2.5 fill-warning" /> Principal
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{contact.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleSetPrincipal(index)}
                      className={`p-1 rounded transition-colors ${contact.principal ? 'text-warning' : 'text-muted-foreground hover:text-warning hover:bg-warning/10'}`}
                      title={contact.principal ? 'Es el contacto principal' : 'Marcar como contacto principal'}
                    >
                      <Star className={`w-3.5 h-3.5 ${contact.principal ? 'fill-warning' : ''}`} />
                    </button>
                    {contact.linkedin_url && (
                      <button
                        onClick={() => {
                          const url = contact.linkedin_url!.startsWith('http') ? contact.linkedin_url! : `https://${contact.linkedin_url!}`;
                          window.open(url, '_blank');
                        }}
                        className="text-primary hover:text-primary/80 p-1"
                        title="Ver LinkedIn"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Additional fields displayed when they have data */}
                {(contact.mobile || contact.email) && (
                  <div className="flex items-center gap-3 pl-9 pt-0.5">
                    {contact.mobile && (
                      <a
                        href={`tel:${contact.mobile.replace(/\s/g, '')}`}
                        className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                      >
                        <Phone className="w-2.5 h-2.5" />
                        {contact.mobile}
                      </a>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                      >
                        <Mail className="w-2.5 h-2.5" />
                        {contact.email}
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={handleAdd}>
          <Plus className="w-3 h-3 mr-1" /> Añadir contacto
        </Button>
      )}
    </div>
  );
};

export default EditableContacts;
