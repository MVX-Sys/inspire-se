import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, RefreshCcw, Bell } from "lucide-react";

export const Route = createFileRoute("/reposicoes")({
  head: () => ({
    meta: [
      { title: "Minhas Reposições — Inspire-se" },
      { name: "description", content: "Acompanhe seus pedidos de aviso de reposição." },
    ],
  }),
  component: RestocksPage,
});

function RestocksPage() {
  const { session } = useAuth();
  const nav = useNavigate();

  const { data: restocks, isLoading } = useQuery({
    queryKey: ["user-restocks"],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from("solicitacoes_reposicao")
        .select(`
          *,
          produto:produtos(nome)
        `)
        .eq("cliente_whatsapp", session.user.user_metadata?.whatsapp?.replace(/\D/g, "") || "")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  if (!session) {
    if (typeof window !== "undefined") nav({ to: "/auth" });
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link to="/perfil" className="rounded-full p-2 hover:bg-muted">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-2xl font-bold">Solicitações de Reposição</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : !restocks || restocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground">Você não possui avisos de reposição ativos.</p>
            <Link to="/" className="mt-4 font-semibold text-primary hover:underline">
              Explorar produtos
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {restocks.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
                    <RefreshCcw className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {item.produto?.nome || "Produto removido"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Cor: <span className="text-foreground">{item.cor}</span> · 
                      Tamanho: <span className="text-foreground">{item.tamanho}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Solicitado em {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                    Aguardando
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
