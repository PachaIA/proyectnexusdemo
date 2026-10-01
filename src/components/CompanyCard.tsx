import { motion } from 'framer-motion';
import { Building2, Users, MapPin, Globe, TrendingUp, ChevronRight } from 'lucide-react';
import { Company, sectors } from '@/data/companies';
import { cn } from '@/lib/utils';

interface CompanyCardProps {
  company: Company;
  onClick: () => void;
  index: number;
  compact?: boolean;
}

export const CompanyCard = ({ company, onClick, index, compact = false }: CompanyCardProps) => {
  const sector = sectors.find(s => s.id === company.sector);
  
  const getScoreClass = (score: number) => {
    if (score >= 80) return 'bg-success/15 text-success border-success/30';
    if (score >= 60) return 'bg-warning/15 text-warning border-warning/30';
    return 'bg-destructive/15 text-destructive border-destructive/30';
  };

  const getDigitalizationColor = (level: string) => {
    switch (level) {
      case 'alto': return 'text-success';
      case 'medio': return 'text-warning';
      default: return 'text-destructive';
    }
  };

  // Compact view for sidebar list - optimized for fast scanning
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -3 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.015, duration: 0.15 }}
        onClick={onClick}
        className={cn(
          "px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 group",
          "bg-sidebar-accent/20 border border-transparent",
          "hover:bg-sidebar-accent/50 hover:border-sidebar-primary/20"
        )}
      >
        <div className="flex items-center gap-2">
          {/* Score badge - most important, always visible */}
          <div className={cn(
            "shrink-0 w-9 h-9 rounded-md flex items-center justify-center text-xs font-bold",
            getScoreClass(company.opportunityScore)
          )}>
            {company.opportunityScore}
          </div>
          
          {/* Company info - truncated for density */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{sector?.icon}</span>
              <h4 className="font-medium text-[13px] text-sidebar-foreground truncate group-hover:text-sidebar-primary transition-colors leading-tight">
                {company.name}
              </h4>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-sidebar-foreground/50 truncate">{company.location}</span>
              <span className="text-[10px] text-sidebar-foreground/40">•</span>
              <span className="text-[11px] text-sidebar-foreground/50">{company.employees} emp</span>
            </div>
          </div>
          
          {/* Lines indicator */}
          <div className="shrink-0 text-right">
            <span className="text-[10px] font-semibold text-sidebar-primary">{company.lineasMovil || 0} lín</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Full card view (for grid layouts)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {company.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs">{sector?.icon}</span>
              <span className="text-xs text-muted-foreground">{sector?.label}</span>
            </div>
          </div>
        </div>
        <div className={cn("px-2.5 py-1 rounded-lg text-sm font-bold border", getScoreClass(company.opportunityScore))}>
          {company.opportunityScore}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{company.employees} empleados</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{company.location}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Digitalización:</span>
            <span className={cn("text-xs font-medium capitalize", getDigitalizationColor(company.digitalizationLevel))}>
              {company.digitalizationLevel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Ver detalles
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {company.detectedNeeds.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            {company.detectedNeeds.slice(0, 2).map((need, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {need}
              </span>
            ))}
            {company.detectedNeeds.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{company.detectedNeeds.length - 2} más
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
