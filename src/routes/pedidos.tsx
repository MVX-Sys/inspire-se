import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { listUserOrders } from "@/lib/orders.functions";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { brl } from "@/lib/format";
import { ChevronLeft, Package, Clock, CheckCircle, Truck, XCircle } from "lucide-react";

export const Route = createFileRoute("/pedidos")({
  head: () => ({
    meta: [
      { title: "Meus Pedidos — Inspire-se" },
      { name: "description", content: "Acompanhe seu histórico de pedidos." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { session } = useAuth();
  const nav = useNavigate();
  const fetchOrders = useServerFn(listUserOrders);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["user-orders"],
    queryFn: () => fetchOrders(),
    enabled: !!session,
  });

  if (!session) {
    if (typeof window !== "undefined") nav({ to: "/auth" });
    return null;
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pendente": return { label: "Pendente", color: "bg-yellow-100 text-yellow-700", icon: Clock };
      case "confirmado":
      case "aprovado": return { label: "Confirmado", color: "bg-green-100 text-green-700", icon: CheckCircle };
      case "entregue":
      case "enviado": return { label: "Entregue", color: "bg-blue-100 text-blue-700", icon: Truck };
      case "cancelado": return { label: "Cancelado", color: "bg-red-100 text-red-700", icon: XCircle };

      default: return { label: status, color: "bg-gray-100 text-gray-700", icon: Package };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link to="/perfil" className="rounded-full p-2 hover:bg-muted">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-2xl font-bold">Meus Pedidos</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 w-full animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground">Você ainda não realizou nenhum pedido.</p>
            <Link to="/" className="mt-4 font-semibold text-primary hover:underline">
              Ir para a loja
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => {
              const status = getStatusLabel(order.status);
              return (
                <div key={order.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Pedido #{order.id.slice(0, 8)}</p>
                      <p className="text-sm font-semibold">{new Date(order.criado_em).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${status.color}`}>
                      <status.icon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </div>
                  
                  <div className="p-6">
                    <div className="mb-4 space-y-3">
                      {order.itens?.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-sm gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-white flex items-center justify-center p-1">
                              {item.imagem_url ? (
                                <img src={item.imagem_url} alt="" className="h-full w-full object-contain" />
                              ) : (
                                <Package className="h-6 w-6 text-muted-foreground/20" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex gap-2">
                                <span className="font-bold">{item.quantidade}x</span>
                                <span className="font-medium">{item.detalhes?.nome || 'Produto'}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                {item.detalhes?.cor} • {item.detalhes?.tamanho}
                              </span>
                            </div>
                          </div>
                          <span className="font-semibold tabular-nums">{brl(item.preco_unitario * item.quantidade)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Pagamento: <span className="font-medium text-foreground">{order.forma_pagamento}</span></p>
                        <p className="text-xs text-muted-foreground">Envio: <span className="font-medium text-foreground">{order.forma_envio === 'ENTREGA' ? 'Entrega' : 'Retirada'}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-bold text-primary">{brl(order.total)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
