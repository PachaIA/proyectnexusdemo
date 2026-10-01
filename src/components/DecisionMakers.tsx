import { motion } from 'framer-motion';
import { User, Crown, Phone, Mic } from 'lucide-react';
import { DecisionMaker } from '@/data/companies';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DecisionMakersProps {
  decisionMakers: DecisionMaker[];
  onSelectContact?: (contact: DecisionMaker) => void;
}

const getSourceLabel = (source: string) => {
  switch (source) {
    case 'datoscif':
      return 'DatosCIF';
    case 'linkedin':
      return 'LinkedIn';
    case 'web':
      return 'Web';
    case 'estimado':
      return 'Estimado';
    default:
      return source;
  }
};

const getPowerBadge = (power: string) => {
  switch (power) {
    case 'alto':
      return { bg: 'bg-destructive/20', text: 'text-destructive', label: 'Alto' };
    case 'medio':
      return { bg: 'bg-warning/20', text: 'text-warning', label: 'Medio' };
    case 'bajo':
      return { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Bajo' };
    default:
      return { bg: 'bg-muted', text: 'text-muted-foreground', label: power };
  }
};

const getAccessibilityBadge = (accessibility: string) => {
  switch (accessibility) {
    case 'facil':
      return { bg: 'bg-success/20', text: 'text-success', label: 'Fácil' };
    case 'medio':
      return { bg: 'bg-warning/20', text: 'text-warning', label: 'Medio' };
    case 'dificil':
      return { bg: 'bg-destructive/20', text: 'text-destructive', label: 'Difícil' };
    default:
      return { bg: 'bg-muted', text: 'text-muted-foreground', label: accessibility };
  }
};

const DecisionMakers = ({ decisionMakers, onSelectContact }: DecisionMakersProps) => {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <Crown className="w-3.5 h-3.5 text-warning" />
        Personas Clave
      </h4>
      
      <div className="space-y-2">
        {decisionMakers.map((dm, index) => {
          const powerBadge = getPowerBadge(dm.decisionPower);
          const accessBadge = getAccessibilityBadge(dm.accessibility);
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-muted/30 rounded-lg p-2.5 border border-border"
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{dm.role}</p>
                    {dm.name && (
                      <p className="text-[10px] text-muted-foreground">{dm.name}</p>
                    )}
                  </div>
                </div>
                
                <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {getSourceLabel(dm.source)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded", powerBadge.bg, powerBadge.text)}>
                    Poder: {powerBadge.label}
                  </span>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded", accessBadge.bg, accessBadge.text)}>
                    Acceso: {accessBadge.label}
                  </span>
                </div>
                
                {onSelectContact && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectContact(dm)}
                    className="h-6 px-2 text-[10px]"
                  >
                    <Mic className="w-3 h-3 mr-1" />
                    Speech
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1.5">
                <Phone className="w-3 h-3" />
                <span>{dm.contactChannel}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default DecisionMakers;
