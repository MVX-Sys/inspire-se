import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const salesFilterSchema = z.object({
  periodo: z.enum(["semana", "mes", "ano", "todos"]).optional().default("mes"),
});

export type VendaAtendente = {
  atendente_id: string;
  nome: string;
  foto_path: string | null;
  total_vendas: number;
  quantidade_pedidos: number;
  ticket_medio: number;
};

export const getVendasPorAtendente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => salesFilterSchema.parse(data))
  .handler(async ({ data: input, context }) => {
    const { supabase } = context;

    let query = supabase
      .from("pedidos")
      .select(`
        id,
        total,
        atendente_id,
        atendente:atendentes(nome, foto_path)
      `)
      .in("status", ["confirmado", "entregue"]);

    if (input.periodo !== "todos") {
      const now = new Date();
      let startDate = new Date();
      if (input.periodo === "semana") {
        startDate.setDate(now.getDate() - 7);
      } else if (input.periodo === "mes") {
        startDate.setMonth(now.getMonth() - 1);
      } else if (input.periodo === "ano") {
        startDate.setFullYear(now.getFullYear() - 1);
      }
      query = query.gte("criado_em", startDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    const aggregation: Record<string, VendaAtendente> = {};

    (data || []).forEach((pedido: any) => {
      const atendenteId = pedido.atendente_id || "nao-atribuido";
      const atendenteNome = pedido.atendente?.nome || "Sem Atendente";
      const fotoPath = pedido.atendente?.foto_path || null;

      if (!aggregation[atendenteId]) {
        aggregation[atendenteId] = {
          atendente_id: atendenteId,
          nome: atendenteNome,
          foto_path: fotoPath,
          total_vendas: 0,
          quantidade_pedidos: 0,
          ticket_medio: 0,
        };
      }

      aggregation[atendenteId].total_vendas += Number(pedido.total);
      aggregation[atendenteId].quantidade_pedidos += 1;
    });

    const result = Object.values(aggregation).map((item) => ({
      ...item,
      ticket_medio: item.total_vendas / item.quantidade_pedidos,
    }));

    return result.sort((a, b) => b.total_vendas - a.total_vendas);
  });
