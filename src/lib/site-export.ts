import type { Database } from "@/integrations/supabase/types";

export const EXPORT_TABLES = [
  "categorias", "atendentes", "produtos", "variacoes_produto", "imagens_produto",
  "pedidos", "pedidos_itens", "cupons", "personalizacao_presets", "pix_chaves",
  "site_config", "hero_slides", "solicitacoes_reposicao", "user_roles",
  "user_permissions", "estoque_historico", "gestaoclick_sync_log", "admin_audit_log",
] as const satisfies readonly (keyof Database["public"]["Tables"])[];

export type ExportTable = (typeof EXPORT_TABLES)[number];
export type ExportRow = Record<string, unknown>;

export function requireExportAdmin(isAdmin: unknown) {
  if (isAdmin !== true) throw new Error("Exportação disponível apenas para administradores.");
}

function pgArray(values: unknown[]): string {
  return `{${values.map((v) => v === null ? "NULL" : `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
}

export function toCsv(rows: ExportRow[], columns: string[], arrayColumns: string[] = []): string {
  const encode = (value: unknown, column: string) => {
    if (value === null || value === undefined) return "";
    const text = Array.isArray(value) && arrayColumns.includes(column)
      ? pgArray(value)
      : typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [columns.map((c) => encode(c, "")).join(","), ...rows.map((r) => columns.map((c) => encode(r[c], c)).join(","))].join("\r\n") + "\r\n";
}

export function safeStoragePath(path: string): boolean {
  return Boolean(path) && !path.startsWith("/") && !path.includes("\\") && !path.split("/").some((part) => part === ".." || part === "." || part === "");
}

export function saveExport(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}