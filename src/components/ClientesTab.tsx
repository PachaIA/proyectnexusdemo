import { Money } from '@/components/Money';
import { fmtEur } from '@/hooks/useOpportunityLines';
import { useMemo } from "react";
import { useUrlView, useLastActivity } from "@/hooks/useUrlView";
import { ViewToolbar } from "@/components/ViewToolbar";
import { CompanyMap } from "@/components/CompanyMap";
import { daysSince } from "@/lib/pipelineBoard";
import { Company } from "@/data/companies";
import { useCompanies } from "@/hooks/useCompanies";
import { useLeads } from "@/hooks/useLeads";
import { ChevronUp, ChevronDown, Search, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileClientCard } from "@/components/MobileClientCard";

const ESTADOS_LABELS: Record<string, { label: string; color: string }> = {
  lead: { label: "Lead", color: "var(--muted-text-accessible)" },
  contactado: { label: "Contactado", color: "var(--interactive)" },
  propuesta: { label: "Propuesta", color: "var(--alert-text)" },
  negociacion: { label: "Negociación", color: "var(--warning-text)" },
  ganada: { label: "Ganada", color: "var(--interactive)" },
  perdida: { label: "Perdida", color: "var(--alert-text)" },
};

const OPERATORS = ["Orange", "Movistar", "Vodafone", "MásMóvil", "Otro", "Sin dato"];
const PAGE_SIZE = 50;

type SortKey = "name" | "operadorActual" | "lineasMovil" | "lineasFijo" | "permanencia" | "penalizacion" | "opportunityScore" | "contactName";
type SortDir = "asc" | "desc";

const CLIENTES_DEFAULTS = { vista: 'tabla', q: '', operador: 'todos', score: 'todos', estado: 'todos', fuente: 'todos', filtro: 'todos', orden: 'opportunityScore', dir: 'desc', pagina: '1' };

interface ClientesTabProps {
  onCompanySelect: (company: Company) => void;
}

