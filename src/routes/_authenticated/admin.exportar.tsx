import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Database, Download, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { exportTablePage, exportUserDirectory } from "@/lib/site-export.functions";
import { EXPORT_TABLES, safeStoragePath, saveExport, toCsv, type ExportRow } from "@/lib/site-export";
import { ARRAY_COLUMNS, EXPORT_COLUMNS } from "@/lib/site-export-columns";

export const Route = createFileRoute("/_authenticated/admin/exportar")({
  head: () => ({ meta: [
    { title: "Exportar dados — Inspire-se" },
    { name: "description", content: "Exportação administrativa dos dados e fotos do catálogo Inspire-se." },
    { property: "og:title", content: "Exportar dados — Inspire-se" },
    { property: "og:description", content: "Exportação administrativa dos dados e fotos do catálogo Inspire-se." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ExportPage,
});

const GUIDE = `EXPORTAÇÃO Inspire-se

Este pacote contém CSV por tabela, cópia JSON, cadastro de usuários SEM senhas e um manifesto com contagens e falhas. Não contém estrutura SQL, políticas, funções, segredos, sessões ou configurações de login. Não é um backup restaurável completo. As leituras são paginadas e não constituem um snapshot transacional: evite alterações durante a exportação.

IMPORTAÇÃO DOS DADOS
1. Restaure primeiro as contas de login através do export oficial do Lovable Cloud: Mais → Banco de dados → Gerenciar → Configurações → Exportar dados → Database → Export → Start export. Esse export inclui hashes das senhas. usuarios_referencia.csv NÃO pode ser importado em auth.users e não recria logins.
2. As tabelas de destino devem ter a mesma estrutura. No editor de tabelas do seu destino, importe cada CSV na tabela correspondente, preservando IDs. Não reimporte dados já restaurados pelo backup completo.
3. Ordem sugerida: categorias, atendentes, produtos, variacoes_produto, imagens_produto, pedidos, pedidos_itens; depois demais tabelas. user_roles/user_permissions precisam dos usuários originais com os mesmos IDs. Triggers e constraints do destino podem gerar registros extras ou rejeitar importações; valide antes da troca. Nunca desative segurança para importar.
4. CSV usa vírgulas, UTF-8, campo vazio sem aspas para NULL, JSON serializado e arrays no formato PostgreSQL. Valores são preservados: abra como texto, não habilite fórmulas em planilhas.

FOTOS
Quando incluídas, as fotos originais ficam em storage/product-images/<caminho original>. Envie ao bucket privado product-images preservando pastas e nomes. imagens_produto.csv mantém a associação ao produto. URLs externas e fotos indisponíveis ficam listadas no manifesto e não são baixadas. Fotos de atendentes, banners, vídeos e arquivos de outros buckets não estão incluídos; baixe-os em Mais → Armazenamento.

PROTEÇÃO
O pacote inclui dados pessoais, pedidos, permissões e chaves PIX. Guarde-o em local privado e apague cópias após a migração. Confira manifesto.json antes de importar. Teste login, imagens, pedidos, estoque e permissões antes de mudar a loja. A exportação não altera nem remove dados da origem.
`;

function ExportPage() {
  const { isAdmin, loading } = useAuth();
  const fetchPage = useServerFn(exportTablePage);
  const fetchUsers = useServerFn(exportUserDirectory);
  const [includeImages, setIncludeImages] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState<{ blob: Blob; filename: string; warnings: number; rows: number; images: number } | null>(null);

  async function prepare() {
    if (!isAdmin || busy) return;
    setBusy(true); setError(""); setReady(null);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const counts: Record<string, number> = {};
      const warnings: { path: string; reason: string }[] = [];
      let imageRows: ExportRow[] = [];
      let total = 0;
      for (const table of EXPORT_TABLES) {
        const rows: ExportRow[] = [];
        let after: string | undefined;
        do {
          setProgress(`${table}: ${rows.length} registros`);
          const result = await fetchPage({ data: { table, after } });
          rows.push(...result.rows as ExportRow[]);
          after = result.after;
        } while (after);
        counts[table] = rows.length; total += rows.length;
        zip.file(`csv/${table}.csv`, toCsv(rows, [...EXPORT_COLUMNS[table]], ARRAY_COLUMNS[table]));
        zip.file(`json/${table}.json`, JSON.stringify(rows, null, 2));
        if (table === "imagens_produto") imageRows = rows;
      }
      setProgress("Cadastro de usuários…");
      const users = await fetchUsers();
      counts.usuarios_referencia = users.length; total += users.length;
      zip.file("csv/usuarios_referencia.csv", toCsv(users, ["id", "email", "phone", "created_at", "last_sign_in_at", "email_confirmed_at"]));
      zip.file("json/usuarios_referencia.json", JSON.stringify(users, null, 2));
      let images = 0;
      if (includeImages) {
        const paths = [...new Set(imageRows.map((r) => String(r.storage_path ?? "")))];
        for (const [index, path] of paths.entries()) {
          setProgress(`Fotos: ${index + 1} de ${paths.length}`);
          if (/^https?:\/\//i.test(path) || !safeStoragePath(path)) {
            warnings.push({ path, reason: "URL externa ou caminho inválido; arquivo não incluído." }); continue;
          }
          try {
            const { data, error: downloadError } = await supabase.storage.from("product-images").download(path);
            if (downloadError || !data || !data.size) throw new Error("download");
            zip.file(`storage/product-images/${path}`, data); images++;
          } catch {
            warnings.push({ path, reason: "Não foi possível baixar a foto. Confira o armazenamento da origem." });
          }
        }
      }
      zip.file("LEIA-ME.txt", GUIDE);
      zip.file("manifesto.json", JSON.stringify({ version: 1, generated_at: new Date().toISOString(), tables: counts, product_images_requested: includeImages, product_images_exported: images, warnings, passwords_included: false, schema_included: false, other_storage_included: false }, null, 2));
      setProgress("Preparando arquivo ZIP…");
      const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
      setReady({ blob, filename: `inspire-se-dados-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`, warnings: warnings.length, rows: total, images });
      setProgress("");
    } catch {
      setError("Não foi possível concluir a exportação. Nenhum dado foi alterado. Verifique sua conexão e tente novamente.");
      setProgress("");
    } finally { setBusy(false); }
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;
  if (!isAdmin) return <p role="alert" className="text-destructive">Exportação disponível apenas para administradores.</p>;

  return <div className="space-y-6">
    <h1 className="font-display text-2xl font-semibold sm:text-3xl">Exportar dados</h1>
    <section className="space-y-4 border-y border-border py-5">
      <div className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /><h2 className="font-display text-lg font-semibold">Dados da loja</h2></div>
      <p className="text-sm text-muted-foreground">Produtos, categorias, estoque, pedidos, clientes, cupons, PIX, configurações, permissões e históricos.</p>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={includeImages} disabled={busy} onChange={(e) => { setIncludeImages(e.target.checked); setReady(null); }} className="h-4 w-4 accent-primary" />Incluir fotos dos produtos</label>
      {includeImages && <p className="text-sm text-muted-foreground">As fotos aumentam o tempo, o tamanho do arquivo e a transferência de dados. Mantenha esta página aberta.</p>}
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={prepare}>{busy ? <Loader2 className="animate-spin" /> : <Database />}{busy ? "Preparando…" : ready ? "Gerar novamente" : "Preparar exportação"}</Button>
        {ready && <Button variant="outline" onClick={() => saveExport(ready.blob, ready.filename)}><Download />Baixar ZIP</Button>}
      </div>
      {busy && <p role="status" className="break-all text-sm text-muted-foreground">{progress}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {ready && <div role="status" className="space-y-1 text-sm"><p>{ready.rows} registros e {ready.images} fotos preparados · {(ready.blob.size / 1024 / 1024).toFixed(1)} MB</p>{ready.warnings > 0 && <p className="text-destructive">{ready.warnings} fotos não incluídas. Confira o manifesto no ZIP.</p>}</div>}
    </section>
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><ShieldAlert className="h-5 w-5 text-primary" />Logins e senhas</h2>
      <p className="text-sm text-muted-foreground">O CSV inclui o cadastro dos usuários, mas não recria logins nem preserva senhas. Para migrar as contas completas, use a exportação oficial em Mais → Banco de dados → Gerenciar → Configurações → Exportar dados.</p>
      <p className="text-sm text-muted-foreground">O ZIP contém instruções de importação. Fotos de atendentes, banners e outros arquivos devem ser baixados separadamente em Mais → Armazenamento.</p>
      <p className="text-sm text-muted-foreground">Contém dados pessoais e chaves PIX. Guarde o arquivo em local privado.</p>
    </section>
  </div>;
}