import { useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, X, RotateCcw, Send, User, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  "Speech de apertura",
  "Email primer contacto",
  "¿Qué producto propongo?",
  "Rebatir objeción operador",
];

const suggestions = [
  "ATARAZANA DREAMS MULTISERVICIOS SL",
  "Clínica dental zona industrial",
  "Despacho abogados 15 empleados",
];

export const FloatingChatWidget = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/llamada')) return null;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [nexusData, setNexusData] = useState<any>(null);
  const [nexusStatus, setNexusStatus] = useState<"found" | "not_found" | null>(null);
  const [currentCompany, setCurrentCompany] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

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
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 z-[9998] w-14 h-14 rounded-full bg-destructive text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
          title="Agente Comercial IA"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-[9999] w-[calc(100vw-2rem)] max-w-md h-[70vh] max-h-[600px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
            <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground leading-none">Agente Comercial</h3>
              {currentCompany ? (
                <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                  <span className="text-muted-foreground truncate">{currentCompany}</span>
                  {nexusStatus === "found" && <span className="text-success font-medium">● NEXUS</span>}
                  {nexusStatus === "not_found" && <span className="text-warning font-medium">○ NUEVA</span>}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-0.5">Búsqueda + IA comercial</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button variant="ghost" size="icon" onClick={reset} className="h-7 w-7" title="Nueva consulta">
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-7 w-7">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-3">
            <div className="py-3 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center pt-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">¿Con quién vas a hablar?</h4>
                    <p className="text-xs text-muted-foreground mt-1">Nombre o CIF → briefing + estrategia</p>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setInput(s); inputRef.current?.focus(); }}
                        className="text-left px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:border-destructive hover:text-foreground transition-colors"
                      >
                        → {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m, i) => (
                    <div key={i} className={cn("flex gap-2", m.role === "user" && "justify-end")}>
                      {m.role === "assistant" && (
                        <div className="w-6 h-6 rounded-md bg-destructive/10 flex items-center justify-center shrink-0 mt-1">
                          <Bot className="w-3 h-3 text-destructive" />
                        </div>
                      )}
                      <div className={cn(
                        "rounded-xl px-3 py-2 text-xs max-w-[85%]",
                        m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground"
                      )}>
                        {m.role === "assistant" ? (
                          <div className="prose prose-xs dark:prose-invert max-w-none [&>p]:my-0.5 [&>ul]:my-0.5 [&>ol]:my-0.5 text-xs">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        ) : m.content}
                      </div>
                      {m.role === "user" && (
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-md bg-destructive/10 flex items-center justify-center shrink-0">
                        <Bot className="w-3 h-3 text-destructive" />
                      </div>
                      <div className="bg-muted/50 rounded-xl px-3 py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}

                  {messages.length >= 2 && !loading && messages[messages.length - 1]?.role === "assistant" && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {quickActions.map((q) => (
                        <button
                          key={q}
                          onClick={() => send(q)}
                          className="text-[10px] px-2 py-1 rounded-full border border-border text-muted-foreground hover:border-destructive hover:text-foreground transition-colors"
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
          <div className="border-t border-border bg-card px-3 py-2 shrink-0">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={messages.length === 0 ? "Nombre o CIF..." : "Pregunta..."}
                rows={1}
                className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-destructive max-h-20 overflow-y-auto"
                disabled={loading}
              />
              <Button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                variant="destructive"
                size="icon"
                className="shrink-0 rounded-lg h-9 w-9"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