export const ClientesTab = ({ onCompanySelect }: ClientesTabProps) => {
  const { companies, isLoading } = useCompanies();
  const { leads } = useLeads();
  const isMobile = useIsMobile();

  // Vista, filtros, orden y página viven en la URL (recargar o compartir reproduce la vista).
  const [v, setV, query] = useUrlView(CLIENTES_DEFAULTS);
  const lastActivity = useLastActivity();
  const search = v.q, operadorFilter = v.operador, scoreFilter = v.score, estadoFilter = v.estado, fuenteFilter = v.fuente, actividadFilter = v.filtro;
  const sortKey = v.orden as SortKey, sortDir = v.dir as SortDir, page = Number(v.pagina) || 1;
  const setSearch = (q: string) => setV({ q, pagina: '1' });
  const setOperadorFilter = (operador: string) => setV({ operador });
  const setScoreFilter = (score: string) => setV({ score });
  const setEstadoFilter = (estado: string) => setV({ estado });
  const setFuenteFilter = (fuente: string) => setV({ fuente });
  const setPage = (p: number | ((n: number) => number)) => setV({ pagina: String(typeof p === 'function' ? p(page) : p) });

  const leadMap = useMemo(() => {
    const m: Record<string, string> = {};
    leads?.forEach((l: any) => { if (!l.archived_at) m[l.company_id] = l.estado || "lead"; });
    return m;
  }, [leads]);

  const activeCompanies = useMemo(() => companies.filter(c => !c.archivedAt), [companies]);

  const filtered = useMemo(() => {
    let list = activeCompanies;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.cif || "").toLowerCase().includes(q));
    }

    if (operadorFilter !== "todos") {
      if (operadorFilter === "Sin dato") {
        list = list.filter(c => !c.operadorActual);
      } else {
        list = list.filter(c => (c.operadorActual || "").toLowerCase().includes(operadorFilter.toLowerCase()));
      }
    }

    if (scoreFilter !== "todos") {
      if (scoreFilter === "alto") list = list.filter(c => c.opportunityScore >= 80);
      else if (scoreFilter === "medio") list = list.filter(c => c.opportunityScore >= 60 && c.opportunityScore < 80);
      else if (scoreFilter === "bajo") list = list.filter(c => c.opportunityScore < 60);
    }

    if (estadoFilter !== "todos") {
      list = list.filter(c => (leadMap[c.id] || "") === estadoFilter);
    }

    if (fuenteFilter !== "todos") {
      list = list.filter(c => {
        const ds = c.dataSources;
        if (fuenteFilter === "wasp") return Array.isArray(ds) ? ds.some((s: any) => s?.type === "wasp") : (ds as any)?.wasp;
        if (fuenteFilter === "places") return Array.isArray(ds) ? ds.some((s: any) => s?.type === "google_places") : (ds as any)?.google_places;
        return true;
      });
    }

    if (actividadFilter === 'sin-actividad') {
      list = list.filter(c => { const d = lastActivity.get(c.id); return !d || daysSince(d) > 14; });
    }

    // Sort
    list = [...list].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "name": av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
        case "operadorActual": av = (a.operadorActual || "").toLowerCase(); bv = (b.operadorActual || "").toLowerCase(); break;
        case "lineasMovil": av = a.lineasMovil || 0; bv = b.lineasMovil || 0; break;
        case "lineasFijo": av = a.lineasFijo || 0; bv = b.lineasFijo || 0; break;
        case "permanencia": av = a.permanencia || 0; bv = b.permanencia || 0; break;
        case "penalizacion": av = a.penalizacion || 0; bv = b.penalizacion || 0; break;
        case "opportunityScore": av = a.opportunityScore; bv = b.opportunityScore; break;
        case "contactName": av = ((a.contactInfo as any)?.nombre || a.contactInfo?.contactPerson || "").toLowerCase(); bv = ((b.contactInfo as any)?.nombre || b.contactInfo?.contactPerson || "").toLowerCase(); break;
        default: av = 0; bv = 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [activeCompanies, search, operadorFilter, scoreFilter, estadoFilter, fuenteFilter, sortKey, sortDir, leadMap, actividadFilter, lastActivity]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setV({ dir: sortDir === "asc" ? "desc" : "asc" });
    else setV({ orden: key, dir: "desc" });
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="inline w-3 h-3 ml-0.5" /> : <ChevronDown className="inline w-3 h-3 ml-0.5" />;
  };

  const scoreBadge = (score: number) => {
    if (score >= 80) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/15 text-destructive">{score}</span>;
    if (score >= 60) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-warning/15 text-warning dark:text-warning">{score}</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">{score}</span>;
  };

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando empresas...</div>;

  const thClass = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap";
  const tdClass = "px-3 py-2 text-sm text-foreground whitespace-nowrap";

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o CIF..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="hidden md:contents">
          <Select value={operadorFilter} onValueChange={x => setV({ operador: x, pagina: "1" })}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Operador" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos operadores</SelectItem>
              {OPERATORS.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={scoreFilter} onValueChange={x => setV({ score: x, pagina: "1" })}>
            <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Score" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos scores</SelectItem>
              <SelectItem value="alto">Alto (≥80)</SelectItem>
              <SelectItem value="medio">Medio (60-79)</SelectItem>
              <SelectItem value="bajo">Bajo (&lt;60)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={estadoFilter} onValueChange={x => setV({ estado: x, pagina: "1" })}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos estados</SelectItem>
              {Object.entries(ESTADOS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fuenteFilter} onValueChange={x => setV({ fuente: x, pagina: "1" })}>
            <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Fuente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas fuentes</SelectItem>
              <SelectItem value="wasp">Wasp</SelectItem>
              <SelectItem value="places">Places</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actividadFilter} onValueChange={x => setV({ filtro: x, pagina: "1" })}>
            <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue placeholder="Actividad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Toda actividad</SelectItem>
              <SelectItem value="sin-actividad">Sin actividad (+14 días)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} empresas</span>
        <ViewToolbar page="clientes" views={[{ id: 'tabla', label: 'Tabla' }, { id: 'mapa', label: 'Mapa' }]} current={v.vista} onChange={vista => setV({ vista })} query={query} />
      </div>

      {v.vista === 'mapa' ? (
        <div className="relative h-[70vh] min-h-[420px] rounded-md overflow-hidden border border-border">
          <CompanyMap companies={filtered.filter(c => c.lat && c.lng)} selectedCompany={null} onCompanySelect={onCompanySelect} leads={leads as any} />
          <p className="absolute top-2 left-2 z-[500] bg-card/90 px-2 py-1 rounded text-xs text-muted-foreground">{filtered.filter(c => c.lat && c.lng).length} de {filtered.length} empresas con ubicación</p>
        </div>
      ) : <>

      {/* Mobile: Card list */}
      {isMobile ? (
        <div className="flex flex-col gap-2">
          {paginated.map(c => {
            const estado = leadMap[c.id];
            const estadoCfg = estado ? ESTADOS_LABELS[estado] : null;
            return (
              <MobileClientCard
                key={c.id}
                company={c}
                estado={estadoCfg}
                onSelect={() => onCompanySelect(c)}
              />
            );
          })}
          {paginated.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">No se encontraron empresas con estos filtros</div>
          )}
        </div>
      ) : (
        /* Desktop: Table */
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className={thClass} onClick={() => handleSort("name")}>Empresa <SortIcon col="name" /></th>
                  <th className={`${thClass} hidden lg:table-cell`}>CIF</th>
                  <th className={thClass} onClick={() => handleSort("operadorActual")}>Operador <SortIcon col="operadorActual" /></th>
                  <th className={thClass} onClick={() => handleSort("lineasMovil")}>Móvil <SortIcon col="lineasMovil" /></th>
                  <th className={thClass} onClick={() => handleSort("lineasFijo")}>Fijo <SortIcon col="lineasFijo" /></th>
                  <th className={thClass} onClick={() => handleSort("permanencia")}>Perm. <SortIcon col="permanencia" /></th>
                  <th className={thClass} onClick={() => handleSort("penalizacion")}>Penaliz. € <SortIcon col="penalizacion" /></th>
                  <th className={thClass} onClick={() => handleSort("opportunityScore")}>Score <SortIcon col="opportunityScore" /></th>
                  <th className={thClass}>Estado</th>
                  <th className={thClass} onClick={() => handleSort("contactName")}>Contacto <SortIcon col="contactName" /></th>
                  <th className={thClass}>Teléfono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map(c => {
                  const estado = leadMap[c.id];
                  const estadoCfg = estado ? ESTADOS_LABELS[estado] : null;
                  const tel = (c.contactInfo as any)?.telefono || c.contactInfo?.phone || "";
                  const contactName = (c.contactInfo as any)?.nombre || c.contactInfo?.contactPerson || "";
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onCompanySelect(c)}>
                      <td className={`${tdClass} font-medium text-primary hover:underline max-w-[200px] truncate`}>{c.name}</td>
                      <td className={`${tdClass} hidden lg:table-cell text-muted-foreground text-xs nexus-reference`}>{c.cif || "—"}</td>
                      <td className={`${tdClass} text-xs`}>{c.operadorActual || "—"}</td>
                      <td className={`${tdClass} text-center tabular-nums`}>{c.lineasMovil || 0}</td>
                      <td className={`${tdClass} text-center tabular-nums`}>{c.lineasFijo || 0}</td>
                      <td className={`${tdClass} text-center tabular-nums`}>{c.permanencia ? `${c.permanencia}m` : "—"}</td>
                      <td className={`${tdClass} text-center tabular-nums`}><Money>{c.penalizacion ? fmtEur(c.penalizacion) : "—"}</Money></td>
                      <td className={`${tdClass} text-center`}>{scoreBadge(c.opportunityScore)}</td>
                      <td className={tdClass}>
                        {estadoCfg
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: estadoCfg.color + "22", color: estadoCfg.color }}>{estadoCfg.label}</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className={`${tdClass} max-w-[140px] truncate text-xs`}>{contactName || "—"}</td>
                      <td className={tdClass} onClick={e => e.stopPropagation()}>
                        {tel ? (
                          <a href={`tel:${tel}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <Phone className="w-3 h-3" />{tel}
                          </a>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-10 text-muted-foreground">No se encontraron empresas con estos filtros</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Página {safePage} de {totalPages} — {filtered.length} resultados
          </span>
          <div className="flex items-center gap-1">
            <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ← Anterior
            </button>
            {!isMobile && Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
              const p = start + i;
              if (p > totalPages) return null;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${p === safePage ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`}>
                  {p}
                </button>
              );
            })}
            <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
