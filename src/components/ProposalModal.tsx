import { Money } from '@/components/Money';
import { fmtEur } from '@/hooks/useOpportunityLines';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Building2, CheckCircle, Shield, TrendingUp, 
  Zap, Download, Send, Printer
} from 'lucide-react';
import { Company } from '@/data/companies';
import { Button } from '@/components/ui/button';

interface ProposalModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProposalModal = ({ company, isOpen, onClose }: ProposalModalProps) => {
  if (!company || !isOpen) return null;

  const getValueProposition = () => {
    const propositions = {
      industria: {
        title: 'Transformación Digital Industrial',
        benefits: [
          'Conectividad de alta velocidad para automatización de procesos',
          'IoT industrial para monitorización en tiempo real',
          'Seguridad perimetral contra ciberataques',
          'Backup de conectividad garantizado 24/7'
        ]
      },
      logistica: {
        title: 'Conectividad Total para Logística',
        benefits: [
          'Gestión de flotas con tracking en tiempo real',
          'Conectividad móvil para conductores',
          'Centralita virtual accesible desde cualquier lugar',
          'SD-WAN para múltiples sedes y almacenes'
        ]
      },
      turismo: {
        title: 'Experiencia Digital Premium',
        benefits: [
          'WiFi de alta densidad para huéspedes',
          'Centralita virtual con atención multilingüe',
          'Backup 5G para continuidad de servicio',
          'TV corporativa y señalización digital'
        ]
      },
      tecnologia: {
        title: 'Infraestructura Cloud-Ready',
        benefits: [
          'Fibra simétrica de alta velocidad',
          'Seguridad avanzada para protección de datos',
          'Conectividad redundante sin interrupciones',
          'Soporte técnico especializado 24/7'
        ]
      },
      retail: {
        title: 'Retail Conectado',
        benefits: [
          'Conectividad multi-sede unificada',
          'TPV móviles con conectividad 5G',
          'Seguridad unificada para todas las tiendas',
          'Analítica de datos en tiempo real'
        ]
      },
      salud: {
        title: 'Conectividad Crítica Sanitaria',
        benefits: [
          'Conectividad ultra segura para datos médicos',
          'Plataforma de telemedicina integrada',
          'Backup crítico con SLA garantizado',
          'Cumplimiento normativo RGPD'
        ]
      },
      educacion: {
        title: 'Campus Digital Conectado',
        benefits: [
          'WiFi de alta capacidad para estudiantes',
          'Plataforma de videoconferencia profesional',
          'Seguridad de red para menores',
          'Conectividad para e-learning'
        ]
      }
    };

    return propositions[company.sector as keyof typeof propositions] || propositions.tecnologia;
  };

  const proposition = getValueProposition();

  const estimatedSavings = Math.round(company.employees * 15 + Math.random() * 500);
  const implementationDays = company.employees > 200 ? 30 : company.employees > 100 ? 21 : 14;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/50 z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl bg-background rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-8 relative">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-card/10 flex items-center justify-center hover:bg-card/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm text-primary-foreground/80 mb-4">
              <Zap className="w-4 h-4" />
              <span>Grupo Enertel • Partner Vodafone Business</span>
            </div>

            <h1 className="text-3xl font-bold mb-2">Propuesta Comercial</h1>
            <p className="text-xl text-primary-foreground/90">{company.name}</p>
            <p className="text-sm text-primary-foreground/60 mt-2">Preparado por Alejandro González · Senior Strategic Consultant</p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
            {/* Executive Summary */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-accent" />
                Resumen Ejecutivo
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Estimado/a {company.contactInfo?.contactPerson || 'equipo directivo'}, soy Alejandro González, 
                Senior Strategic Consultant en Grupo Enertel, partner autorizado de Vodafone Business. 
                Hemos analizado las necesidades de 
                <strong className="text-foreground"> {company.name}</strong> y preparado una solución 
                integral de telecomunicaciones adaptada a su sector y tamaño empresarial.
              </p>
            </div>

            {/* Value Proposition */}
            <div className="card-elevated p-6 bg-accent/5 border-accent/20">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                {proposition.title}
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {proposition.benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detected Needs & Solutions */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-elevated p-5">
                <h3 className="font-semibold text-foreground mb-3">Necesidades Detectadas</h3>
                <ul className="space-y-2">
                  {company.detectedNeeds.map((need, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                      {need}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-elevated p-5">
                <h3 className="font-semibold text-foreground mb-3">Soluciones Propuestas</h3>
                <ul className="space-y-2">
                  {company.recommendedProducts.map((product, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-success" />
                      {product}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Key Benefits */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                Beneficios Clave
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="card-elevated p-5 text-center">
                   <div className="text-3xl font-bold text-accent mb-1"><Money>{fmtEur(estimatedSavings)}</Money></div>
                  <p className="text-sm text-muted-foreground">Ahorro mensual estimado</p>
                </div>
                <div className="card-elevated p-5 text-center">
                  <div className="text-3xl font-bold text-success mb-1">99.9%</div>
                  <p className="text-sm text-muted-foreground">SLA de disponibilidad</p>
                </div>
                <div className="card-elevated p-5 text-center">
                  <div className="text-3xl font-bold text-info mb-1">{implementationDays} días</div>
                  <p className="text-sm text-muted-foreground">Tiempo de implementación</p>
                </div>
              </div>
            </div>

            {/* Why Vodafone */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4">¿Por qué Vodafone Business?</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-foreground mb-1">🌐 Red líder</p>
                  <p className="text-muted-foreground">Mayor cobertura 5G de España con fibra hasta 10Gb</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">🔒 Seguridad integrada</p>
                  <p className="text-muted-foreground">Protección empresarial incluida sin coste adicional</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">📞 Soporte 24/7</p>
                  <p className="text-muted-foreground">Atención técnica especializada para empresas</p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-muted rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-3">Próximos Pasos</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">1</span>
                  Reunión de análisis detallado de necesidades
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">2</span>
                  Propuesta económica personalizada
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">3</span>
                  Plan de implementación y migración
                </li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
              <Button className="btn-accent-gradient">
                <Send className="w-4 h-4 mr-2" />
                Enviar por Email
              </Button>
              <Button variant="outline" className="border-border">
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
              <Button variant="outline" className="border-border">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
