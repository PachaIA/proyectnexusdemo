import { auth, defineMcp } from "@lovable.dev/mcp-js";
import buscarEmpresas from "./tools/buscar-empresas";
import fichaEmpresa from "./tools/ficha-empresa";
import listarPipeline from "./tools/listar-pipeline";
import actualizarLead from "./tools/actualizar-lead";
import registrarVenta from "./tools/registrar-venta";
import kpisVentas from "./tools/kpis-ventas";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "proyecto-nexus",
  title: "Proyecto Nexus",
  version: "0.1.0",
  instructions:
    "Herramientas del CRM comercial B2B telco Nexus (Grupo Enertel). Busca empresas del radar, consulta su ficha completa (sedes, contactos, ventas), gestiona el pipeline en español (sin_empezar, contactado, cualificado, propuesta, negociacion, ganado, perdido), registra ventas cerradas y consulta KPIs del periodo. Todas las operaciones actúan como el usuario autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [buscarEmpresas, fichaEmpresa, listarPipeline, actualizarLead, registrarVenta, kpisVentas],
});
