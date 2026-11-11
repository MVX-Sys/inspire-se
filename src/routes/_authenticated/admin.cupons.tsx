import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";

const couponsSearchSchema = z.object({
  ids: z.string().optional(),
});
import {
  Plus,
  Search,
  Ticket,
  Edit2,
  Trash2,
  X,
  Check,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  listCupons,
  saveCupon,
  deleteCupon,
} from "@/lib/coupons.functions";
import { listCategoriasFn, listProdutosFn } from "@/lib/products.functions";
import { BRAND } from "@/lib/config";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/cupons")({
  validateSearch: couponsSearchSchema,
  head: () => ({
    meta: [
      { title: `Cupons — ${BRAND}` },
      {
        name: "description",
        content: `Gerencie os cupons de desconto da ${BRAND}.`,
      },
    ],
  }),
  component: CuponsPage,
});

type Coupon = Awaited<ReturnType<typeof listCupons>>[number];

function CuponsPage() {
  const { ids } = Route.useSearch();
  const fetchCupons = useServerFn(listCupons);
  const fnSave = useServerFn(saveCupon);
  const fnDelete = useServerFn(deleteCupon);
  const fetchCategorias = useServerFn(listCategoriasFn);
  const fetchProdutos = useServerFn(listProdutosFn);
  const qc = useQueryClient();

  const { data: categorias, isLoading: categoriasLoading } = useQuery({
    queryKey: ["admin", "categorias"],
    queryFn: () => fetchCategorias(),
  });

  const { data: produtos, isLoading: produtosLoading } = useQuery({
    queryKey: ["admin", "produtos"],
    queryFn: () => fetchProdutos(),
  });

  useEffect(() => {
    if (ids) {
      const productIds = ids.split(',').map(s => s.trim()).filter(Boolean);
      setEditing({
        codigo: "",
        tipo_desconto: "percentual",
        valor_desconto: 0,
        quantidade_minima_itens: 1,
        ativo: true,
        validade: null,
        produtos_ids: productIds,
      });
    }
  }, [ids]);

  const { data: cupons, isLoading } = useQuery({
    queryKey: ["admin", "cupons"],
    queryFn: () => fetchCupons(),
  });

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);

  const filtered = cupons?.filter((c) =>
    c.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const mutationSave = useMutation({
    mutationFn: (data: any) => fnSave({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "cupons"] });
      toast.success("Cupom salvo com sucesso!");
      setEditing(null);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar cupom."),
  });

  const mutationDelete = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "cupons"] });
      toast.success("Cupom excluído!");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Cupons</h1>
          <p className="text-sm text-muted-foreground">
            Configure códigos de desconto para seus clientes.
          </p>
        </div>
        <button
          onClick={() =>
            setEditing({
              codigo: "",
              tipo_desconto: "percentual",
              valor_desconto: 0,
              quantidade_minima_itens: 1,
              ativo: true,
              validade: null,
            })
          }
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Novo Cupom
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar pelo código do cupom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-4">Código</th>
                <th className="px-4 py-4">Desconto</th>
                <th className="px-4 py-4">Min. Itens</th>
                <th className="px-4 py-4">Validade</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Carregando cupons...
                  </td>
                </tr>
              ) : filtered?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum cupom encontrado.
                  </td>
                </tr>
              ) : (
                filtered?.map((c) => (
                  <tr key={c.id} className="group transition-colors hover:bg-muted/30">
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 font-mono font-bold text-foreground">
                        <Ticket className="h-3.5 w-3.5 text-primary" />
                        {c.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-primary">
                        {c.valor_desconto}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {c.quantidade_minima_itens} {c.quantidade_minima_itens === 1 ? 'item' : 'itens'}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {c.validade ? new Date(c.validade).toLocaleDateString('pt-BR') : "Sem expiração"}
                    </td>
                    <td className="px-4 py-4">
                      {c.ativo ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-500">
                          <Check className="h-2.5 w-2.5" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
                          <X className="h-2.5 w-2.5" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => setEditing(c)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Excluir este cupom?")) mutationDelete.mutate(c.id);
                          }}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-premium animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4 flex-shrink-0">
              <h2 className="font-display text-lg font-bold">
                {editing.id ? "Editar Cupom" : "Novo Cupom"}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutationSave.mutate(editing);
              }}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold">Código do Cupom</label>
                  <input
                    type="text"
                    required
                    placeholder="EX: VERAO10"
                    value={editing.codigo}
                    onChange={(e) => setEditing({ ...editing, codigo: e.target.value.toUpperCase() })}
                    className="input uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Tipo de Desconto</label>
                  <select
                    value={editing.tipo_desconto}
                    onChange={(e) => setEditing({ ...editing, tipo_desconto: e.target.value as any })}
                    className="input"
                  >
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Valor Fixo (R$)</option>
                  </select>
                </div>
                
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    {editing.tipo_desconto === "fixo" ? "Valor (R$)" : "Desconto (%)"}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editing.valor_desconto}
                    onChange={(e) => setEditing({ ...editing, valor_desconto: Number(e.target.value) })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Mínimo de Itens</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editing.quantidade_minima_itens}
                    onChange={(e) => setEditing({ ...editing, quantidade_minima_itens: Number(e.target.value) })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold">Preço Mínimo (Pedido)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editing.preco_minimo_pedido || ""}
                      onChange={(e) => setEditing({ ...editing, preco_minimo_pedido: e.target.value ? Number(e.target.value) : null })}
                      className="input pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Restrições e Validade</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase text-muted-foreground">Produtos Restritos</label>
                    <div className="max-h-[150px] overflow-y-auto rounded-lg border border-border bg-background p-2 space-y-1">
                      {produtosLoading ? (
                        <div className="p-2 text-center text-xs text-muted-foreground">Carregando produtos...</div>
                      ) : (
                        produtos?.map((p: any) => (
                          <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
                            <input
                              type="checkbox"
                              checked={(editing.produtos_ids || []).includes(p.id)}
                              onChange={(e) => {
                                const currentIds = editing.produtos_ids || [];
                                const newIds = e.target.checked 
                                  ? [...currentIds, p.id]
                                  : currentIds.filter(id => id !== p.id);
                                setEditing({ ...editing, produtos_ids: newIds });
                              }}
                              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-medium leading-tight">{p.nome}</span>
                              <span className="text-[9px] font-mono text-muted-foreground">{p.hash_id || p.id.slice(0, 8)}</span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase text-muted-foreground">Categorias Restritas</label>
                    <div className="max-h-[120px] overflow-y-auto rounded-lg border border-border bg-background p-2 space-y-1">
                      {categoriasLoading ? (
                        <div className="p-2 text-center text-xs text-muted-foreground">Carregando categorias...</div>
                      ) : (
                        categorias?.map((c: any) => (
                          <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
                            <input
                              type="checkbox"
                              checked={(editing.categorias_ids || []).includes(c.id)}
                              onChange={(e) => {
                                const currentIds = editing.categorias_ids || [];
                                const newIds = e.target.checked 
                                  ? [...currentIds, c.id]
                                  : currentIds.filter(id => id !== c.id);
                                setEditing({ ...editing, categorias_ids: newIds });
                              }}
                              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-medium leading-tight">{c.nome}</span>
                              <span className="text-[9px] font-mono text-muted-foreground">{c.slug}</span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">Data de Validade</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="date"
                        value={editing.validade ? editing.validade.split('T')[0] : ""}
                        onChange={(e) => setEditing({ ...editing, validade: e.target.value || null })}
                        className="input pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 flex-shrink-0 bg-card pt-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/40">
                  <input
                    type="checkbox"
                    checked={editing.ativo}
                    onChange={(e) => setEditing({ ...editing, ativo: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Cupom Ativo</span>
                    <span className="text-[10px] text-muted-foreground">O cupom poderá ser usado imediatamente se marcado.</span>
                  </div>
                </label>

                <div className="flex gap-3 pb-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="flex-1 rounded-xl border border-border bg-background py-3 text-sm font-bold transition-all hover:bg-accent active:scale-[0.98]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={mutationSave.isPending}
                    className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                  >
                    {mutationSave.isPending ? "Salvando..." : "Salvar Cupom"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
