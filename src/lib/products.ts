import { supabase } from "@/integrations/supabase/client";

export type Categoria = { id: string; hash_id?: string; nome: string; slug: string; ordem: number };

export type Produto = {
  id: string;
  hash_id?: string;
  nome: string;
  descricao: string | null;
  preco: number;
  categoria_id: string | null;
  marca: string | null;
  novidade: boolean;
  promocao: boolean;
  preco_promocional: number | null;
  promocao_ate: string | null;
  ativo: boolean;
  ordem?: number;
};

export type ImagemProduto = {
  id: string;
  produto_id: string;
  storage_path: string;
  principal: boolean;
  ordem: number;
};

export type VariacaoProduto = {
  id: string;
  produto_id: string;
  nome_cor: string;
  hex_cor: string;
  tamanho: string;
  quantidade_estoque: number;
};

export async function listCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from("categorias")
    .select("id,nome,slug,ordem")
    .order("ordem");
  if (error) throw error;
  return data ?? [];
}

export type ProductListItem = Produto & {
  imagens: ImagemProduto[];
  variacoes: VariacaoProduto[];
};

export async function listProdutos(): Promise<ProductListItem[]> {
  const { data, error } = await supabase
    .from("produtos")
    .select("*, imagens:imagens_produto(*), variacoes:variacoes_produto(*)")
    .order("ordem", { ascending: true })
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProductListItem[];
}

export async function getProduto(id: string): Promise<ProductListItem | null> {
  const { data, error } = await supabase
    .from("produtos")
    .select("*, imagens:imagens_produto(*), variacoes:variacoes_produto(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as ProductListItem | null;
}

export function isEsgotado(p: { variacoes: VariacaoProduto[] }): boolean {
  if (!p.variacoes || p.variacoes.length === 0) return false;
  return p.variacoes.every((v) => v.quantidade_estoque <= 0);
}

export type PromoInfo = {
  ativa: boolean;
  precoOriginal: number;
  precoFinal: number;
  percentual: number; // integer 0-100
  validoAte: Date | null;
};

export function getPromoInfo(p: Pick<Produto, "preco" | "promocao" | "preco_promocional" | "promocao_ate">): PromoInfo {
  const ate = p.promocao_ate ? new Date(p.promocao_ate) : null;
  const dentroDoPrazo = !ate || ate.getTime() > Date.now();
  const promoPreco = typeof p.preco_promocional === "number" ? p.preco_promocional : null;
  const ativa =
    !!p.promocao &&
    dentroDoPrazo &&
    promoPreco !== null &&
    promoPreco >= 0 &&
    promoPreco < p.preco;
  const precoFinal = ativa && promoPreco !== null ? promoPreco : p.preco;
  const percentual =
    ativa && p.preco > 0 && promoPreco !== null
      ? Math.round(((p.preco - promoPreco) / p.preco) * 100)
      : 0;
  return {
    ativa,
    precoOriginal: p.preco,
    precoFinal,
    percentual,
    validoAte: ate,
  };
}

