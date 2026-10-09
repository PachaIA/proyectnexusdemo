import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Copy, Check, Phone, User, Building2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Company, DecisionMaker } from '@/data/companies';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SpeechModalProps {
  company: Company | null;
  selectedContact: DecisionMaker | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SpeechModal = ({ company, selectedContact, isOpen, onClose }: SpeechModalProps) => {
  const [copied, setCopied] = useState(false);

  if (!company || !selectedContact) return null;

  const generateSpeech = () => {
    const greeting = getTimeBasedGreeting();
    const productList = company.recommendedProducts.slice(0, 2).join(' y ');
    const needsList = company.detectedNeeds.slice(0, 2).join(' y ');
    
    return `${greeting}, ¿hablo con ${selectedContact.name}?

Soy Pacha, de Grupo Enertel, partner oficial de Vodafone Business en Málaga.

Le llamo porque hemos detectado que ${company.name} podría beneficiarse significativamente de nuestras soluciones de ${productList}.

${getContextPhrase(company, selectedContact)}

Sabemos que empresas como la suya en el sector ${getSectorLabel(company.sector)} están buscando ${needsList}, y tenemos una propuesta muy competitiva que podría interesarle.

¿Tendría 15 minutos esta semana para que le explique cómo podemos ayudarle a optimizar sus comunicaciones y reducir costes?

${getClosingPhrase(selectedContact)}`;
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getSectorLabel = (sector: string) => {
    const labels: Record<string, string> = {
      industry: 'industrial',
      logistics: 'logístico',
      tourism: 'turístico',
      tech: 'tecnológico',
      retail: 'retail',
      health: 'sanitario',
      education: 'educativo',
      services: 'de servicios profesionales',
    };
    return labels[sector] || sector;
  };

  const getContextPhrase = (company: Company, contact: DecisionMaker) => {
    if (contact.role === 'CEO' || contact.role === 'Director General') {
      return `Como ${contact.role}, seguramente busca soluciones que aporten valor real al negocio sin complicaciones técnicas.`;
    }
    if (contact.role.includes('IT') || contact.role.includes('Tecnología')) {
      return `Como responsable de tecnología, entenderá perfectamente las ventajas de contar con una infraestructura de comunicaciones fiable y escalable.`;
    }
    if (contact.role.includes('Comercial') || contact.role.includes('Ventas')) {
      return `Sabemos que la movilidad y conectividad de su equipo comercial es clave para cerrar más operaciones.`;
    }
    if (contact.role.includes('Operaciones') || contact.role.includes('Compras')) {
      return `Entendemos que la eficiencia operativa y la optimización de costes son prioritarios en su día a día.`;
    }
    return `Con ${company.employees} empleados, la conectividad y comunicaciones son fundamentales para su operativa diaria.`;
  };

  const getClosingPhrase = (contact: DecisionMaker) => {
    if (contact.decisionPower === 'alto') {
      return 'Si le parece bien, le envío un resumen por email y quedamos para una llamada más detallada.';
    }
    return 'Si no es usted la persona indicada, ¿podría decirme con quién debería hablar sobre estos temas?';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateSpeech());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="speech-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-background/70 backdrop-blur-sm z-[9999] flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[95vw] max-w-2xl max-h-[75vh] bg-card rounded-2xl shadow-2xl z-[10000] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-primary text-primary-foreground flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Speech de Llamada</h2>
                  <p className="text-xs text-primary-foreground/70">Adaptado a {selectedContact.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-primary-foreground/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contact Info */}
            <div className="p-4 bg-muted/30 border-b border-border shrink-0">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{company.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{selectedContact.name} - {selectedContact.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{company.contactInfo?.phone || 'Sin teléfono'}</span>
                </div>
              </div>
            </div>

            {/* Speech Content - scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="bg-muted/50 rounded-xl p-4 border border-border m-4">
                <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed font-sans">
                  {generateSpeech()}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-border bg-card flex gap-3 shrink-0">
              <Button
                onClick={handleCopy}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar al portapapeles
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cerrar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
