import { useState, useEffect, useRef } from 'react';
import { X, Phone, Linkedin, FileText, Globe, Building2, MapPin, Briefcase, Star, Tag, MessageSquare, Brain, PlusCircle, Loader2, MessageCircle, AtSign } from 'lucide-react';
import { getEmailMailtoUrl } from '@/lib/emailTemplates';
import EditableContacts from '@/components/EditableContacts';
import { SalesSection } from '@/components/SalesSection';
import { SedesSection } from '@/components/SedesSection';
import { CompanyFichaExtra } from '@/components/CompanyFichaExtra';
import { CompanyAddressEditor } from '@/components/CompanyAddressEditor';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const ESTADOS = [
  { id: 'prospecto', label: 'Prospecto', color: 'var(--interactive)' },
  { id: 'contactado', label: 'Contactado', color: 'var(--warning-text)' },
  { id: 'propuesta_enviada', label: 'Propuesta Enviada', color: 'var(--alert-text)' },
  { id: 'cliente', label: 'Cliente', color: 'var(--success-text)' },
  { id: 'descartado', label: 'Descartado', color: 'var(--muted-text-accessible)' },
];

const STORAGE_KEY = 'unified_panel_data';

interface PanelNote {
  fecha: string;
  texto: string;
}

interface PanelData {
  estado: string;
  notas: PanelNote[];
}

