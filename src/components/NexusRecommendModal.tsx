import { refreshCompanies, refreshLeads } from '@/lib/queryClient';
import { getEffectiveUser } from '@/lib/openUser';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, Flame, SkipForward, Target, Shield, Smartphone, X } from 'lucide-react';
import { Company } from '@/data/companies';
import { useCompanies } from '@/hooks/useCompanies';
import { useLeads } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onCompanySelect: (company: Company) => void;
}

export const NexusRecommendModal = ({ open, onClose, onCompanySelect }: Props) => {
  const { companies } = useCompanies();
  const { leads } = useLeads();
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Filter: wasp data, not archived, not hot, not cerrado/propuesta lead, has operador, no permanencia
  const candidates = useMemo(() => {
    const closedLeadCompanyIds = new Set(
      leads
        .filter(l => !l.archived_at && (l.estado === 'ganada' || l.estado === 'perdida' || l.estado === 'propuesta'))
        .map(l => l.company_id)
    );

    return companies
      .filter(c => {
        if (c.archivedAt) return false;
        if (c.isHot) return false;
        if (skippedIds.has(c.id)) return false;
        if (closedLeadCompanyIds.has(c.id)) return false;

        // Must have wasp data (operador known)
        const operador = c.operadorActual || '';
        if (!operador) return false;

        // No permanencia = easy to move
        const perm = c.permanencia || 0;
        if (perm > 0) return false;

        return true;
      })
      .sort((a, b) => b.opportunityScore - a.opportunityScore);
  }, [companies, leads, skippedIds]);

  const current = candidates[0] || null;

  const handleSkip = () => {
    if (!current) return;
    setSkippedIds(prev => new Set([...prev, current.id]));
  };

  const handleCall = async () => {
    if (!current) return;
    setLoading(true);
    try {
      const { data: { user } } = await getEffectiveUser();
      if (!user) throw new Error('No auth');

      const today = new Date().toISOString().split('T')[0];

      // Upsert lead
      const { data: existing } = await (supabase as any)
        .from('leads')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', current.id)
        .maybeSingle();

      if (existing) {
        await (supabase as any).from('leads').update({
          estado: 'contactado',
          next_action: 'call',
          next_action_date: today,
        }).eq('id', existing.id);
      } else {
        const fields = await requestOpportunityFields({ companyId: current.id, lockClient: true });
        if (!fields) return;
        const { error } = await (supabase as any).from('leads').insert({
          user_id: user.id,
          company_id: current.id,
          empresa: current.name,
          cif: current.cif || null,
          sector: current.sector,
          tamano: current.employees || 0,
          opportunity_score: current.opportunityScore,
          estado: 'contactado',
          next_action: 'call',
          next_action_date: today,
          ...fields,
        });
        if (error) throw error;
      }

      refreshLeads();
      toast.success(`Lead "${current.name}" creado — estado: Contactado`);
      onClose();
      onCompanySelect(current);
    } catch (e: any) {
      toast.error('Error al crear lead');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkHot = async () => {
    if (!current) return;
    setLoading(true);
    try {
      await (supabase as any)
        .from('companies')
        .update({ is_hot: true })
        .eq('id', current.id);
      refreshCompanies();
      toast.success(`${current.name} marcada como 🔥 caliente`);
      // Skip to next
      setSkippedIds(prev => new Set([...prev, current.id]));
    } catch {
      toast.error('Error');
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = current?.contactInfo as any;
  const contactName = contactInfo?.nombre || contactInfo?.contactPerson || '';
  const contactPhone = contactInfo?.telefono || contactInfo?.phone || '';
  const contactEmail = contactInfo?.email || '';
  const operador = current?.operadorActual || '';
  const lineas = current?.lineasMovil || 0;
  const penalizacion = current?.penalizacion || 0;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Nexus recomienda
          </DialogTitle>
        </DialogHeader>

        {current ? (
          <div className="px-6 pb-6 space-y-5">
            {/* Company name + score */}
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold text-foreground">{current.name}</h3>
              <span className={cn(
                "text-sm font-bold px-3 py-1 rounded-full shrink-0",
                current.opportunityScore >= 80 ? "bg-destructive/15 text-destructive" :
                current.opportunityScore >= 60 ? "bg-orange-500/15 text-orange-600" :
                "bg-muted text-muted-foreground"
              )}>
                {current.opportunityScore} pts
              </span>
            </div>

            {/* Why this company */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <p className="text-xs font-semibold text-primary mb-1.5">¿Por qué esta empresa?</p>
              <p className="text-sm text-foreground leading-relaxed">
                Tiene <strong>{lineas} líneas móvil</strong> con <strong>{operador}</strong>, 
                sin permanencia{penalizacion === 0 ? ' ni penalización' : ''}.
                Score <strong>{current.opportunityScore}/100</strong>.
              </p>
            </div>

            {/* Contact info */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacto</p>
              {contactName && (
                <p className="text-sm text-foreground">{contactName}</p>
              )}
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="text-sm text-primary hover:underline flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {contactPhone}
                </a>
              )}
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="text-sm text-primary hover:underline">
                  {contactEmail}
                </a>
              )}
              {!contactName && !contactPhone && (
                <p className="text-sm text-muted-foreground italic">Sin datos de contacto</p>
              )}
            </div>

            {/* Telco data */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <Smartphone className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold text-foreground">{lineas}</p>
                <p className="text-[10px] text-muted-foreground">Líneas móvil</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <Shield className="w-4 h-4 mx-auto text-green-500 mb-1" />
                <p className="text-lg font-bold text-green-500">0</p>
                <p className="text-[10px] text-muted-foreground">Permanencia</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <span className="text-base">📡</span>
                <p className="text-sm font-bold text-foreground mt-1 truncate">{operador || '—'}</p>
                <p className="text-[10px] text-muted-foreground">Operador</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCall}
                disabled={loading}
                className="flex-1 gap-2"
              >
                <Phone className="w-4 h-4" /> Llamar ahora
              </Button>
              <Button
                variant="outline"
                onClick={handleMarkHot}
                disabled={loading}
                className="gap-2"
              >
                <Flame className="w-4 h-4 text-orange-500" /> Caliente
              </Button>
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="gap-2"
              >
                <SkipForward className="w-4 h-4" /> Pasar
              </Button>
            </div>

            {/* Remaining count */}
            <p className="text-[10px] text-muted-foreground text-center">
              {candidates.length - 1} empresas más en la cola
            </p>
          </div>
        ) : (
          <div className="px-6 pb-6 text-center py-10">
            <Target className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No hay más recomendaciones disponibles</p>
            <p className="text-xs text-muted-foreground mt-1">Todas las empresas han sido contactadas, marcadas o no cumplen los criterios</p>
            <Button variant="outline" className="mt-4" onClick={() => { setSkippedIds(new Set()); }}>
              Reiniciar filtros
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
