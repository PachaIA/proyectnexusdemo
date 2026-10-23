import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCompanies } from '@/hooks/useCompanies';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/data/companies';
import { Button } from '@/components/ui/button';
import { Archive, ChevronDown, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { getEffectiveUser } from '@/lib/openUser';
import { refreshLeads } from '@/lib/queryClient';

interface ArchivoTabProps {
  onCompanySelect: (company: Company) => void;
}

export const ArchivoTab = (_props: ArchivoTabProps) => {
  const { companies, refetch } = useCompanies();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Company | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: deleted = [] } = useQuery({
    queryKey: ['deleted-companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('deleted_companies').select('*').order('deleted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const archived = useMemo(() =>
    companies.filter(c => c.archivedAt).filter(c =>
      !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.cif && c.cif.toLowerCase().includes(search.toLowerCase()))
    ),
    [companies, search]
  );

  const handleRestore = async (companyId: string) => {
    setRestoring(companyId);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ archived_at: null, archive_reason: null })
        .eq('id', companyId);
      if (error) throw error;
      const { data: { user } } = await getEffectiveUser();
      if (user) {
        await supabase.from('company_activities').insert({ company_id: companyId, user_id: user.id, activity_type: 'nota', summary: 'Restaurado' });
      }
      await refetch();
      toast.success('Empresa restaurada al flujo activo');
    } catch {
      toast.error('Error al restaurar');
    }
    setRestoring(null);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    if (!deleteReason.trim()) { setDeleteError('Escribe el motivo de la eliminación'); return; }
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_company_permanently', { _company_id: toDelete.id, _reason: deleteReason.trim() });
      if (error) throw error;
      await refetch();
      refreshLeads();
      qc.invalidateQueries({ queryKey: ['deleted-companies'] });
      toast.success(`${toDelete.name} eliminado definitivamente`);
      setToDelete(null);
    } catch (e: any) {
      toast.error(e?.message || 'Error al eliminar');
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Archivo ({archived.length})</h2>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o CIF..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {archived.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No hay empresas archivadas
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Empresa</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">CIF</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Motivo</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody>
              {archived.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <Link to={`/clientes/${encodeURIComponent(c.id)}`} className="text-foreground font-medium hover:text-primary transition-colors text-left">{c.name}</Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{c.cif || '—'}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.archiveReason?.startsWith('GG.CC.') ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                      {c.archiveReason || 'Sin motivo'}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {c.archivedAt ? new Date(c.archivedAt).toLocaleDateString('es-ES') : '—'}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button variant="outline" size="sm" onClick={() => handleRestore(c.id)} disabled={restoring === c.id} className="text-xs">
                      <RotateCcw className="w-3 h-3 mr-1" />Restaurar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setToDelete(c); setDeleteReason(''); setDeleteError(null); }} className="text-xs text-destructive ml-1">
                      <Trash2 className="w-3 h-3 mr-1" />Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-foreground py-2">
          <ChevronDown className="w-4 h-4" />Eliminados ({deleted.length})
        </CollapsibleTrigger>
        <CollapsibleContent>
          {deleted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No hay clientes eliminados</p>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Empresa</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">CIF</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Motivo</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {deleted.map(d => (
                    <tr key={d.id} className="border-b border-border last:border-0">
                      <td className="p-3 text-foreground">{d.name}</td>
                      <td className="p-3 text-muted-foreground">{d.cif || '—'}</td>
                      <td className="p-3 text-muted-foreground text-xs">{d.delete_reason}{d.archive_reason ? ` (archivado: ${d.archive_reason})` : ''}</td>
                      <td className="p-3 text-muted-foreground text-xs">{new Date(d.deleted_at).toLocaleDateString('es-ES')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={!!toDelete} onOpenChange={o => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar definitivamente {toDelete?.name}</DialogTitle>
            <DialogDescription>Se borrarán el cliente, sus oportunidades, actividades, sedes y ventas. Queda una traza en «Eliminados». No se puede deshacer.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Motivo de la eliminación *" value={deleteReason} maxLength={500} onChange={e => { setDeleteReason(e.target.value); setDeleteError(null); }} />
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting || !deleteReason.trim()}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
