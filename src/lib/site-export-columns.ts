import type { ExportTable } from "./site-export";

export const EXPORT_COLUMNS = {
  "admin_audit_log": [
    "acao",
    "criado_em",
    "descricao",
    "detalhes",
    "entidade",
    "entidade_id",
    "id",
    "user_email",
    "user_id"
  ],
  "atendentes": [
    "ativo",
    "cargo",
    "criado_em",
    "foto_path",
    "horario",
    "id",
    "nome",
    "whatsapp"
  ],
  "categorias": [
    "criado_em",
    "hash_id",
    "id",
    "nome",
    "ordem",
    "slug"
  ],
  "cupons": [
    "ativo",
    "categorias_ids",
    "codigo",
    "created_at",
    "id",
    "preco_minimo_pedido",
    "produtos_ids",
    "quantidade_minima_itens",
    "tipo_desconto",
    "validade",
    "valor_desconto"
  ],
  "estoque_historico": [
    "cor",
    "criado_em",
    "diferenca",
    "id",
    "origem",
    "produto_id",
    "produto_nome",
    "quantidade_anterior",
    "quantidade_nova",
    "tamanho",
    "user_email",
    "user_id",
    "variacao_id"
  ],
  "gestaoclick_sync_log": [
    "criado_em",
    "estoque",
    "gestaoclick_id",
    "id",
    "mensagem",
    "nome",
    "ok"
  ],
  "hero_slides": [
    "ativo",
    "created_at",
    "id",
    "media_url",
    "ordem",
    "subtitulo",
    "tipo",
    "titulo",
    "updated_at"
  ],
  "imagens_produto": [
    "criado_em",
    "id",
    "ordem",
    "principal",
    "produto_id",
    "storage_path"
  ],
  "pedidos": [
    "atendente_id",
    "cliente_nome",
    "cliente_whatsapp",
    "criado_em",
    "cupom_codigo",
    "desconto_cupom",
    "endereco",
    "forma_envio",
    "forma_pagamento",
    "gestaoclick_venda_id",
    "id",
    "observacoes",
    "status",
    "total",
    "user_id"
  ],
  "pedidos_itens": [
    "detalhes",
    "id",
    "pedido_id",
    "preco_unitario",
    "produto_id",
    "quantidade",
    "variacao_id"
  ],
  "personalizacao_presets": [
    "criado_em",
    "id",
    "nome",
    "opcoes"
  ],
  "pix_chaves": [
    "ativo",
    "banco",
    "chave",
    "cidade",
    "criado_em",
    "id",
    "nome_recebedor",
    "principal",
    "tipo"
  ],
  "produtos": [
    "ativo",
    "categoria_id",
    "codigo_base",
    "criado_em",
    "descricao",
    "gestaoclick_id",
    "hash_id",
    "id",
    "marca",
    "nome",
    "novidade",
    "ordem",
    "personalizacao_tipo",
    "personalizacoes",
    "preco",
    "preco_promocional",
    "promocao",
    "promocao_ate"
  ],
  "site_config": [
    "destaques_novidades",
    "destaques_ofertas",
    "hero_media_url",
    "hero_subtitle",
    "hero_title",
    "hero_type",
    "id",
    "manutencao_ativa",
    "manutencao_fim",
    "manutencao_inicio",
    "manutencao_mensagem",
    "restock_modo",
    "restock_rodizio_idx",
    "restock_whatsapp",
    "restock_whatsapp_list",
    "updated_at"
  ],
  "solicitacoes_reposicao": [
    "atualizado_em",
    "cliente_nome",
    "cliente_whatsapp",
    "cor",
    "criado_em",
    "id",
    "observacao",
    "produto_id",
    "status",
    "tamanho"
  ],
  "user_permissions": [
    "created_at",
    "id",
    "permission",
    "user_id"
  ],
  "user_roles": [
    "created_at",
    "id",
    "role",
    "user_id"
  ],
  "variacoes_produto": [
    "criado_em",
    "hex_cor",
    "id",
    "nome_cor",
    "produto_id",
    "quantidade_estoque",
    "tamanho"
  ]
} as const satisfies Record<ExportTable, readonly string[]>;

export const ARRAY_COLUMNS: Partial<Record<ExportTable, string[]>> = {
  "cupons": [
    "categorias_ids",
    "produtos_ids"
  ],
  "site_config": [
    "destaques_novidades",
    "destaques_ofertas",
    "restock_whatsapp_list"
  ]
};
