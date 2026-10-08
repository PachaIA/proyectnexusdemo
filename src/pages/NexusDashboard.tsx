import { requestOpportunityFields } from '@/lib/opportunity';
import { refreshCompanies, refreshLeads } from '@/lib/queryClient';
import { getEffectiveUser } from '@/lib/openUser';
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NEXUS_VIEW_PATHS, nexusViewFromPath, NexusView } from "@/lib/nexusViews";
import { Company, DecisionMaker } from "@/data/companies";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { HoyTab } from "@/components/HoyTab";
import { ArchivoTab } from "@/components/ArchivoTab";
import { ClientesTab } from "@/components/ClientesTab";
import { toast } from "sonner";
import { useCompanies } from "@/hooks/useCompanies";
import { BriefingEditableBlock } from "@/components/BriefingEditableBlock";
import { CompanyTopSummary } from "@/components/CompanyTopSummary";
import { ActivitySection } from "@/components/ActivitySection";
import { QuickReportModal } from "@/components/QuickReportModal";
import { InformesTab } from "@/components/InformesTab";
import { AgendaTab } from "@/components/AgendaTab";


const BRIEFING_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nexus-briefing`;
const ARCGIS_BASE = "https://experience.arcgis.com/experience/e97b58724a4c4e2e84470e733bd2746d/page/Cableada";

const STORAGE_KEY = "nexus_interactions";

// ─── Theme Colors — CSS Variable Based ──────────────────────────────────
const T = {
  bg: "var(--t-bg)",
  sidebar: "var(--t-sidebar)",
  card: "var(--t-card)",
  cardAlt: "var(--t-card-alt)",
  cardHover: "var(--t-card-hover)",
  border: "var(--t-border)",
  borderSubtle: "var(--t-border-subtle)",
  accent: "var(--t-accent)",
  accentLight: "var(--t-accent-light)",
  accentDark: "var(--t-accent-dark)",
  textPrimary: "var(--t-text-primary)",
  textSecondary: "var(--t-text-secondary)",
  textTertiary: "var(--t-text-tertiary)",
  textMuted: "var(--t-text-muted)",
  textLabel: "var(--t-text-label)",
};

const sectorColors: Record<string, string> = {
  salud: "#ef4444", industria: "#f59e0b", logistica: "#3b82f6",
  tecnologia: "#8b5cf6", retail: "#ec4899", turismo: "#14b8a6",
  educacion: "#22c55e", servicios: "#f97316",
};
const sectorIcons: Record<string, string> = {
  salud: "🏥", industria: "🏭", logistica: "📦", tecnologia: "💻",
  retail: "🛒", turismo: "🏨", educacion: "🎓", servicios: "💼",
};
const actionIcons: Record<string, string> = { visit: "🚗", call: "📞", email: "✉️", proposal: "📋", "follow-up": "🔄" };
const priorityColors: Record<string, string> = { alta: "#ef4444", media: "#f59e0b", baja: "#6b7280" };
const powerColors: Record<string, string> = { alto: "#ef4444", medio: "#f59e0b", bajo: "#6b7280" };
const accessColors: Record<string, string> = { facil: "#22c55e", medio: "#f59e0b", dificil: "#ef4444" };

function getSafeActionType(nextBestAction: Company["nextBestAction"]): keyof typeof actionIcons {
  const normalized = typeof nextBestAction?.type === "string" ? nextBestAction.type.trim().toLowerCase() : "";
  return normalized in actionIcons ? (normalized as keyof typeof actionIcons) : "call";
}

function getSafePriority(nextBestAction: Company["nextBestAction"]): keyof typeof priorityColors {
  const normalized = typeof nextBestAction?.priority === "string" ? nextBestAction.priority.trim().toLowerCase() : "";
  return normalized in priorityColors ? (normalized as keyof typeof priorityColors) : "media";
}

const ESTADOS = [
  { id: "lead", label: "⚪ LEAD", color: "#6b7280" },
  { id: "contactado", label: "🔵 CONTACTADO", color: "#3b82f6" },
  { id: "propuesta", label: "🟠 PROPUESTA", color: "#f97316" },
  { id: "negociacion", label: "🟡 NEGOCIACIÓN", color: "#eab308" },
  { id: "ganada", label: "🟣 GANADA", color: "#8b5cf6" },
  { id: "perdida", label: "🔴 PERDIDA", color: "#ef4444" },
];

interface Nota { fecha: string; texto: string; }
interface InteractionData {
  estado: string;
  notas: Nota[];
  ultimoContacto: string | null;
  proximoContacto: string | null;
  contactadoHoy: boolean;
}
type InteractionsMap = Record<string, InteractionData>;

function loadInteractions(): InteractionsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveInteractions(data: InteractionsMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function getInteraction(map: InteractionsMap, id: string): InteractionData {
  return map[id] || { estado: "lead", notas: [], ultimoContacto: null, proximoContacto: null, contactadoHoy: false };
}
function getEstadoColor(estado: string): string {
  return ESTADOS.find(e => e.id === estado)?.color || "#3b82f6";
}
function getNextContactLabel(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "⏰ PASADO";
  if (diff === 0) return "📅 HOY";
  if (diff === 1) return "📅 MAÑANA";
  if (diff <= 3) return `📅 EN ${diff}D`;
  if (diff <= 7) return "📅 ESTA SEMANA";
  return `📅 ${target.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}`;
}
function addDays(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── Score Badge ─────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "#ef4444" : score >= 60 ? "#f59e0b" : "#6b7280";
  const label = score >= 80 ? "🔥 ALTA" : score >= 60 ? "⚡ MEDIA" : "· BAJA";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        border: `3px solid ${color}`, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 16px ${color}55`, background: `${color}18`,
      }}>
        <span style={{ fontSize: 15, fontWeight: 900, color, fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 8, color: `${color}aa`, letterSpacing: 1 }}>SCORE</span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 2, fontFamily: "'Space Mono', monospace" }}>{label}</span>
    </div>
  );
}

// ─── AI Briefing Modal ──────────────────────────────────────────────────
interface AIMessage { role: "user" | "assistant"; content: string; }

