import { fmtEur } from '@/hooks/useOpportunityLines';
import { Money } from '@/components/Money';
import { refreshCompanies } from '@/lib/queryClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Building2, MapPin, Globe, Users, Target, Zap, 
  Phone, Mail, Linkedin, TrendingUp, FileText, UserPlus,
  ChevronRight, ExternalLink, Star, AlertCircle, Mic, Send,
  Search, MonitorCheck, MessageCircle, AtSign, Archive
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getEmailMailtoUrl } from '@/lib/emailTemplates';
import { Company, sectors, locationTypes, DecisionMaker } from '@/data/companies';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import DecisionMakers from '@/components/DecisionMakers';
import EditableContacts, { KeyContact } from '@/components/EditableContacts';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import NextBestAction from '@/components/NextBestAction';
import DataSourceBadge from '@/components/DataSourceBadge';
import { SalesSection } from '@/components/SalesSection';
import { SedesSection } from '@/components/SedesSection';
import { CompanyFichaExtra } from '@/components/CompanyFichaExtra';
import { CompanyTopSummary } from '@/components/CompanyTopSummary';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface CompanyDetailPanelProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onGenerateProposal: () => void;
  onCreateLead: () => void;
  onOpenSpeech: (contact: DecisionMaker) => void;
  onSendToNotion?: () => void;
  isSendingToNotion?: boolean;
  onArchive?: () => void;
  /** Cuando es true, en escritorio se muestra en un modal centrado en lugar del panel lateral */
  variant?: 'side' | 'centered';
}

/**
 * CompanyDetailPanel - Premium Client Detail Panel
 * 
 * Part of the CSS grid layout - NOT an overlay on desktop.
 * Fixed 380px width, full height, white background.
 * Clear left border, independent scroll.
 * 
 * Content Order: Contact → Key People → IA → Scores → Actions
 */
