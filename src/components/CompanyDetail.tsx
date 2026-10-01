import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Building2, Users, MapPin, Globe, Phone, Mail, User, 
  TrendingUp, AlertTriangle, CheckCircle, Sparkles, FileText,
  ExternalLink, Newspaper
} from 'lucide-react';
import { Company, sectors, locationTypes } from '@/data/companies';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CompanyDetailProps {
  company: Company | null;
  onClose: () => void;
  onGenerateProposal: () => void;
}

export const CompanyDetail = ({ company, onClose, onGenerateProposal }: CompanyDetailProps) => {
  if (!company) return null;

  const sector = sectors.find(s => s.id === company.sector);
  const locationType = locationTypes.find(l => l.id === company.locationType);

  const getScoreClass = (score: number) => {
    if (score >= 80) return 'score-badge-high';
    if (score >= 60) return 'score-badge-medium';
    return 'score-badge-low';
  };

  const getDigitalizationBadge = (level: string) => {
    switch (level) {
      case 'alto': return { bg: 'bg-success/10', text: 'text-success', label: 'Alta digitalización' };
      case 'medio': return { bg: 'bg-warning/10', text: 'text-warning', label: 'Digitalización media' };
      default: return { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Baja digitalización' };
    }
  };

  const digitalization = getDigitalizationBadge(company.digitalizationLevel);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[9999] flex justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-background h-full overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-primary text-primary-foreground p-6 z-10">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold">{company.name}</h2>
                  <span className={cn("score-badge", getScoreClass(company.opportunityScore))}>
                    {company.opportunityScore}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-primary-foreground/80">
                  <span>{sector?.icon} {sector?.label}</span>
                  <span>•</span>
                  <span>{locationType?.icon} {locationType?.label}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card-elevated p-4 text-center">
                <Users className="w-5 h-5 text-accent mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{company.employees}</p>
                <p className="text-xs text-muted-foreground">Empleados</p>
              </div>
              <div className="card-elevated p-4 text-center">
                <TrendingUp className="w-5 h-5 text-accent mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{company.opportunityScore}</p>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>
              <div className="card-elevated p-4 text-center">
                <Sparkles className="w-5 h-5 text-accent mx-auto mb-2" />
                <p className={cn("text-sm font-semibold capitalize", digitalization.text)}>
                  {company.digitalizationLevel}
                </p>
                <p className="text-xs text-muted-foreground">Digitalización</p>
              </div>
            </div>

            {/* Description */}
            <div className="card-elevated p-4">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent" />
                Resumen Ejecutivo
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {company.description}
              </p>
            </div>

            {/* Contact Info */}
            {company.contactInfo && (
              <div className="card-elevated p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-accent" />
                  Información de Contacto
                </h3>
                <div className="space-y-2">
                  {company.contactInfo.contactPerson && (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{company.contactInfo.contactPerson}</span>
                    </div>
                  )}
                  {company.contactInfo.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{company.contactInfo.phone}</span>
                    </div>
                  )}
                  {company.contactInfo.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{company.contactInfo.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{company.address}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <a href={`https://${company.website}`} target="_blank" rel="noopener noreferrer" 
                       className="text-accent hover:underline flex items-center gap-1">
                      {company.website}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Detected Needs */}
            <div className="card-elevated p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Necesidades Detectadas
              </h3>
              <div className="flex flex-wrap gap-2">
                {company.detectedNeeds.map((need, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full bg-warning/10 text-warning text-sm font-medium">
                    {need}
                  </span>
                ))}
              </div>
            </div>

            {/* Recommended Products */}
            <div className="card-elevated p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Productos Recomendados Vodafone
              </h3>
              <div className="space-y-2">
                {company.recommendedProducts.map((product, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-success/5">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-sm text-foreground">{product}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent News */}
            {company.recentNews && company.recentNews.length > 0 && (
              <div className="card-elevated p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-info" />
                  Noticias Recientes
                </h3>
                <div className="space-y-2">
                  {company.recentNews.map((news, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-info mt-2" />
                      <span className="text-muted-foreground">{news}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            <div className="card-elevated p-4 bg-accent/5 border-accent/20">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                Análisis IA - Argumentario Comercial
              </h3>
              <div className="text-sm text-muted-foreground space-y-3">
                <p>
                  <strong className="text-foreground">Oportunidad principal:</strong> {company.name} presenta una 
                  {company.digitalizationLevel === 'bajo' ? ' baja digitalización, lo que representa una gran oportunidad de modernización integral.' :
                   company.digitalizationLevel === 'medio' ? ' digitalización media, con margen de mejora en conectividad y seguridad.' :
                   ' alta digitalización, ideal para soluciones premium y servicios avanzados.'}
                </p>
                <p>
                  <strong className="text-foreground">Enfoque recomendado:</strong> Centrar la conversación en 
                  {company.sector === 'industria' ? ' la optimización de procesos productivos y la conectividad IoT industrial.' :
                   company.sector === 'turismo' ? ' la experiencia del huésped y la conectividad WiFi de alta densidad.' :
                   company.sector === 'logistica' ? ' la gestión de flotas y la conectividad móvil para conductores.' :
                   company.sector === 'salud' ? ' la seguridad de datos médicos y la telemedicina.' :
                   ' la eficiencia operativa y la seguridad de red.'}
                </p>
                <p>
                  <strong className="text-foreground">Valor diferencial:</strong> Con {company.employees} empleados, 
                  se beneficiaría de una solución integral que combine conectividad, movilidad y seguridad bajo un único proveedor.
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <Button 
              onClick={onGenerateProposal}
              className="w-full btn-accent-gradient py-6 text-lg"
            >
              <FileText className="w-5 h-5 mr-2" />
              Generar Propuesta Comercial
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
