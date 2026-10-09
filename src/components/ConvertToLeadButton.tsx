import { requestOpportunityFields } from '@/lib/opportunity';
import { getEffectiveUser } from '@/lib/openUser';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Company } from '@/data/companies';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface ConvertToLeadButtonProps {
  company: Company;
  isLead: boolean;
  onConverted: () => void;
}

const ConvertToLeadButton = ({ company, isLead, onConverted }: ConvertToLeadButtonProps) => {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleConvert = async () => {
    if (isLead) return;
    
    setLoading(true);
    
    try {
      const { data: { user } } = await getEffectiveUser();
      if (!user) throw new Error('No autenticado');

      // Check for duplicate
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        toast.info('Esta empresa ya es un lead en tu pipeline');
        onConverted();
        return;
      }

      const fields = await requestOpportunityFields({ companyId: company.id, lockClient: true });
      if (!fields) return;

      const { error } = await supabase.from('leads').insert([{
        company_id: company.id,
        empresa: company.name,
        cif: company.cif,
        sector: company.sector,
        tamano: company.employees,
        opportunity_score: company.opportunityScore,
        servicios_recomendados: company.recommendedProducts,
        necesidades_detectadas: company.detectedNeeds,
        estado: 'lead',
        decision_makers: JSON.parse(JSON.stringify(company.decisionMakers || [])),
        arpu_estimado: company.estimatedARPU,
        next_action: company.nextBestAction?.type || 'call',
        user_id: user.id,
        ...fields,
      } as any]);
      
      if (error) throw error;
      
      // Invalidate leads query so all views update immediately
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      toast.success('Lead creado correctamente', {
        description: `${company.name} se ha añadido a tu pipeline`
      });
      
      onConverted();
    } catch (error) {
      console.error('Error creating lead:', error);
      toast.error('Error al crear el lead', {
        description: 'Inténtalo de nuevo más tarde'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isLead ? (
        <motion.div
          key="converted"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Button
            variant="outline"
            className="bg-success/20 border-success/50 text-success hover:bg-success/30 cursor-default"
            disabled
          >
            <Check className="w-4 h-4 mr-2" />
            Ya es Lead
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key="convert"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Button
            onClick={handleConvert}
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-primary-foreground shadow-lg"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Convertir en Lead
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConvertToLeadButton;