export const CompanyDetailPanel = ({ 
  company, 
  isOpen, 
  onClose, 
  onGenerateProposal,
  onCreateLead,
  onOpenSpeech,
  onSendToNotion,
  isSendingToNotion,
  onArchive,
  variant = 'side',
}: CompanyDetailPanelProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (!company) return null;

  const sector = sectors.find(s => s.id === company.sector);
  const location = locationTypes.find(l => l.id === company.locationType);

  // Contacto desde JSONB contact_info (normalizado en useCompanies)
  const contactInfo = company.contactInfo && typeof company.contactInfo === 'object' ? company.contactInfo as any : {};
  const contactName = (contactInfo.nombre || contactInfo.contactPerson || '').toString().trim();
  const contactPhone = (contactInfo.telefono || contactInfo.phone || '').toString().trim();
  const contactEmail = (contactInfo.email || '').toString().trim();
  const hasContactInfo = Boolean(contactName || contactPhone || contactEmail);

  // Intel WASP desde data_sources.wasp
  const dataSources = company.dataSources && !Array.isArray(company.dataSources)
    ? company.dataSources as Record<string, any>
    : null;
  const wasp = dataSources?.wasp && typeof dataSources.wasp === 'object' ? dataSources.wasp : null;
  const hasWaspIntel = company.locationType === 'wasp' && Boolean(wasp);

  const waspOperador = (wasp?.operador_actual ?? '').toString().trim();
  const waspLineasMovil = Number(wasp?.lineas_movil ?? 0);
  const waspLineasFijo = Number(wasp?.lineas_fijo ?? 0);
  const waspPermanencia = Number(wasp?.permanencia ?? 0);
  const waspPenalizacion = Number(wasp?.penalizacion ?? 0);
  const waspTamanio = (wasp?.tamanio ?? '').toString().trim();

  const euroFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });

  const getScoreClass = (score: number) => {
    if (score >= 80) return 'text-success bg-success/10 border-success/30';
    if (score >= 60) return 'text-warning bg-warning/10 border-warning/30';
    return 'text-destructive bg-destructive/10 border-destructive/30';
  };

  const getDigitalizationBadge = (level: string) => {
    switch (level) {
      case 'alto': return { bg: 'bg-info/10', text: 'text-info', label: 'Alto' };
      case 'medio': return { bg: 'bg-warning/10', text: 'text-warning', label: 'Medio' };
      default: return { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Bajo' };
    }
  };

  const digiBadge = getDigitalizationBadge(company.digitalizationLevel);

  const handleSpeechClick = () => {
    const bestContact = company.decisionMakers.reduce((prev, current) => {
      const powerRank = { 'alto': 3, 'medio': 2, 'bajo': 1 };
      return (powerRank[current.decisionPower] || 0) > 
             (powerRank[prev.decisionPower] || 0) ? current : prev;
    }, company.decisionMakers[0]);
    
    onOpenSpeech(bestContact);
  };

  const generateAISummary = () => {
    const needsText = company.detectedNeeds.slice(0, 3).join(', ');
    const productsText = company.recommendedProducts.slice(0, 2).join(' y ');
    
    return `${company.name} presenta una oportunidad comercial ${company.opportunityScore >= 80 ? 'excelente' : company.opportunityScore >= 60 ? 'sólida' : 'con potencial'} en el sector ${sector?.label}. Con ${company.employees} empleados y nivel de digitalización ${digiBadge.label.toLowerCase()}, existe demanda clara de ${needsText}. Recomendamos presentar soluciones de ${productsText} con un ARPU estimado de ${fmtEur(company.estimatedARPU)}/mes.${company.growthSignals.length > 0 ? ` Señales positivas: ${company.growthSignals[0]}.` : ''}`;
  };

  // ─── Cuerpo unificado de la ficha (header + scroll + footer) ────────────
  const panelContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border shrink-0">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-primary-foreground",
              company.opportunityScore >= 80 ? "bg-[var(--alert-text)]" :
              company.opportunityScore >= 60 ? "bg-[var(--alert-text)]" :
              "bg-muted-foreground"
            )}>
              {company.opportunityScore}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground truncate">{company.name}</h2>
                {waspTamanio === 'GG.CC.' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/20 shrink-0">GG.CC.</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">CIF: {company.cif}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
            aria-label="Cerrar panel"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        {/* Resumen fijo NO editable: dirección principal (de la sede principal) + contacto principal */}
        <div className="px-4 pb-3">
          <CompanyTopSummary company={company} />
        </div>
        {/* Mobile big call button */}
        {isMobile && contactPhone && (
          <div className="px-4 pb-3">
            <a
              href={`tel:${contactPhone}`}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base no-underline active:opacity-80 transition-opacity"
              style={{ textDecoration: 'none' }}
            >
              <Phone className="w-5 h-5" /> LLAMAR — {contactPhone}
            </a>
            <button
              onClick={() => navigate(`/llamada/${company.id}`)}
              className="mt-2 w-full py-2.5 rounded-xl border border-primary/40 text-primary text-sm font-semibold active:opacity-80"
            >
              Modo llamada
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5 pb-24 md:pb-5">
          {/* 1. CONTACT INFORMATION */}
          <section className="bg-muted/40 rounded-xl p-4 border border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Datos de Contacto
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm text-foreground">{company.name}</p>
                  <p className="text-xs text-muted-foreground">CIF: {company.cif}</p>
                </div>
              </div>
              {/* Dirección editable solo dentro de Multisede/Sedes; el resumen fijo está arriba */}
              {hasContactInfo && (
                <div className="pt-3 mt-3 border-t border-border space-y-2.5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacto</h4>
                  {contactName && (
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground">{contactName}</span>
                    </div>
                  )}
                  {contactPhone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a href={`tel:${contactPhone}`} className="text-sm text-foreground hover:text-primary transition-colors font-medium">
                        {contactPhone}
                      </a>
                    </div>
                  )}
                  {contactEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${contactEmail}`} className="text-sm text-foreground hover:text-primary transition-colors truncate">
                        {contactEmail}
                      </a>
                    </div>
                  )}
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <a href={company.website?.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                    {company.website}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
              {company.linkedin && (
                <div className="flex items-center gap-3">
                  <Linkedin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <button
                    onClick={() => {
                      const url = company.linkedin!.startsWith('http') ? company.linkedin! : `https://${company.linkedin!}`;
                      window.open(url, '_blank');
                    }}
                    disabled={!company.linkedin || company.linkedin.trim() === ''}
                    className={cn(
                      "text-sm font-medium text-left",
                      company.linkedin && company.linkedin.trim() !== ''
                        ? "text-primary hover:underline cursor-pointer"
                        : "text-muted-foreground cursor-not-allowed opacity-50"
                    )}
                  >
                    Ver perfil LinkedIn
                  </button>
                </div>
              )}
            </div>

            {/* Deep Scan Actions */}
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-accent text-accent hover:bg-accent hover:text-accent-foreground text-xs"
                onClick={() => {
                  const query = encodeURIComponent(`${company.name} gerente IT`);
                  window.open(`https://www.linkedin.com/search/results/all/?keywords=${query}`, '_blank');
                }}
              >
                <Linkedin className="w-3.5 h-3.5 mr-1.5" />
                LinkedIn Deep Scan
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-accent text-accent hover:bg-accent hover:text-accent-foreground text-xs"
                onClick={() => {
                  const url = company.website?.startsWith('http') ? company.website : `https://${company.website}`;
                  window.open(url, '_blank');
                }}
              >
                <MonitorCheck className="w-3.5 h-3.5 mr-1.5" />
                Web & Tech Check
              </Button>
            </div>
          </section>

          {/* 2. KEY PEOPLE - Editable Contacts */}
          <section>
            <EditableContacts
              companyId={company.id}
              contacts={(company.decisionMakers || []).map((dm: any) => ({
                ...dm,
                name: dm.name || '',
                role: dm.role || '',
                mobile: dm.mobile || '',
                email: dm.email || '',
                linkedin_url: dm.linkedin_url || '',
                principal: !!dm.principal,
              }))}
              onUpdate={() => {
                refreshCompanies();
              }}
            />
          </section>

          {/* Sedes / Multisede */}
          <section>
            <SedesSection companyId={company.id} />
          </section>

          {/* Datos fiscales / Representante */}
          <section>
            <CompanyFichaExtra companyId={company.id} />
          </section>

          {/* Ventas cerradas */}
          <section>
            <SalesSection companyId={company.id} />
          </section>

          {/* 3. AI COMMERCIAL SUMMARY */}
          <section className="bg-accent/5 rounded-xl p-4 border border-accent/20">
            <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Análisis Comercial IA
            </h3>
            <p className="text-sm text-foreground leading-relaxed">
              {generateAISummary()}
            </p>
          </section>

          {/* 3b. INTEL COMPETITIVA (WASP) */}
          {hasWaspIntel && (
            <section className="bg-muted/40 rounded-xl p-4 border border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Intel Competitiva
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">Operador actual</span>
                <span className="font-medium text-foreground">{waspOperador || '—'}</span>
                <span className="text-muted-foreground">Líneas móvil</span>
                <span className="font-medium text-foreground">{Number.isFinite(waspLineasMovil) ? waspLineasMovil : 0}</span>
                <span className="text-muted-foreground">Líneas fijo</span>
                <span className="font-medium text-foreground">{Number.isFinite(waspLineasFijo) ? waspLineasFijo : 0}</span>
                <span className="text-muted-foreground">Permanencia</span>
                <span className="font-medium text-foreground">{Number.isFinite(waspPermanencia) ? waspPermanencia : 0}</span>
                <span className="text-muted-foreground">Penalización</span>
                <span className="font-medium text-foreground"><Money>{fmtEur(Number.isFinite(waspPenalizacion) ? waspPenalizacion : 0)}</Money></span>
                <span className="text-muted-foreground">Tamaño</span>
                <span className="font-medium text-foreground">{waspTamanio || '—'}</span>
              </div>
            </section>
          )}

          {/* 4. SCORES & METRICS */}
          <section>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                <div className={cn("inline-flex px-2 py-1 rounded-lg text-lg font-bold border", getScoreClass(company.opportunityScore))}>
                  {company.opportunityScore}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">Score</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center justify-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-lg font-bold text-foreground">{company.employees}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">Empleados</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center justify-center gap-1.5">
                  <Zap className="w-4 h-4 text-accent" />
                  <span className="text-lg font-bold text-foreground"><Money>{fmtEur(company.estimatedARPU)}</Money></span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">ARPU</p>
              </div>
            </div>
            <ScoreBreakdown breakdown={company.scoreBreakdown} totalScore={company.opportunityScore} />
          </section>

          <section>
            <NextBestAction action={company.nextBestAction} companyName={company.name} />
          </section>
        </div>
      </ScrollArea>

      {/* 5. ACTIONS - Sticky Footer */}
      <div className="sticky bottom-0 p-4 border-t border-border bg-card space-y-2 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onCreateLead} className="bg-primary hover:bg-primary/90">
            <UserPlus className="w-4 h-4 mr-2" />
            Crear Lead
          </Button>
          <Button 
            onClick={onGenerateProposal}
            variant="outline"
            className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
          >
            <FileText className="w-4 h-4 mr-2" />
            Propuesta
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={handleSpeechClick} variant="secondary" size="icon" className="h-10 w-full" title="Speech">
            <Mic className="!w-[18px] !h-[18px]" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-full border-primary/50 text-primary hover:bg-primary/10"
            title="Email"
            onClick={() => {
              const url = getEmailMailtoUrl({
                companyName: company.name,
                sector: sector?.label || company.sector,
                email: company.contactInfo?.email,
              });
              window.open(url, '_self');
            }}
          >
            <AtSign className="!w-[18px] !h-[18px]" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-full border-success/50 text-success hover:bg-success/10"
            title="WhatsApp"
            onClick={() => {
              const lines = [
                `🏢 ${company.name}`,
                `📍 ${company.address}`,
                `🎯 Score Nexus: ${company.opportunityScore}/100`,
                `💶 ARPU estimado: ${fmtEur(company.estimatedARPU)}/mes`,
                company.contactInfo?.phone ? `📞 ${company.contactInfo.phone}` : '',
                company.website ? `🔗 ${company.website}` : '',
                '',
                '— Enviado desde Nexus Inteligencia Comercial',
              ].filter(Boolean).join('\n');
              window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank');
            }}
          >
            <MessageCircle className="!w-[18px] !h-[18px]" />
          </Button>
        </div>
        {onArchive && !company.archivedAt && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onArchive}
            className="w-full text-xs text-muted-foreground hover:text-destructive"
          >
            <Archive className="w-3.5 h-3.5 mr-1.5" />
            Archivar empresa
          </Button>
        )}
      </div>
    </div>
  );

  // Mobile: Drawer (bottom sheet)
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          {panelContent}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop centered modal (Pipeline)
  if (variant === 'centered') {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-3xl w-[90vw] h-[88vh] p-0 overflow-hidden gap-0 flex flex-col">
          {panelContent}
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop side panel (Clientes / Mapa)
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="static h-full w-[420px] bg-card border-l border-border flex flex-col flex-shrink-0"
        >
          {panelContent}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
