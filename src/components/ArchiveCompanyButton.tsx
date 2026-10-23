import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getEffectiveUser } from '@/lib/openUser';
import { refreshCompanies, refreshLeads } from '@/lib/queryClient';
import { ARCHIVE_REASONS, buildArchiveReason, validateArchive } from '@/lib/archive';

export const ArchiveCompanyButton = ({ companyId, companyName }: { companyId: string; companyName: string }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    const err = validateArchive(motivo, nota);
    if (err) { setError(err); return; }
    setBusy(true);
    try {
      const reason = buildArchiveReason(motivo, nota);
      const now = new Date().toISOString();
      const { data: { user } } = await getEffectiveUser();
      if (!user) throw new Error('No autenticado');
      const { error: e1 } = await supabase.from('companies').update({ archived_at: now, archive_reason: reason }).eq('id', companyId);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('leads').update({ archived_at: now })
        .eq('company_id', companyId).is('archived_at', null).not('estado', 'in', '(ganada,perdida)');
      if (e2) throw e2;
      await supabase.from('company_activities').insert({ company_id: companyId, user_id: user.id, activity_type: 'nota', summary: `Archivado: ${reason}` });
      refreshCompanies(); refreshLeads();
      toast.success(`${companyName} archivado`);
      setOpen(false);
      navigate('/archivo');
    } catch (e: any) {
      toast.error(e?.message || 'Error al archivar');
    }
    setBusy(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { setOpen(true); setError(null); }}>
        <Archive className="mr-2 h-4 w-4" />Archivar cliente
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archivar {companyName}</DialogTitle>
            <DialogDescription>Saldrá de Clientes, Pipeline, Hoy y Mapa. Podrás restaurarlo desde Archivo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Motivo *</Label>
              <Select value={motivo} onValueChange={v => { setMotivo(v); setError(null); }}>
                <SelectTrigger><SelectValue placeholder="Elige un motivo" /></SelectTrigger>
                <SelectContent className="z-[100000]">
                  {ARCHIVE_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nota{motivo === 'Otro' ? ' *' : ''}</Label>
              <Textarea value={nota} onChange={e => { setNota(e.target.value); setError(null); }} maxLength={500} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirm} disabled={busy}>Archivar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
