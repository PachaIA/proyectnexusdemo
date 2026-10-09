import { CsvCompany } from '@/hooks/useCsvCompanies';
import { X, Phone, Linkedin, FileText, Globe, Building2, MapPin, Briefcase, Star, MessageSquare, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface CsvCompanyPanelProps {
  company: CsvCompany | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CsvCompanyPanel = ({ company, isOpen, onClose }: CsvCompanyPanelProps) => {
  if (!company) return null;

  const linkedinUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(company.name)}`;
  const datosCifUrl = `https://www.datoscif.es/empresas/${encodeURIComponent(company.name)}`;
  const telUrl = company.phone ? `tel:${company.phone.replace(/\s/g, '')}` : null;

  const scoreColor = company.ncsScore >= 80 ? 'text-destructive' : company.ncsScore >= 60 ? 'text-warning' : 'text-muted-foreground';
  const scoreBg = company.ncsScore >= 80 ? 'bg-destructive/10' : company.ncsScore >= 60 ? 'bg-warning/10' : 'bg-muted/50';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed right-0 top-16 bottom-0 w-[380px] z-[9999] bg-card border-l border-border shadow-2xl overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-card border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-success" />
              </div>
              <span className="text-xs font-medium text-success uppercase tracking-wider">Google Sheets</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">{company.name}</h2>
              {company.estado && (
                <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{company.estado}</span>
              )}
            </div>

            {/* NCS Score */}
            <div className={`flex items-center gap-3 p-3 rounded-lg ${scoreBg}`}>
              <div className={`text-2xl font-bold ${scoreColor}`}>{company.ncsScore}</div>
              <div>
                <p className="text-xs text-muted-foreground">NCS Score</p>
                <p className={`text-sm font-semibold ${scoreColor}`}>
                  {company.ncsScore >= 80 ? 'Alta prioridad' : company.ncsScore >= 60 ? 'Media' : 'Baja'}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              {company.sector && (
                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sector</p>
                    <p className="text-sm text-foreground">{company.sector}</p>
                  </div>
                </div>
              )}
              {company.tipoNegocio && (
                <div className="flex items-start gap-3">
                  <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo de Negocio</p>
                    <p className="text-sm text-foreground">{company.tipoNegocio}</p>
                  </div>
                </div>
              )}
              {company.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dirección</p>
                    <p className="text-sm text-foreground">{company.address}</p>
                  </div>
                </div>
              )}
              {company.website && (
                <div className="flex items-start gap-3">
                  <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Web</p>
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {company.website}
                    </a>
                  </div>
                </div>
              )}
              {company.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="text-sm text-foreground">{company.phone}</p>
                  </div>
                </div>
              )}
              {company.rating > 0 && (
                <div className="flex items-start gap-3">
                  <Star className="w-4 h-4 text-warning mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <p className="text-sm text-foreground">
                      {company.rating.toFixed(1)} / 5
                      {company.totalReviews > 0 && (
                        <span className="text-muted-foreground ml-1">({company.totalReviews} reseñas)</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
              {company.horario24h && (
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Horario 24h</p>
                    <p className="text-sm text-foreground">{company.horario24h}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-3 border-t border-border">
              {telUrl ? (
                <Button asChild className="w-full bg-success hover:bg-success text-primary-foreground">
                  <a href={telUrl}>
                    <Phone className="w-4 h-4 mr-2" />
                    Llamar
                  </a>
                </Button>
              ) : (
                <Button disabled className="w-full">
                  <Phone className="w-4 h-4 mr-2" />
                  Sin teléfono
                </Button>
              )}

              <Button asChild variant="outline" className="w-full">
                <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </a>
              </Button>

              <Button asChild variant="outline" className="w-full">
                <a href={datosCifUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="w-4 h-4 mr-2" />
                  DatosCIF
                </a>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