function AIBriefing({ company, onClose }: { company: Company; onClose: () => void }) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const streamBriefing = async (userMessages: AIMessage[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("No autenticado. Inicia sesión para usar el briefing.");
    }
    const resp = await fetch(BRIEFING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        messages: userMessages,
        company: {
          name: company.name, sector: company.sector, employees: company.employees,
          opportunityScore: company.opportunityScore,
          digitalizationLevel: company.digitalizationLevel, isMultiSite: company.isMultiSite,
          detectedNeeds: company.detectedNeeds, recommendedProducts: company.recommendedProducts,
          growthSignals: company.growthSignals, nextBestAction: company.nextBestAction,
          decisionMakers: company.decisionMakers,
        },
      }),
    });
    if (!resp.ok || !resp.body) {
      const errorData = await resp.json().catch(() => ({ error: "Error de conexión" }));
      throw new Error(errorData.error || "Error del servidor");
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let fullText = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullText += content;
            const currentText = fullText;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: currentText } : m);
              return [...prev, { role: "assistant", content: currentText }];
            });
          }
        } catch { textBuffer = line + "\n" + textBuffer; break; }
      }
    }
    return fullText;
  };

  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      try {
        const initMsg: AIMessage = {
          role: "user",
          content: `Dame el briefing de hoy para visitar/contactar a ${company.name}. Sé directo: qué digo, a quién me dirijo primero, y cuál es mi argumento de apertura más potente.`,
        };
        await streamBriefing([initMsg]);
      } catch (e: any) { setMessages([{ role: "assistant", content: `Error: ${e.message}` }]); }
      setInitialLoading(false);
    };
    init();
  }, [company.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const newMessages: AIMessage[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try { await streamBriefing(newMessages); } catch { setMessages(prev => [...prev, { role: "assistant", content: "Error de conexión." }]); }
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)",
    }}>
      <div style={{
        width: "min(680px, 95vw)", height: "80vh",
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 16, display: "flex", flexDirection: "column",
        boxShadow: `0 0 60px ${T.accent}22, 0 24px 80px #00000088`, overflow: "hidden",
      }}>
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${T.border}`,
          background: `linear-gradient(90deg, ${T.cardAlt} 0%, ${T.sidebar} 100%)`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentLight})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, boxShadow: `0 0 20px ${T.accent}66`,
            }}>⚡</div>
            <div>
              <div style={{ color: T.textPrimary, fontWeight: 800, fontSize: 14, fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>
                NEXUS AI — {company.name}
              </div>
              <div style={{ color: T.textMuted, fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: 2 }}>
                INTELIGENCIA COMERCIAL
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: `1px solid ${T.border}`, color: T.textTertiary,
            borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13,
            fontFamily: "'Space Mono', monospace",
          }}>✕ CERRAR</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {initialLoading && messages.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", border: `3px solid ${T.accent}33`, borderTopColor: T.accent, animation: "nexus-spin 1s linear infinite" }} />
              <span style={{ color: T.textMuted, fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: 2 }}>ANALIZANDO EMPRESA...</span>
            </div>
          ) : messages.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 12, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: m.role === "user" ? T.border : `linear-gradient(135deg, ${T.accent}, ${T.accentLight})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, boxShadow: m.role !== "user" ? `0 0 12px ${T.accent}44` : "none",
              }}>{m.role === "user" ? "👤" : "⚡"}</div>
              <div style={{
                maxWidth: "78%", padding: "12px 16px", borderRadius: 12,
                background: m.role === "user" ? T.cardHover : T.cardAlt,
                border: `1px solid ${T.border}`,
                color: m.role === "user" ? T.textSecondary : T.textPrimary,
                fontSize: 13, lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", whiteSpace: "pre-wrap",
              }}>{m.content}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}, ${T.accentLight})`, display: "flex", alignItems: "center", justifyContent: "center" }}>⚡</div>
              <div style={{ padding: "12px 16px", borderRadius: 12, background: T.cardAlt, border: `1px solid ${T.border}`, display: "flex", gap: 6, alignItems: "center" }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, animation: `nexus-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Pregunta algo al briefing..."
            style={{ flex: 1, background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.textPrimary, fontSize: 13, outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
          <button onClick={send} disabled={loading || !input.trim()} style={{
            padding: "10px 18px", background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
            border: "none", borderRadius: 10, color: "#fff", fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer", fontSize: 13,
            fontFamily: "'Space Mono', monospace", opacity: loading || !input.trim() ? 0.5 : 1,
            boxShadow: `0 0 20px ${T.accent}44`,
          }}>→</button>
        </div>
      </div>
      <style>{`@keyframes nexus-spin { to { transform: rotate(360deg); } } @keyframes nexus-pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
    </div>
  );
}

// ─── Interaction Registry ───────────────────────────────────────────────
function InteractionRegistry({
  company, interactions, onUpdate,
}: {
  company: Company;
  interactions: InteractionsMap;
  onUpdate: (newMap: InteractionsMap) => void;
}) {
  const data = getInteraction(interactions, company.id);
  const [noteText, setNoteText] = useState("");
  const [manualDate, setManualDate] = useState(data.proximoContacto || "");
  const [deleteNoteIdx, setDeleteNoteIdx] = useState<number | null>(null);

  useEffect(() => { setManualDate(data.proximoContacto || ""); }, [company.id, data.proximoContacto]);

  const update = useCallback((patch: Partial<InteractionData>) => {
    const current = getInteraction(interactions, company.id);
    const next = { ...interactions, [company.id]: { ...current, ...patch } };
    onUpdate(next);
  }, [company.id, interactions, onUpdate]);

  const handleEstado = async (estado: string) => {
    update({ estado });
    // Sync estado to Supabase leads table
    try {
      const { data: { user } } = await getEffectiveUser();
      if (!user) return;
      // Check if lead exists
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', company.id)
        .maybeSingle();
      if (existing) {
        await supabase.from('leads').update({ estado }).eq('id', existing.id);
      } else {
        // Crear oportunidad: pedir datos obligatorios
        const fields = await requestOpportunityFields({ companyId: company.id, lockClient: true });
        if (!fields) return;
        const { error: insErr } = await (supabase as any).from('leads').insert({
          ...fields,
          company_id: company.id,
          empresa: company.name,
          cif: company.cif || null,
          sector: company.sector,
          tamano: company.employees,
          opportunity_score: company.opportunityScore,
          servicios_recomendados: company.recommendedProducts || [],
          necesidades_detectadas: company.detectedNeeds || [],
          estado,
          user_id: user.id,
          next_action: company.nextBestAction?.type || 'call',
        });
        if (insErr) throw insErr;
      }
      // Invalidate leads query
      refreshLeads();
    } catch (e) {
      console.error('Error syncing estado to leads:', e);
    }
  };

  const handleContactadoHoy = () => {
    const now = new Date().toISOString();
    const patch: Partial<InteractionData> = {
      contactadoHoy: true,
      ultimoContacto: now,
    };
    if (data.estado === "lead") patch.estado = "contactado";
    update(patch);
  };

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    const nota: Nota = { fecha: new Date().toISOString().slice(0, 10), texto: noteText.trim() };
    update({ notas: [nota, ...data.notas] });
    setNoteText("");
  };

  const handleNextContact = (dateStr: string) => {
    setManualDate(dateStr);
    update({ proximoContacto: dateStr });
  };

  const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...mono, fontSize: 9, color: T.textLabel, letterSpacing: 3 }}>// REGISTRO</div>

      {/* Estado */}
      <div>
        <div style={{ ...mono, fontSize: 9, color: T.textTertiary, letterSpacing: 2, marginBottom: 8 }}>ESTADO DEL CLIENTE</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ESTADOS.map(e => (
            <button key={e.id} onClick={() => handleEstado(e.id)} style={{
              padding: "5px 10px", borderRadius: 6, cursor: "pointer",
              background: data.estado === e.id ? `${e.color}22` : "transparent",
              border: `1px solid ${data.estado === e.id ? e.color : T.borderSubtle}`,
              color: data.estado === e.id ? e.color : T.textTertiary,
              ...mono, fontSize: 9, letterSpacing: 1, transition: "all 0.15s",
            }}>{e.label}</button>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div>
        <div style={{ ...mono, fontSize: 9, color: T.textTertiary, letterSpacing: 2, marginBottom: 8 }}>CHECKLIST DE HOY</div>
        <button onClick={handleContactadoHoy} disabled={data.contactadoHoy} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px", borderRadius: 8, cursor: data.contactadoHoy ? "default" : "pointer",
          background: data.contactadoHoy ? "#22c55e18" : T.card,
          border: `1px solid ${data.contactadoHoy ? "#22c55e44" : T.borderSubtle}`,
          color: data.contactadoHoy ? "#22c55e" : T.textTertiary,
          ...mono, fontSize: 10, letterSpacing: 1, transition: "all 0.15s", width: "100%",
        }}>
          <span style={{
            width: 16, height: 16, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${data.contactadoHoy ? "#22c55e" : T.border}`,
            background: data.contactadoHoy ? "#22c55e" : "transparent",
            color: "#fff", fontSize: 10,
          }}>{data.contactadoHoy ? "✓" : ""}</span>
          Contactado hoy ✓
        </button>
        {data.ultimoContacto && (
          <div style={{ ...mono, fontSize: 9, color: T.textTertiary, marginTop: 6 }}>
            Último contacto: {new Date(data.ultimoContacto).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      {/* Actividad y seguimiento */}
      <ActivitySection
        companyId={company.id}
        onNextActionDate={(date) => {
          const current = data.proximoContacto;
          if (!current || new Date(date) > new Date(current)) {
            setManualDate(date);
            update({ proximoContacto: date });
          }
        }}
      />

      {/* Nota rápida */}
      <div>
        <div style={{ ...mono, fontSize: 9, color: T.textTertiary, letterSpacing: 2, marginBottom: 8 }}>NOTA RÁPIDA</div>

        <textarea
          value={noteText} onChange={e => setNoteText(e.target.value)}
          placeholder="¿Qué pasó? Escribe aquí..."
          rows={3}
          style={{
            width: "100%", background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 8,
            padding: "8px 12px", color: T.textSecondary, fontSize: 12, outline: "none", resize: "none",
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <button onClick={handleSaveNote} disabled={!noteText.trim()} style={{
          marginTop: 6, padding: "6px 14px", borderRadius: 6, cursor: noteText.trim() ? "pointer" : "not-allowed",
          background: noteText.trim() ? T.accent : T.card,
          border: `1px solid ${noteText.trim() ? T.accent : T.borderSubtle}`,
          color: "#fff", ...mono, fontSize: 9, letterSpacing: 1, opacity: noteText.trim() ? 1 : 0.4,
          transition: "all 0.15s",
        }}>GUARDAR NOTA</button>
        {data.notas.map((n, i) => (
          <div key={i} style={{ marginTop: 6, fontSize: 11, color: T.textTertiary, lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 6 }}>
            <div style={{ flex: 1 }}>
              <span style={{ ...mono, fontSize: 9, color: T.textLabel }}>{n.fecha}</span> — {n.texto}
            </div>
            <button
              onClick={() => setDeleteNoteIdx(i)}
              style={{
                background: "none", border: "none", color: T.textMuted, cursor: "pointer",
                fontSize: 12, padding: "0 2px", flexShrink: 0, lineHeight: 1,
              }}
              title="Eliminar nota"
            >✕</button>
          </div>
        ))}

        {/* Confirmation dialog for note deletion */}
        {deleteNoteIdx !== null && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)",
          }}>
            <div style={{
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
              padding: "24px 28px", maxWidth: 360, width: "90%",
              boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, color: T.textPrimary, letterSpacing: 1, marginBottom: 10 }}>
                ¿Eliminar esta nota?
              </div>
              <p style={{ fontSize: 12, color: T.textTertiary, marginBottom: 18, lineHeight: 1.5 }}>
                Esta acción no se puede deshacer.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setDeleteNoteIdx(null)} style={{
                  padding: "7px 16px", borderRadius: 6, cursor: "pointer",
                  background: "none", border: `1px solid ${T.borderSubtle}`, color: T.textTertiary,
                  fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 1,
                }}>CANCELAR</button>
                <button onClick={() => {
                  const updated = [...data.notas];
                  updated.splice(deleteNoteIdx, 1);
                  update({ notas: updated });
                  setDeleteNoteIdx(null);
                }} style={{
                  padding: "7px 16px", borderRadius: 6, cursor: "pointer",
                  background: "#ef4444", border: "none", color: "#fff",
                  fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1,
                }}>ELIMINAR</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Próximo contacto */}
      <div>
        <div style={{ ...mono, fontSize: 9, color: T.textTertiary, letterSpacing: 2, marginBottom: 8 }}>PRÓXIMO CONTACTO</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {[
            { label: "MAÑANA", days: 1 },
            { label: "EN 3 DÍAS", days: 3 },
            { label: "SEMANA QUE VIENE", days: 7 },
          ].map(opt => (
            <button key={opt.label} onClick={() => handleNextContact(addDays(opt.days))} style={{
              padding: "5px 10px", borderRadius: 6, cursor: "pointer",
              background: T.card, border: `1px solid ${T.borderSubtle}`,
              color: T.textTertiary, ...mono, fontSize: 9, letterSpacing: 1,
              transition: "all 0.15s",
            }}>{opt.label}</button>
          ))}
        </div>
        <input type="date" value={manualDate} onChange={e => handleNextContact(e.target.value)} style={{
          background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 6,
          padding: "6px 10px", color: T.textSecondary, fontSize: 11, outline: "none",
          fontFamily: "'DM Sans', sans-serif", colorScheme: "var(--t-color-scheme)",
        }} />
        {data.proximoContacto && (
          <div style={{ ...mono, fontSize: 9, color: "#f97316", marginTop: 6 }}>
            Programado: {new Date(data.proximoContacto).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Briefing Company Picker ────────────────────────────────────────────
function BriefingCompanyPicker({ companies, onPick }: { companies: Company[]; onPick: (c: Company) => void }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = query.length === 0
    ? companies.slice(0, 30)
    : companies.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.sector?.toLowerCase().includes(query) ||
        c.address?.toLowerCase().includes(query) ||
        (c as any).cif?.toLowerCase?.().includes(query)
      ).slice(0, 50);

  return (
    <div style={{ padding: "32px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>⬡</div>
        <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: T.textSecondary, letterSpacing: 2, marginBottom: 6 }}>
          BRIEFING DIARIO
        </h2>
        <p style={{ color: T.textMuted, fontSize: 12 }}>
          Busca y selecciona una empresa para abrir su ficha.
        </p>
      </div>
      <input
        autoFocus
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Buscar empresa por nombre, sector, dirección o CIF…"
        style={{
          width: "100%", background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 10, padding: "12px 14px", color: T.textPrimary,
          fontSize: 13, outline: "none", fontFamily: "'DM Sans', sans-serif",
          marginBottom: 14,
        }}
      />
      <div style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 10, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: T.textMuted, fontSize: 12 }}>
            Sin coincidencias.
          </div>
        ) : filtered.map(c => (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            className="nexus-company-row"
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", background: "transparent",
              border: "none", borderBottom: `1px solid ${T.borderSubtle}`,
              color: T.textPrimary, cursor: "pointer", textAlign: "left",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span style={{ fontSize: 16 }}>{sectorIcons[c.sector ?? ""] ?? "🏢"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.name}
              </div>
              <div style={{ fontSize: 10, color: T.textMuted, fontFamily: "'Space Mono', monospace", letterSpacing: 0.5 }}>
                {(c.sector ?? "—").toUpperCase()} · {c.address ?? ""}
              </div>
            </div>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: T.textTertiary }}>
              {c.opportunityScore ?? "—"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────

export default function NexusDashboard() {
  const location = useLocation();
  const { companies } = useCompanies();
  const [selected, setSelected] = useState<Company | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [interactions, setInteractions] = useState<InteractionsMap>(loadInteractions);
  const navigate = useNavigate();
  // La vista activa sale de la URL (/clientes, /informes, /agenda…), no de eventos globales.
  const nexusView: NexusView = nexusViewFromPath(location.pathname) ?? 'hoy';
  const setNexusView = useCallback((v: NexusView) => {
    if (NEXUS_VIEW_PATHS[v] !== location.pathname) navigate(NEXUS_VIEW_PATHS[v]);
  }, [navigate, location.pathname]);

  // Ficha abierta = /briefing?company=<id>. Sobrevive a F5 y al botón atrás.
  // Compatibilidad: navegación antigua con state { companyId } (p. ej. desde Pipeline).
  useEffect(() => {
    const state = location.state as { companyId?: string } | null;
    if (state?.companyId) {
      navigate(`${NEXUS_VIEW_PATHS.briefing}?company=${encodeURIComponent(state.companyId)}`, { replace: true });
    }
  }, [location.state, navigate]);

  const urlCompanyId = new URLSearchParams(location.search).get('company');
  useEffect(() => {
    if (nexusView !== 'briefing' || !urlCompanyId) return;
    if (selected?.id === urlCompanyId) return;
    const comp = companies.find(c => c.id === urlCompanyId);
    if (comp) setSelected(comp);
  }, [nexusView, urlCompanyId, companies, selected?.id]);

  const openBriefing = useCallback((c: Company) => {
    setSelected(c);
    navigate(`${NEXUS_VIEW_PATHS.briefing}?company=${encodeURIComponent(c.id)}`);
  }, [navigate]);

  // Sync `selected` with refreshed companies (after edits trigger refetch)
  useEffect(() => {
    if (!selected) return;
    const fresh = companies.find(c => c.id === selected.id);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [companies, selected]);



  const handleInteractionUpdate = useCallback((newMap: InteractionsMap) => {
    setInteractions(newMap);
    saveInteractions(newMap);
  }, []);

  const openArcGIS = (company: Company) => {
    window.open(`${ARCGIS_BASE}?address=${encodeURIComponent(company.address)}`, "_blank");
  };


  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'DM Sans', sans-serif", color: T.textPrimary, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50 }}>
        <Header />
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;700;800&display=swap');
        .nexus-page * { box-sizing: border-box; }
        .nexus-page ::-webkit-scrollbar { width: 4px; } .nexus-page ::-webkit-scrollbar-track { background: ${T.card}; } .nexus-page ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
        @keyframes nexusFadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes nexusGlowPulse { 0%,100% { box-shadow: 0 0 20px ${T.accent}33; } 50% { box-shadow: 0 0 40px ${T.accent}66; } }
        .nexus-company-row:hover { background: ${T.cardHover} !important; border-color: ${T.border} !important; }
        .nexus-action-btn:hover { transform: translateY(-1px); filter: brightness(1.15); }
      `}</style>

      <div className="nexus-page">
        {/* Top bar removed — date & status now in Header navbar */}

        {/* Sub-row tabs removed — navigation lives in the global header */}


        {nexusView === 'hoy' ? (
          <div style={{ maxWidth: 1280, margin: "0 auto" }} className="px-4 md:px-6 pt-3 pb-24 md:pb-7">
            <HoyTab onCompanySelect={openBriefing} />
          </div>
        ) : nexusView === 'clientes' ? (
          <div style={{ maxWidth: 1280, margin: "0 auto" }} className="px-4 md:px-6 pt-3 pb-24 md:pb-7">
            <ClientesTab onCompanySelect={openBriefing} />
          </div>
        ) : nexusView === 'archivo' ? (
          <div style={{ maxWidth: 1280, margin: "0 auto" }} className="px-4 md:px-6 pt-3 pb-24 md:pb-7">
            <ArchivoTab onCompanySelect={openBriefing} />
          </div>
        ) : nexusView === 'informes' ? (
          <div style={{ maxWidth: 1280, margin: "0 auto" }} className="px-4 md:px-6 pt-3 pb-24 md:pb-7">
            <InformesTab onCompanySelect={openBriefing} />
          </div>
        ) : nexusView === 'agenda' ? (
          <div style={{ maxWidth: 1280, margin: "0 auto" }} className="px-4 md:px-6 pt-3 pb-24 md:pb-7">
            <AgendaTab onCompanySelect={openBriefing} />
          </div>
        ) : (

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>
          {selected ? (
            <div style={{ animation: "nexusFadeUp 0.4s ease both" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
                padding: "10px 14px", background: T.card, borderRadius: 10, border: `1px solid ${T.borderSubtle}`,
              }}>
                <button onClick={() => { setSelected(null); setNexusView('clientes'); }} style={{
                  background: "none", border: `1px solid ${T.border}`, borderRadius: 6,
                  padding: "4px 10px", color: T.textTertiary, cursor: "pointer",
                  fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 1,
                }}>← VOLVER A CLIENTES</button>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: T.textLabel, letterSpacing: 1 }}>
                  ⬡ NEXUS / BRIEFING / <span style={{ color: T.textMuted }}>{selected.name.toUpperCase()}</span>
                </div>
              </div>
              <DetailPanel company={selected} interactions={interactions} onUpdate={handleInteractionUpdate} onShowAI={() => setShowAI(true)} onOpenArcGIS={openArcGIS} />
            </div>
          ) : (
            <BriefingCompanyPicker companies={companies} onPick={(c) => setSelected(c)} />
          )}

        </div>
        )}
      </div>

      {showAI && selected && <AIBriefing company={selected} onClose={() => setShowAI(false)} />}
    </div>
  );
}

// ─── Editable Tag List ──────────────────────────────────────────────────
function EditableTagList({
  items, onSave, dotColor, label, emoji,
}: {
  items: string[];
  onSave: (items: string[]) => void;
  dotColor: string;
  label: string;
  emoji?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(items);
  const [newItem, setNewItem] = useState("");
  const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace" };

  useEffect(() => { setDraft(items); }, [items]);

  const save = () => {
    onSave(draft);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div style={{ ...mono, fontSize: 9, color: T.textLabel, letterSpacing: 3 }}>// {label}</div>
          <button onClick={() => setEditing(true)} style={{
            background: "none", border: "none", cursor: "pointer", fontSize: 11, color: T.textMuted, padding: 0,
          }} title="Editar">✏️</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((n, i) => (
            <div key={i} style={{ fontSize: 12, color: T.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
              {emoji ? <span>{emoji}</span> : <div style={{ width: 4, height: 4, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />}{n}
            </div>
          ))}
          {items.length === 0 && <div style={{ fontSize: 11, color: T.textMuted, fontStyle: "italic" }}>Sin datos</div>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <div style={{ ...mono, fontSize: 9, color: T.accent, letterSpacing: 3 }}>// {label} (editando)</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {draft.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              value={item}
              onChange={e => { const d = [...draft]; d[i] = e.target.value; setDraft(d); }}
              style={{
                flex: 1, background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 6,
                padding: "4px 8px", color: T.textSecondary, fontSize: 12, outline: "none",
              }}
            />
            <button onClick={() => setDraft(draft.filter((_, j) => j !== i))} style={{
              background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14, padding: 0,
            }}>✕</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            placeholder="Añadir..."
            onKeyDown={e => {
              if (e.key === "Enter" && newItem.trim()) {
                setDraft([...draft, newItem.trim()]);
                setNewItem("");
              }
            }}
            style={{
              flex: 1, background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 6,
              padding: "4px 8px", color: T.textSecondary, fontSize: 12, outline: "none",
            }}
          />
          <button onClick={() => {
            if (newItem.trim()) { setDraft([...draft, newItem.trim()]); setNewItem(""); }
          }} style={{
            background: T.accent, border: "none", borderRadius: 6, color: "#fff",
            padding: "4px 10px", cursor: "pointer", fontSize: 11, ...mono,
          }}>+</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button onClick={save} style={{
            background: T.accent, border: "none", borderRadius: 6, color: "#fff",
            padding: "5px 14px", cursor: "pointer", fontSize: 10, ...mono, letterSpacing: 1,
          }}>GUARDAR</button>
          <button onClick={() => { setDraft(items); setEditing(false); }} style={{
            background: "none", border: `1px solid ${T.borderSubtle}`, borderRadius: 6, color: T.textTertiary,
            padding: "5px 14px", cursor: "pointer", fontSize: 10, ...mono, letterSpacing: 1,
          }}>CANCELAR</button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel Component ─────────────────────────────────────────────
function DetailPanel({
  company: selected,
  interactions,
  onUpdate,
  onShowAI,
  onOpenArcGIS,
}: {
  company: Company;
  interactions: InteractionsMap;
  onUpdate: (m: InteractionsMap) => void;
  onShowAI: () => void;
  onOpenArcGIS: (c: Company) => void;
}) {
  const [editingDM, setEditingDM] = useState(false);
  const [dmDraft, setDmDraft] = useState<DecisionMaker[]>(selected.decisionMakers || []);
  const [saving, setSaving] = useState(false);
  const [editingRent, setEditingRent] = useState(false);
  const [rentDraft, setRentDraft] = useState<string>(selected.rentabilidadLinea != null ? String(selected.rentabilidadLinea) : '');
  const [isHot, setIsHot] = useState(selected.isHot || false);
  const [showReport, setShowReport] = useState(false);
  const selectedActionType = getSafeActionType(selected.nextBestAction);
  const selectedActionPriority = getSafePriority(selected.nextBestAction);

  useEffect(() => {
    setDmDraft(selected.decisionMakers || []);
    setEditingDM(false);
    setRentDraft(selected.rentabilidadLinea != null ? String(selected.rentabilidadLinea) : '');
    setEditingRent(false);
    setIsHot(selected.isHot || false);
  }, [selected.id]);

  const saveRentabilidad = async () => {
    const num = parseFloat(rentDraft);
    if (rentDraft.trim() !== '' && isNaN(num)) {
      toast.error('Valor no válido');
      return;
    }
    await persistField('rentabilidad_linea', rentDraft.trim() === '' ? null : num);
    setEditingRent(false);
  };

  const persistField = async (field: string, value: any) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('companies').update({ [field]: value }).eq('id', selected.id);
      if (error) throw error;
      toast.success("Actualizado en base de datos");
      refreshCompanies();
    } catch (e: any) {
      console.error("Update error:", e);
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const toggleHot = async () => {
    const newVal = !isHot;
    setIsHot(newVal);
    await persistField('is_hot', newVal);
  };

  const saveDMs = async () => {
    const mapped = dmDraft.map((dm: any) => ({
      name: dm.name || dm.role,
      role: dm.role,
      mobile: dm.mobile || '',
      email: dm.email || '',
      linkedin_url: dm.linkedin_url || '',
      decisionPower: dm.decisionPower,
      accessibility: dm.accessibility,
      contactChannel: dm.contactChannel,
      source: dm.source || 'manual',
      principal: !!dm.principal,
    }));
    await persistField('decision_makers', mapped);
    setDmDraft(mapped as any);
    setEditingDM(false);
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 16, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "20px 24px", background: `linear-gradient(135deg, ${T.cardAlt} 0%, ${T.sidebar} 100%)`,
        borderBottom: `1px solid ${T.borderSubtle}`, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${sectorColors[selected.sector] || T.accent}, transparent)` }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 24 }}>{sectorIcons[selected.sector] || "🏢"}</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: T.textPrimary, lineHeight: 1.2 }}>{selected.name}</h2>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, padding: "2px 8px", borderRadius: 6, background: T.cardAlt, border: `1px solid ${T.borderSubtle}`, color: T.textSecondary, letterSpacing: 1 }}>
                    CIF: {selected.cif || '—'}
                  </span>
                  {/* Mini cluster: hot · score · digitalización · rentabilidad */}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 999, background: T.cardAlt, border: `1px solid ${T.borderSubtle}` }}>
                    <button
                      onClick={toggleHot}
                      title={isHot ? "Quitar de calientes" : "Marcar como caliente"}
                      style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", fontSize: 13, lineHeight: 1, filter: isHot ? "none" : "grayscale(1) opacity(0.4)" }}
                    >🔥</button>
                    {(() => {
                      const s = selected.opportunityScore;
                      const c = s >= 80 ? "#ef4444" : s >= 60 ? "#f59e0b" : "#6b7280";
                      return (
                        <span title={`Score ${s}`} style={{ width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${c}`, color: c, fontFamily: "'Space Mono', monospace", fontWeight: 800, fontSize: 10, lineHeight: 1 }}>{s}</span>
                      );
                    })()}
                    {(() => {
                      const lvl = selected.digitalizationLevel || 'medio';
                      const bars = lvl === 'alto' ? 3 : lvl === 'medio' ? 2 : 1;
                      const color = lvl === 'alto' ? "#22c55e" : lvl === 'medio' ? "#f59e0b" : "#6b7280";
                      const label = lvl === 'alto' ? 'Digitalización alta' : lvl === 'medio' ? 'Digitalización media' : 'Digitalización baja';
                      return (
                        <span title={label} style={{ display: "inline-flex", alignItems: "flex-end", gap: 1.5, height: 13 }}>
                          {[4, 8, 12].map((h, i) => (
                            <span key={i} style={{ width: 3, height: h, borderRadius: 1, background: i < bars ? color : T.borderSubtle }} />
                          ))}
                        </span>
                      );
                    })()}
                    {editingRent ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <input
                          value={rentDraft}
                          onChange={e => setRentDraft(e.target.value)}
                          placeholder="0"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveRentabilidad(); if (e.key === 'Escape') setEditingRent(false); }}
                          style={{ width: 44, background: T.card, border: `1px solid ${T.border}`, borderRadius: 4, padding: "1px 4px", color: T.textSecondary, fontSize: 11, fontWeight: 700, outline: "none", fontFamily: "'Space Mono', monospace" }}
                        />
                        <button onClick={saveRentabilidad} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#22c55e", padding: 0 }}>✓</button>
                        <button onClick={() => setEditingRent(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#ef4444", padding: 0 }}>✕</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setEditingRent(true)}
                        title="Rentabilidad por línea"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, color: selected.rentabilidadLinea != null ? "#22c55e" : T.textMuted, lineHeight: 1 }}
                      >
                        {selected.rentabilidadLinea != null ? `${selected.rentabilidadLinea}€` : '—€'}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: T.textLabel, letterSpacing: 2, marginTop: 4 }}>
                  {selected.sector?.toUpperCase()} · {(selected.locationType || '').toUpperCase()} · {(selected.location || '').toUpperCase()}
                </div>
              </div>
            </div>
            {/* Resumen fijo NO editable: dirección principal (sede ⭐) + contacto principal (⭐) */}
            <div style={{ marginTop: 12 }}>
              <CompanyTopSummary company={selected} />
            </div>
            
            {/* Big call button - mobile */}
            {(() => {
              const tel = (selected.contactInfo as any)?.telefono || selected.contactInfo?.phone || '';
              return tel ? (
                <a href={`tel:${tel}`} className="md:hidden flex items-center justify-center gap-2 mt-3 w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-base no-underline active:opacity-80 transition-opacity" style={{ textDecoration: 'none' }}>
                  📞 LLAMAR AHORA — {tel}
                </a>
              ) : null;
            })()}
          </div>
        </div>
      </div>


      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
        {saving && (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: T.accent, letterSpacing: 2, textAlign: "center" }}>GUARDANDO...</div>
        )}

        {/* Recommended action */}
        <div style={{
          background: `${priorityColors[selectedActionPriority]}12`,
          border: `1px solid ${priorityColors[selectedActionPriority]}33`,
          borderRadius: 12, padding: "14px 16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{actionIcons[selectedActionType]}</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700, color: priorityColors[selectedActionPriority], letterSpacing: 2 }}>
              ACCIÓN RECOMENDADA — {selectedActionType.toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>{selected.nextBestAction?.reason || "Sin recomendación disponible"}</p>
        </div>

        {/* Bloque editable unificado: identidad, dirección, sedes, perfil y venta del trimestre */}
        <BriefingEditableBlock company={selected} />


        {/* Decision makers — editable */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: T.textLabel, letterSpacing: 3 }}>// DECISORES</div>
            <button onClick={() => setEditingDM(!editingDM)} style={{
              background: "none", border: "none", cursor: "pointer", fontSize: 11, color: T.textMuted, padding: 0,
            }} title="Editar decisores">✏️</button>
          </div>

          {!editingDM ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dmDraft.map((dm: any, i: number) => (
                <div key={i} style={{
                  background: T.card, borderRadius: 10, padding: "10px 14px",
                  border: `1px solid ${dm.principal ? '#f59e0b66' : T.borderSubtle}`,
                  display: "flex", flexDirection: "column", gap: 4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        onClick={async () => {
                          const next = dmDraft.map((d: any, j: number) => ({ ...d, principal: j === i }));
                          setDmDraft(next as any);
                          await persistField('decision_makers', next);
                        }}
                        title={dm.principal ? 'Contacto principal' : 'Marcar como principal'}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          fontSize: 14, color: dm.principal ? '#f59e0b' : T.textMuted,
                        }}
                      >{dm.principal ? '★' : '☆'}</button>
                      <div style={{ fontWeight: 700, fontSize: 13, color: T.textPrimary }}>{dm.name || dm.role}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{
                        padding: "3px 8px", borderRadius: 6, fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                        background: `${powerColors[dm.decisionPower]}18`, border: `1px solid ${powerColors[dm.decisionPower]}44`,
                        color: powerColors[dm.decisionPower],
                      }}>⚡ {dm.decisionPower?.toUpperCase()}</span>
                      <span style={{
                        padding: "3px 8px", borderRadius: 6, fontSize: 9, fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                        background: `${accessColors[dm.accessibility]}18`, border: `1px solid ${accessColors[dm.accessibility]}44`,
                        color: accessColors[dm.accessibility],
                      }}>🔓 {dm.accessibility?.toUpperCase()}</span>
                    </div>
                  </div>
                  {dm.role && (
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: T.textMuted }}>
                      {dm.role}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: T.textTertiary }}>
                    {dm.mobile && (
                      <a href={`tel:${dm.mobile.replace(/\s/g, '')}`} style={{ color: "#22c55e", textDecoration: "none" }}>
                        📱 {dm.mobile}
                      </a>
                    )}
                    {dm.email && (
                      <a href={`mailto:${dm.email}`} style={{ color: T.accentLight, textDecoration: "none" }}>
                        ✉️ {dm.email}
                      </a>
                    )}
                  </div>
                  {dm.linkedin_url && dm.linkedin_url.trim() !== '' && (
                    <button
                      onClick={() => window.open(dm.linkedin_url.startsWith('http') ? dm.linkedin_url : `https://${dm.linkedin_url}`, '_blank')}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start",
                        padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                        background: "#0077b518", border: "1px solid #0077b544", color: "#0077b5",
                        fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: 1,
                        transition: "all 0.15s",
                      }}
                    >🔗 VER LINKEDIN</button>
                  )}
                </div>
              ))}
              {dmDraft.length === 0 && (
                <div style={{ fontSize: 11, color: T.textMuted, fontStyle: "italic" }}>Sin decisores registrados</div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dmDraft.map((dm, i) => (
                <div key={i} style={{
                  background: T.card, borderRadius: 10, padding: "10px 14px", border: `1px solid ${T.accent}44`,
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      value={dm.name || ''}
                      onChange={e => { const d = [...dmDraft]; d[i] = { ...d[i], name: e.target.value }; setDmDraft(d); }}
                      placeholder="Nombre"
                      style={{ flex: 1, background: T.cardAlt, border: `1px solid ${T.borderSubtle}`, borderRadius: 6, padding: "4px 8px", color: T.textSecondary, fontSize: 12, outline: "none" }}
                    />
                    <input
                      value={dm.role}
                      onChange={e => { const d = [...dmDraft]; d[i] = { ...d[i], role: e.target.value }; setDmDraft(d); }}
                      placeholder="Rol / Cargo"
                      style={{ flex: 1, background: T.cardAlt, border: `1px solid ${T.borderSubtle}`, borderRadius: 6, padding: "4px 8px", color: T.textSecondary, fontSize: 12, outline: "none" }}
                    />
                    <button onClick={() => setDmDraft(dmDraft.filter((_, j) => j !== i))} style={{
                      background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14, padding: 0,
                    }}>✕</button>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={dm.mobile || ''}
                      onChange={e => { const d = [...dmDraft]; d[i] = { ...d[i], mobile: e.target.value }; setDmDraft(d); }}
                      placeholder="📱 Móvil"
                      style={{ flex: 1, background: T.cardAlt, border: `1px solid ${T.borderSubtle}`, borderRadius: 6, padding: "4px 8px", color: T.textSecondary, fontSize: 11, outline: "none" }}
                    />
                    <input
                      value={dm.email || ''}
                      onChange={e => { const d = [...dmDraft]; d[i] = { ...d[i], email: e.target.value }; setDmDraft(d); }}
                      placeholder="✉️ Email"
                      style={{ flex: 1, background: T.cardAlt, border: `1px solid ${T.borderSubtle}`, borderRadius: 6, padding: "4px 8px", color: T.textSecondary, fontSize: 11, outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={dm.linkedin_url || ''}
                      onChange={e => { const d = [...dmDraft]; d[i] = { ...d[i], linkedin_url: e.target.value }; setDmDraft(d); }}
                      placeholder="🔗 URL LinkedIn (pegar enlace)"
                      style={{ flex: 1, background: T.cardAlt, border: `1px solid ${T.borderSubtle}`, borderRadius: 6, padding: "4px 8px", color: T.textSecondary, fontSize: 11, outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select
                      value={dm.decisionPower}
                      onChange={e => { const d = [...dmDraft]; d[i] = { ...d[i], decisionPower: e.target.value as any }; setDmDraft(d); }}
                      style={{ background: T.cardAlt, border: `1px solid ${T.borderSubtle}`, borderRadius: 6, padding: "4px 6px", color: T.textSecondary, fontSize: 11, outline: "none" }}
                    >
                      <option value="alto">⚡ Alto</option>
                      <option value="medio">⚡ Medio</option>
                      <option value="bajo">⚡ Bajo</option>
                    </select>
                    <select
                      value={dm.accessibility}
                      onChange={e => { const d = [...dmDraft]; d[i] = { ...d[i], accessibility: e.target.value as any }; setDmDraft(d); }}
                      style={{ background: T.cardAlt, border: `1px solid ${T.borderSubtle}`, borderRadius: 6, padding: "4px 6px", color: T.textSecondary, fontSize: 11, outline: "none" }}
                    >
                      <option value="facil">🔓 Fácil</option>
                      <option value="medio">🔓 Medio</option>
                      <option value="dificil">🔓 Difícil</option>
                    </select>
                  </div>
                </div>
              ))}
              <button onClick={() => setDmDraft([...dmDraft, { name: '', role: '', mobile: '', email: '', linkedin_url: '', decisionPower: 'medio', accessibility: 'medio', contactChannel: 'email', source: 'manual' } as any])} style={{
                background: T.cardAlt, border: `1px dashed ${T.border}`, borderRadius: 8, padding: "8px",
                color: T.textTertiary, cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono', monospace",
              }}>+ AÑADIR DECISOR</button>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={saveDMs} style={{
                  background: T.accent, border: "none", borderRadius: 6, color: "#fff",
                  padding: "6px 14px", cursor: "pointer", fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                }}>GUARDAR</button>
                <button onClick={() => { setDmDraft(selected.decisionMakers); setEditingDM(false); }} style={{
                  background: "none", border: `1px solid ${T.borderSubtle}`, borderRadius: 6, color: T.textTertiary,
                  padding: "6px 14px", cursor: "pointer", fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: 1,
                }}>CANCELAR</button>
              </div>
            </div>
          )}
        </div>

        {/* Needs + Products — editable */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <EditableTagList
            items={selected.detectedNeeds}
            label="NECESIDADES"
            dotColor="#ef4444"
            onSave={(items) => persistField('detected_needs', items)}
          />
          <EditableTagList
            items={selected.recommendedProducts}
            label="PRODUCTOS"
            dotColor="#22c55e"
            onSave={(items) => persistField('recommended_products', items)}
          />
        </div>

        {/* Growth signals — editable */}
        {(selected.growthSignals.length > 0 || true) && (
          <EditableTagList
            items={selected.growthSignals}
            label="SEÑALES DE CRECIMIENTO"
            dotColor="#22c55e"
            emoji="📈"
            onSave={(items) => persistField('growth_signals', items)}
          />
        )}

        {/* Quick action buttons: Llamar / Visitar / Caliente */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, paddingTop: 4 }}>
          <button className="nexus-action-btn" onClick={async () => {
            try {
              const { data: { user } } = await getEffectiveUser();
              if (!user) return;
              const today = new Date().toISOString().split('T')[0];
              const { data: existing } = await supabase.from('leads').select('id').eq('user_id', user.id).eq('company_id', selected.id).maybeSingle();
              if (existing) {
                await supabase.from('leads').update({ next_action: 'call', next_action_date: today }).eq('id', existing.id);
              } else {
                const fields = await requestOpportunityFields({ companyId: selected.id, lockClient: true });
                if (!fields) return;
                const { error: insErr } = await (supabase as any).from('leads').insert({
                  empresa: selected.name, cif: selected.cif || null,
                  sector: selected.sector, tamano: selected.employees, opportunity_score: selected.opportunityScore,
                  estado: 'contactado', next_action: 'call', next_action_date: today, user_id: user.id, ...fields,
                });
                if (insErr) throw insErr;
              }
              refreshLeads();
              toast.success('Marcado para llamar hoy');
            } catch (e) { console.error(e); toast.error('Error al marcar llamada'); }
          }} style={{
            padding: "14px", borderRadius: 12, background: "#3b82f622", border: "1px solid #3b82f644",
            color: "#3b82f6", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1, transition: "all 0.2s",
          }}>📞 LLAMAR</button>
          <button className="nexus-action-btn" onClick={async () => {
            try {
              const { data: { user } } = await getEffectiveUser();
              if (!user) return;
              const today = new Date().toISOString().split('T')[0];
              const { data: existing } = await supabase.from('leads').select('id').eq('user_id', user.id).eq('company_id', selected.id).maybeSingle();
              if (existing) {
                await supabase.from('leads').update({ next_action: 'visit', next_action_date: today }).eq('id', existing.id);
              } else {
                const fields = await requestOpportunityFields({ companyId: selected.id, lockClient: true });
                if (!fields) return;
                const { error: insErr } = await (supabase as any).from('leads').insert({
                  empresa: selected.name, cif: selected.cif || null,
                  sector: selected.sector, tamano: selected.employees, opportunity_score: selected.opportunityScore,
                  estado: 'contactado', next_action: 'visit', next_action_date: today, user_id: user.id, ...fields,
                });
                if (insErr) throw insErr;
              }
              refreshLeads();
              toast.success('Marcado para visitar hoy');
            } catch (e) { console.error(e); toast.error('Error al marcar visita'); }
          }} style={{
            padding: "14px", borderRadius: 12, background: "#f59e0b22", border: "1px solid #f59e0b44",
            color: "#f59e0b", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1, transition: "all 0.2s",
          }}>🚗 VISITAR</button>
          <button className="nexus-action-btn" onClick={toggleHot} style={{
            padding: "14px", borderRadius: 12,
            background: isHot ? "#ef444422" : T.cardAlt, border: `1px solid ${isHot ? "#ef4444" : T.border}`,
            color: isHot ? "#ef4444" : T.textTertiary, cursor: "pointer",
            fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1, transition: "all 0.2s",
          }}>🔥 {isHot ? 'CALIENTE' : 'MARCAR'}</button>
        </div>

        {/* More action buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          <button className="nexus-action-btn" onClick={onShowAI} style={{
            gridColumn: "1 / -1", padding: "14px", borderRadius: 12,
            background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
            border: "none", color: "#fff", cursor: "pointer",
            fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 2,
            transition: "all 0.2s", boxShadow: `0 0 30px ${T.accent}44`,
          }}>⚡ BRIEFING IA — PREPARAR VISITA</button>
          <button className="nexus-action-btn" onClick={() => onOpenArcGIS(selected)} style={{
            padding: "11px", borderRadius: 10, background: T.cardAlt, border: `1px solid ${T.border}`,
            color: T.textTertiary, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 1, transition: "all 0.2s",
          }}>🗺️ VER FIBRA</button>
          <button className="nexus-action-btn" onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(selected.address)}`, "_blank")} style={{
            padding: "11px", borderRadius: 10, background: T.cardAlt, border: `1px solid ${T.border}`,
            color: T.textTertiary, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 1, transition: "all 0.2s",
          }}>📍 MAPS</button>
          <button className="nexus-action-btn" onClick={() => selected.contactInfo?.email && window.open(`mailto:${selected.contactInfo.email}`, "_blank")} style={{
            padding: "11px", borderRadius: 10, background: T.cardAlt, border: `1px solid ${T.border}`,
            color: T.textTertiary, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 1, transition: "all 0.2s",
          }}>✉️ EMAIL</button>
          <button className="nexus-action-btn" onClick={() => setShowReport(true)} style={{
            gridColumn: "1 / -1", padding: "12px", borderRadius: 10, background: T.cardAlt,
            border: `1px solid ${T.accent}66`, color: T.accent, cursor: "pointer",
            fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 2, transition: "all 0.2s",
          }}>📄 INFORME RÁPIDO</button>
        </div>

        {showReport && (
          <QuickReportModal
            company={selected}
            estado={getInteraction(interactions, selected.id).estado}
            proximoContacto={getInteraction(interactions, selected.id).proximoContacto}
            ultimoContacto={getInteraction(interactions, selected.id).ultimoContacto}
            onClose={() => setShowReport(false)}
          />
        )}

        {/* Interaction Registry */}
        <InteractionRegistry company={selected} interactions={interactions} onUpdate={onUpdate} />
      </div>
    </div>
  );
}
