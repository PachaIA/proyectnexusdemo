import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, ShieldCheck } from "lucide-react";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Falta authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error: err } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (err) {
        setError(err.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("El servidor de autorización no devolvió una URL de retorno.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Grupo Enertel</p>
            <h1 className="text-base font-semibold text-foreground">Conectar con Nexus</h1>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive">No se pudo cargar la solicitud: {error}</p>
        ) : !details ? (
          <p className="text-sm text-muted-foreground">Cargando solicitud…</p>
        ) : (
          <>
            <p className="text-sm text-foreground">
              <span className="font-semibold">{details.client?.name ?? "Una aplicación"}</span> quiere acceder a
              Nexus en tu nombre.
            </p>
            <div className="flex items-start gap-2 mt-3 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Podrá consultar tus empresas, pipeline y ventas, y registrar cambios exactamente con tus mismos
                permisos. Puedes revocar el acceso en cualquier momento.
              </span>
            </div>
            <div className="flex gap-2 mt-6">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                Autorizar
              </Button>
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
                Denegar
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