function loadPanelData(): Record<string, PanelData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function savePanelData(data: Record<string, PanelData>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export interface UnifiedCompany {
  id: string;
  name: string;
  sector: string;
  address: string;
  phone: string;
  website: string;
  score: number;
  rating?: number;
  totalReviews?: number;
  tipoNegocio?: string;
  horario24h?: string;
  estado?: string;
  source: 'database' | 'csv';
}

interface UnifiedCompanyPanelProps {
  company: UnifiedCompany | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToPipeline?: (company: UnifiedCompany) => Promise<void>;
}

const BRIEFING_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/csv-briefing`;

export const UnifiedCompanyPanel = ({ company, isOpen, onClose, onAddToPipeline }: UnifiedCompanyPanelProps) => {
  const [panelStore, setPanelStore] = useState<Record<string, PanelData>>(loadPanelData);
  const [noteText, setNoteText] = useState('');
  const [briefing, setBriefing] = useState('');
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const briefingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNoteText('');
    setBriefing('');
  }, [company?.id]);

  if (!company) return null;

  const data = panelStore[company.id] || { estado: 'prospecto', notas: [] };

  const updateData = (patch: Partial<PanelData>) => {
    const updated = { ...panelStore, [company.id]: { ...data, ...patch } };
    setPanelStore(updated);
    savePanelData(updated);
  };

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    const nota: PanelNote = { fecha: new Date().toISOString().slice(0, 10), texto: noteText.trim() };
    updateData({ notas: [nota, ...data.notas] });
    setNoteText('');
  };

  const handleBriefing = async () => {
    setBriefingLoading(true);
    setBriefing('');
    try {
      const resp = await fetch(BRIEFING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Dame un briefing comercial completo para preparar la visita a esta empresa.` }],
          company: {
            name: company.name,
            sector: company.sector,
            address: company.address,
            phone: company.phone,
            website: company.website,
            score: company.score,
            rating: company.rating,
            totalReviews: company.totalReviews,
            tipoNegocio: company.tipoNegocio,
            estado: data.estado,
          },
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Error del servicio de IA');
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setBriefing(fullText);
            }
          } catch { /* partial */ }
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Error generando briefing');
    } finally {
      setBriefingLoading(false);
    }
  };

  const handleAddToPipeline = async () => {
    if (!onAddToPipeline) return;
    setPipelineLoading(true);
    try {
      await onAddToPipeline(company);
    } finally {
      setPipelineLoading(false);
    }
  };

  const linkedinUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(company.name)}`;
  const datosCifUrl = `https://www.datoscif.es/empresa/${encodeURIComponent(company.name)}`;
  const telUrl = company.phone ? `tel:${company.phone.replace(/\s/g, '')}` : null;

  const scoreColor = company.score >= 80 ? 'text-destructive' : company.score >= 60 ? 'text-warning' : 'text-muted-foreground';
  const scoreBg = company.score >= 80 ? 'bg-destructive/10' : company.score >= 60 ? 'bg-warning/10' : 'bg-muted/50';

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
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary uppercase tracking-wider">Empresa</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">{company.name}</h2>
            </div>

            {/* Score */}
            <div className={`flex items-center gap-3 p-3 rounded-lg ${scoreBg}`}>
              <div className={`text-2xl font-bold ${scoreColor}`}>{company.score}</div>
              <div>
                <p className="text-xs text-muted-foreground">NCS Score</p>
                <p className={`text-sm font-semibold ${scoreColor}`}>
                  {company.score >= 80 ? 'Alta prioridad' : company.score >= 60 ? 'Media' : 'Baja'}
                </p>
              </div>
            </div>

            {/* Status Selector */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Estado</p>
              <div className="flex flex-wrap gap-1.5">
                {ESTADOS.map(e => (
                  <button
                    key={e.id}
                    onClick={() => updateData({ estado: e.id })}
                    className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border"
                    style={{
                      background: data.estado === e.id ? `color-mix(in srgb, ${e.color} 13.3%, transparent)` : 'transparent',
                      borderColor: data.estado === e.id ? e.color : 'var(--border)',
                      color: data.estado === e.id ? e.color : 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {e.label}
                  </button>
                ))}
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
              {company.source === 'database' ? (
                <CompanyAddressEditor companyId={company.id} initialAddress={company.address || ''} />
              ) : company.address ? (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dirección</p>
                    <p className="text-sm text-foreground">{company.address}</p>
                  </div>
                </div>
              ) : null}
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
              {company.rating != null && company.rating > 0 && (
                <div className="flex items-start gap-3">
                  <Star className="w-4 h-4 text-warning mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <p className="text-sm text-foreground">
                      {company.rating.toFixed(1)} / 5
                      {company.totalReviews != null && company.totalReviews > 0 && (
                        <span className="text-muted-foreground ml-1">({company.totalReviews} reseñas)</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Contactos Clave */}
            <EditableContacts
              companyId={company.id}
              contacts={[]}
              localStorageKey={company.id}
              onUpdate={() => {}}
            />

            {/* Sedes */}
            <SedesSection companyId={company.id} />

            {/* Datos fiscales / Representante */}
            <CompanyFichaExtra companyId={company.id} />

            {/* Ventas cerradas */}
            <SalesSection companyId={company.id} />


            {/* Notes */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Notas
              </p>
              <Textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Escribe una nota sobre esta empresa..."
                rows={3}
                className="text-sm"
              />
              <Button
                onClick={handleSaveNote}
                disabled={!noteText.trim()}
                size="sm"
                className="mt-2 w-full"
              >
                Guardar nota
              </Button>
              {data.notas.length > 0 && (
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {data.notas.map((n, i) => (
                    <div key={i} className="text-xs bg-muted/50 rounded-lg p-2.5 border border-border">
                      <span className="font-mono text-muted-foreground">{n.fecha}</span>
                      <span className="text-foreground ml-2">{n.texto}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Briefing */}
            <div>
              <Button
                onClick={handleBriefing}
                disabled={briefingLoading}
                variant="outline"
                className="w-full border-primary/30 text-primary hover:bg-primary/10"
              >
                {briefingLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4 mr-2" />
                )}
                Briefing IA
              </Button>
              {briefing && (
                <div ref={briefingRef} className="mt-3 text-xs bg-primary/5 border border-primary/20 rounded-lg p-3 max-h-60 overflow-y-auto whitespace-pre-wrap text-foreground">
                  {briefing}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-3 border-t border-border">
              {/* Add to Pipeline */}
              {onAddToPipeline && (
                <Button
                  onClick={handleAddToPipeline}
                  disabled={pipelineLoading}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {pipelineLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <PlusCircle className="w-4 h-4 mr-2" />
                  )}
                  Añadir al Pipeline
                </Button>
              )}

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

              <Button
                variant="outline"
                className="w-full border-primary/50 text-primary hover:bg-primary/10"
                onClick={() => {
                  const url = getEmailMailtoUrl({
                    companyName: company.name,
                    sector: company.sector,
                    status: data.estado,
                  });
                  window.open(url, '_self');
                }}
              >
                <AtSign className="w-4 h-4 mr-2" />
                Email
              </Button>

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

              <Button
                variant="outline"
                className="w-full border-success/50 text-success hover:bg-success/10"
                onClick={() => {
                  const lastNote = panelStore[company?.id || '']?.notas?.slice(-1)[0]?.texto;
                  const lines = [
                    `🏢 ${company?.name}`,
                    company?.address ? `📍 ${company.address}` : '',
                    `🎯 Score Nexus: ${company?.score || 0}/100`,
                    company?.rating ? `⭐ Rating: ${company.rating}` : '',
                    company?.phone ? `📞 ${company.phone}` : '',
                    company?.website ? `🔗 ${company.website}` : '',
                    lastNote ? `📝 ${lastNote}` : '',
                    '',
                    '— Enviado desde Nexus Inteligencia Comercial',
                  ].filter(Boolean).join('\n');
                  window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank');
                }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Compartir por WhatsApp
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
