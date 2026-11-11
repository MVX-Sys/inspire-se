import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  Calendar, 
  Loader2, 
  User,
  ArrowUpRight,
  ChevronRight
} from "lucide-react";
import { getVendasPorAtendente } from "@/lib/vendas.functions";
import { listAtendentes } from "@/lib/atendentes.functions";
import { brl } from "@/lib/format";
import { BRAND } from "@/lib/config";
import { supabase } from "@/integrations/supabase/client";
import { ExportMenu } from "@/components/export-menu";
import { downloadTableCSV, downloadRelatorioVendasPDF, downloadTableXLSX } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/admin/vendas")({
  head: () => ({
    meta: [
      { title: `Vendas por Atendente — ${BRAND}` },
    ],
  }),
  component: SalesAdminPage,
});

type Periodo = "semana" | "mes" | "ano" | "todos";

function SalesAdminPage() {
  const fetchVendas = useServerFn(getVendasPorAtendente);
  const [periodo, setPeriodo] = useState<Periodo>("mes");

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["admin-vendas-atendentes", periodo],
    queryFn: () => fetchVendas({ data: { periodo } }),
  });

  const stats = {
    totalVendido: vendas.reduce((acc, item) => acc + item.total_vendas, 0),
    totalPedidos: vendas.reduce((acc, item) => acc + item.quantidade_pedidos, 0),
    ticketMedio: vendas.length > 0 
      ? vendas.reduce((acc, item) => acc + item.total_vendas, 0) / vendas.reduce((acc, item) => acc + item.quantidade_pedidos, 0)
      : 0,
    melhorAtendente: vendas.length > 0 ? vendas[0] : null
  };

  const periodLabels = {
    semana: "esta semana",
    mes: "este mês",
    ano: "este ano",
    todos: "todo o período"
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Vendas por Atendente
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe o desempenho individual de cada vendedor.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <select 
              value={periodo} 
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
              className="bg-transparent text-sm outline-none font-medium"
            >
              <option value="semana">Esta Semana</option>
              <option value="mes">Este Mês</option>
              <option value="ano">Este Ano</option>
              <option value="todos">Todo o Tempo</option>
            </select>
          </div>
          <ExportMenu 
            disabled={vendas.length === 0}
            count={vendas.length}
            onExport={(format) => {
              const headers = ["Atendente", "Pedidos", "Vendido", "Ticket Médio"];
              const dataToExport = vendas.map(v => [
                v.nome,
                v.quantidade_pedidos.toString(),
                brl(v.total_vendas),
                brl(v.ticket_medio)
              ]);

              if (format === "csv") {
                downloadTableCSV(`vendas-atendentes-${periodo}`, headers, dataToExport);
              } else if (format === "xlsx") {
                downloadTableXLSX(`vendas-atendentes-${periodo}`, "Vendas", headers, dataToExport);
              } else {
                downloadRelatorioVendasPDF(`Relatório de Vendas (${periodLabels[periodo]})`, `vendas-${periodo}`, dataToExport);
              }
            }}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-1">
        <div className="flex items-center gap-1">
          <Link 
            to="/admin" 
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border border-b-2 border-transparent transition-colors"
          >
            Produtos
          </Link>
          <Link 
            to="/admin/vendas" 
            className="px-4 py-2 text-sm font-medium border-b-2 border-primary transition-colors"
          >
            Vendas
          </Link>
          <Link 
            to="/admin/usuarios" 
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border border-b-2 border-transparent transition-colors"
          >
            Usuários
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Vendido</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-green-500/10 text-green-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums">{brl(stats.totalVendido)}</p>
          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tight">Período: {periodLabels[periodo]}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pedidos Realizados</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums">{stats.totalPedidos}</p>
          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tight">Finalizados com sucesso</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ticket Médio</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums">{brl(stats.ticketMedio)}</p>
          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tight">Valor médio por pedido</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Top Atendente</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <p className="font-display text-2xl font-bold truncate">{stats.melhorAtendente?.nome || "—"}</p>
          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tight">Líder de vendas</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 p-4">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Ranking de Desempenho
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-semibold">Atendente</th>
                <th className="px-6 py-4 font-semibold text-center">Pedidos</th>
                <th className="px-6 py-4 font-semibold">Vendido</th>
                <th className="px-6 py-4 font-semibold">Ticket Médio</th>
                <th className="px-6 py-4 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-muted-foreground">Calculando métricas...</p>
                    </div>
                  </td>
                </tr>
              ) : vendas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-muted-foreground">
                    Nenhuma venda registrada no período selecionado.
                  </td>
                </tr>
              ) : (
                vendas.map((item, index) => (
                  <tr key={item.atendente_id} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted border border-border">
                          {item.foto_path ? (
                            <img
                              src={supabase.storage.from("atendentes-v1-private").getPublicUrl(item.foto_path).data.publicUrl}
                              alt={item.nome}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 absolute inset-0 m-auto text-muted-foreground" />
                          )}
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-amber-400 rounded-full border-2 border-card flex items-center justify-center">
                              <span className="text-[8px] font-bold">1</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{item.nome}</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-tight">Atendente</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-medium tabular-nums">
                      <div className="inline-flex items-center justify-center rounded-full bg-accent px-2.5 py-1 text-xs font-bold">
                        {item.quantidade_pedidos}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground tabular-nums">
                      {brl(item.total_vendas)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground tabular-nums">
                      {brl(item.ticket_medio)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="inline-flex items-center gap-1 text-xs font-bold uppercase text-primary hover:underline">
                        Ver detalhes
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
