import { useMemo, useState } from 'react';
import { useCompanies } from '@/hooks/useCompanies';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/data/companies';
import { Button } from '@/components/ui/button';
import { Archive, RotateCcw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ArchivoTabProps {
  onCompanySelect: (company: Company) => void;
}

export const ArchivoTab = ({ onCompanySelect }: ArchivoTabProps) => {
  const { companies, refetch } = useCompanies();
  const [search, setSearch] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);

  const archived = useMemo(() =>
    companies.filter(c => c.archivedAt).filter(c =>
      !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.cif && c.cif.toLowerCase().includes(search.toLowerCase()))
    ),
    [companies, search]
  );

  const handleRestore = async (companyId: string) => {
    setRestoring(companyId);
    try {
      const { error } = await (supabase as any)
        .from('companies')
        .update({ archived_at: null, archive_reason: null })
        .eq('id', companyId);
      if (error) throw error;
      await refetch();
      toast.success('Empresa restaurada al flujo activo');
    } catch {
      toast.error('Error al restaurar');
    }
    setRestoring(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
        <div className="rounded-xl border border-border bg-card overflow-hidden">
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
                    <button onClick={() => onCompanySelect(c)} className="text-foreground font-medium hover:text-primary transition-colors text-left">
                      {c.name}
                    </button>
                  </td>
                  <td className="p-3 text-muted-foreground">{c.cif || '—'}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.archiveReason === 'GG.CC.' ? 'bg-red-500/10 text-red-400' :
                      c.archiveReason === 'Descartado' ? 'bg-muted text-muted-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {c.archiveReason || 'Sin motivo'}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {c.archivedAt ? new Date(c.archivedAt).toLocaleDateString('es-ES') : '—'}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(c.id)}
                      disabled={restoring === c.id}
                      className="text-xs"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Restaurar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
