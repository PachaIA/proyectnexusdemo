import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nexus-chat`;

type Msg = { role: "user" | "assistant"; content: string };

async function searchNexus(query: string) {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .ilike("name", `%${query.replace(/\s+/g, "%")}%`)
      .limit(3);
    if (error || !data?.length) return null;
    return data[0];
  } catch {
    return null;
  }
}

async function streamChat({
  messages,
  nexusData,
  onDelta,
  onDone,
}: {
  messages: Msg[];
  nexusData: any;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, nexusData }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || `Error ${resp.status}`);
  }
  if (!resp.body) throw new Error("No response body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { /* partial */ }
    }
  }
  onDone();
}

const quickActions = [
  "Dame el speech de apertura para llamarles",
  "Redacta un email de primer contacto",
  "¿Qué producto les propongo primero?",
  "Están contentos con su operador actual. ¿Cómo lo rebato?",
  "¿Tienen permanencia activa en Nexus?",
];

const suggestions = [
  "ATARAZANA DREAMS MULTISERVICIOS SL",
  "Clínica dental zona industrial Málaga",
  "Despacho abogados 15 empleados",
];

export default function NexusChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [nexusData, setNexusData] = useState<any>(null);
  const [nexusStatus, setNexusStatus] = useState<"found" | "not_found" | null>(null);
  const [currentCompany, setCurrentCompany] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;
    if (!overrideText) setInput("");

    const userMsg: Msg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    let activeNexus = nexusData;

    if (messages.length === 0) {
      setNexusStatus(null);
      const found = await searchNexus(text);
      if (found) {
        setNexusData(found);
        setNexusStatus("found");
        setCurrentCompany(found.name);
        activeNexus = found;
      } else {
        setNexusData(null);
        setNexusStatus("not_found");
        setCurrentCompany(text);
        activeNexus = null;
      }
    }

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: newMessages,
        nexusData: activeNexus,
        onDelta: upsertAssistant,
        onDone: () => setLoading(false),
      });
    } catch (e: any) {
      toast.error(e.message || "Error al contactar el agente IA");
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ Error: ${e.message}` }]);
      setLoading(false);
    }

    inputRef.current?.focus();
  };

  const reset = () => {
    setMessages([]);
    setNexusData(null);
    setNexusStatus(null);
    setCurrentCompany(null);
    setInput("");
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-destructive" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate">Nexus · Agente Comercial</h1>
              {currentCompany && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground truncate">{currentCompany}</span>
                  {nexusStatus === "found" && (
                    <span className="text-emerald-500 font-medium text-[10px]">● NEXUS</span>
                  )}
                  {nexusStatus === "not_found" && (
                    <span className="text-amber-500 font-medium text-[10px]">○ NUEVA</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} className="text-xs gap-1 shrink-0">
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Nueva</span>
          </Button>
        )}
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="max-w-2xl mx-auto py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <Bot className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">¿Con quién vas a hablar?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Dime el nombre o CIF. Busco en Nexus y te preparo la visita.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="text-left px-4 py-3 rounded-lg border border-border text-sm text-muted-foreground hover:border-destructive hover:text-foreground transition-colors"
                  >
                    → {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-3.5 h-3.5 text-destructive" />
                    </div>
                  )}
                  <div
                    className={`rounded-xl px-4 py-3 text-sm max-w-[85%] ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-foreground"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                  {m.role === "user" && (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-destructive" />
                  </div>
                  <div className="bg-muted/50 rounded-xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              {messages.length >= 2 && !loading && messages[messages.length - 1]?.role === "assistant" && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {quickActions.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-destructive hover:text-foreground transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3 shrink-0 pb-safe">
        <div className="max-w-2xl mx-auto flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={messages.length === 0 ? "Nombre o CIF de la empresa..." : "Pregunta lo que necesites..."}
            rows={1}
            className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-destructive max-h-28 overflow-y-auto"
            disabled={loading}
          />
          <Button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            variant="destructive"
            size="icon"
            className="shrink-0 rounded-xl h-11 w-11"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground/50 mt-1.5">
          Enter para enviar · Shift+Enter nueva línea
        </p>
      </div>
    </div>
  );
}
