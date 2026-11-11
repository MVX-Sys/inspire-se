import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EXPORT_TABLES, requireExportAdmin } from "./site-export";

export const exportTablePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ table: z.enum(EXPORT_TABLES), after: z.string().max(100).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError) throw new Error("Não foi possível verificar seu acesso.");
    requireExportAdmin(isAdmin);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from(data.table).select("*").order("id").limit(500);
    if (data.after) query = query.gt("id", data.after);
    const { data: rows, error } = await query;
    if (error) throw new Error(`Não foi possível exportar ${data.table}.`);
    const result = rows ?? [];
    return { rows: result, after: result.length === 500 ? result[result.length - 1]?.id : undefined };
  });

// A reference directory, not an Auth backup: never export credentials or password hashes.
export const exportUserDirectory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError) throw new Error("Não foi possível verificar seu acesso.");
    requireExportAdmin(isAdmin);
    const { data, error } = await context.supabase.rpc("admin_list_users");
    if (error) throw new Error("Não foi possível exportar o cadastro de usuários.");
    return data ?? [];
  });