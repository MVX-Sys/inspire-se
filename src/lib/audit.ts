import { supabase } from "@/integrations/supabase/client";

export type AuditAcao =
  | "criar"
  | "editar"
  | "excluir"
  | "marcar_atendida"
  | "cancelar"
  | "reabrir"
  | "reenviar_whatsapp"
  | "avisar_reposicao"
  | "login"
  | "backup_export"
  | "backup_import"
  | "outro";

export type AuditEntidade =
  | "produto"
  | "categoria"
  | "variacao"
  | "imagem"
  | "solicitacao_reposicao"
  | "sessao"
  | "cupom"
  | "usuario"
  | "atendente"
  | "configuracao_site";

export async function logAudit(input: {
  acao: AuditAcao;
  entidade: AuditEntidade;
  entidade_id?: string | null;
  descricao?: string;
  detalhes?: Record<string, unknown>;
}) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    await supabase.from("admin_audit_log").insert({
      user_id: user.id,
      user_email: user.email ?? null,
      acao: input.acao,
      entidade: input.entidade,
      entidade_id: input.entidade_id ?? null,
      descricao: input.descricao ?? null,
      detalhes: (input.detalhes ?? null) as never,
    });
  } catch {
    // Auditoria não deve quebrar a UX
  }
}
