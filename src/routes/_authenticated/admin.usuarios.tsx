import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Loader2,
  Search,
  Users,
  ShieldCheck,
  MailCheck,
  MailX,
  X,
  Check,
  UserPlus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  listAdminUsers,
  setUserRole,
  setUserPermissions,
  deleteUserAccess,
  type AdminUserRow,
} from "@/lib/admin-users.functions";
import { BRAND } from "@/lib/config";
import { downloadTableCSV, downloadTablePDF, downloadTableXLSX } from "@/lib/pdf";
import { ExportMenu } from "@/components/export-menu";
import { useAuth } from "@/lib/auth";
import {
  ALL_PERMISSIONS,
  classifyRole,
  type PermissionKey,
  type UserRoleKind,
} from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({
    meta: [
      { title: `Usuários — ${BRAND}` },
      {
        name: "description",
        content: `Gerencie os usuários cadastrados no painel administrativo da ${BRAND}.`,
      },
    ],
  }),
  component: UsuariosPage,
});

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ROLE_LABEL: Record<UserRoleKind, string> = {
  admin: "Administrador",
  funcionario: "Funcionário",
  cliente: "Cliente",
};

function UsuariosPage() {
  const { isAdmin, session } = useAuth();
  const fetchUsers = useServerFn(listAdminUsers);
  const changeRole = useServerFn(setUserRole);
  const changePerms = useServerFn(setUserPermissions);
  const removeUser = useServerFn(deleteUserAccess);
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "usuarios"],
    queryFn: () => fetchUsers(),
    enabled: isAdmin,
  });

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"todos" | UserRoleKind>("todos");
  const [sort, setSort] = useState<
    "recentes" | "antigos" | "email-asc" | "email-desc" | "ultimo-acesso"
  >("recentes");
  const [editing, setEditing] = useState<AdminUserRow | null>(null);

  const filtered = useMemo(() => {
    const list = data ?? [];
    const term = q.trim().toLowerCase();
    const out = list.filter((u) => {
      const kind = classifyRole(u.roles);
      if (roleFilter !== "todos" && kind !== roleFilter) return false;
      if (!term) return true;
      return (
        (u.email ?? "").toLowerCase().includes(term) ||
        u.id.toLowerCase().includes(term) ||
        (u.phone ?? "").toLowerCase().includes(term)
      );
    });
    const sorted = [...out];
    sorted.sort((a, b) => {
      switch (sort) {
        case "antigos": return (a.created_at ?? "").localeCompare(b.created_at ?? "");
        case "email-asc": return (a.email ?? "").localeCompare(b.email ?? "");
        case "email-desc": return (b.email ?? "").localeCompare(a.email ?? "");
        case "ultimo-acesso": return (b.last_sign_in_at ?? "").localeCompare(a.last_sign_in_at ?? "");
        default: return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      }
    });
    return sorted;
  }, [data, q, roleFilter, sort]);

  const total = data?.length ?? 0;
  const admins = data?.filter((u) => classifyRole(u.roles) === "admin").length ?? 0;
  const funcionarios = data?.filter((u) => classifyRole(u.roles) === "funcionario").length ?? 0;
  const confirmed = data?.filter((u) => u.email_confirmed_at).length ?? 0;

  const saveMutation = useMutation({
    mutationFn: async (args: {
      userId: string;
      role: UserRoleKind;
      permissions: PermissionKey[];
    }) => {
      await changeRole({ data: { userId: args.userId, role: args.role } });
      if (args.role === "funcionario") {
        await changePerms({
          data: { userId: args.userId, permissions: args.permissions },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "usuarios"] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => removeUser({ data: { userId } }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["admin", "usuarios"] });
      setEditing(null);
      toast.success(
        res?.accountDeleted
          ? "Usuário excluído com sucesso."
          : "Acesso do funcionário removido (conta convertida em cliente).",
      );
    },
    onError: (err: any) =>
      toast.error(err?.message ?? "Não foi possível excluir o usuário."),
  });

  function confirmDelete(u: AdminUserRow) {
    const label = u.email ?? u.id;
    if (
      window.confirm(
        `Excluir ${label}? Todos os acessos e permissões serão removidos.`,
      )
    ) {
      deleteMutation.mutate(u.id);
    }
  }


  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Apenas administradores podem gerenciar usuários.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Usuários cadastrados
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina quem é administrador, funcionário ou cliente do sistema.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link 
            to="/admin/pedidos" 
            className="flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-brand/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-brand/30 active:scale-95"
          >
            <ShoppingBag className="h-4 w-4" />
            Gerenciar Pedidos
          </Link>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            {isFetching ? "Atualizando…" : "Atualizar"}
          </button>
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
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border border-b-2 border-transparent transition-colors"
          >
            Vendas
          </Link>
          <Link 
            to="/admin/usuarios" 
            className="px-4 py-2 text-sm font-medium border-b-2 border-primary transition-colors"
          >
            Usuários
          </Link>
        </div>
      </div>


      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <StatCard icon={<Users className="h-4 w-4" />} label="Total" value={total} />
        <StatCard icon={<ShieldCheck className="h-4 w-4" />} label="Administradores" value={admins} />
        <StatCard icon={<ShieldCheck className="h-4 w-4" />} label="Funcionários" value={funcionarios} />
        <StatCard icon={<MailCheck className="h-4 w-4" />} label="Email confirmado" value={confirmed} />
        <Link 
          to="/admin/atendentes"
          className="group flex flex-col justify-center gap-1 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/10"
        >
          <div className="flex items-center gap-2 text-primary">
            <UserPlus className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Atendentes</span>
          </div>
          <p className="text-lg font-bold text-primary">Gerenciar</p>
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por email, telefone ou ID…"
            className="input pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          className="input sm:w-56"
        >
          <option value="todos">Todos os perfis</option>
          <option value="admin">Administradores</option>
          <option value="funcionario">Funcionários</option>
          <option value="cliente">Clientes</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="input sm:w-56"
        >
          <option value="recentes">Mais recentes</option>
          <option value="antigos">Mais antigos</option>
          <option value="ultimo-acesso">Último acesso</option>
          <option value="email-asc">Email (A–Z)</option>
          <option value="email-desc">Email (Z–A)</option>
        </select>
        <ExportMenu
          disabled={filtered.length === 0}
          count={filtered.length}
          onExport={(format) => {
            const headers = ["Email", "ID", "Telefone", "Cadastro", "Último acesso", "Status", "Perfil", "Permissões"];
            const rows = filtered.map((u) => {
              const kind = classifyRole(u.roles);
              return [
                u.email ?? "",
                u.id,
                u.phone ?? "",
                formatDate(u.created_at),
                formatDate(u.last_sign_in_at),
                u.email_confirmed_at ? "Confirmado" : "Pendente",
                ROLE_LABEL[kind],
                kind === "funcionario" ? u.permissions.join(", ") : "",
              ];
            });
            if (format === "csv") downloadTableCSV("usuarios", headers, rows);
            else if (format === "xlsx") downloadTableXLSX("usuarios", "Usuários", headers, rows);
            else {
              const cols = [
                { label: "Email", width: 50 },
                { label: "Telefone", width: 26 },
                { label: "Cadastro", width: 28 },
                { label: "Último acesso", width: 28 },
                { label: "Status", width: 22 },
                { label: "Perfil", width: 24 },
                { label: "Permissões", width: 40 },
              ];
              const pdfRows = filtered.map((u) => {
                const kind = classifyRole(u.roles);
                return [
                  u.email ?? "—",
                  u.phone ?? "—",
                  formatDate(u.created_at),
                  formatDate(u.last_sign_in_at),
                  u.email_confirmed_at ? "Confirmado" : "Pendente",
                  ROLE_LABEL[kind],
                  kind === "funcionario" ? u.permissions.join(", ") : "—",
                ];
              });
              downloadTablePDF("Usuários cadastrados", "usuarios", cols, pdfRows);
            }
          }}
        />
      </div>

      {isLoading ? (
        <div className="grid place-items-center rounded-2xl border border-border bg-card py-16">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando usuários…
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Erro ao carregar usuários: {(error as Error)?.message ?? "desconhecido"}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Nenhum usuário encontrado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <ul className="divide-y divide-border">
            {filtered.map((u) => {
              const kind = classifyRole(u.roles);
              const isSelf = session?.user.id === u.id;
              return (
                <li
                  key={u.id}
                  className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {u.email ?? <span className="text-muted-foreground">sem email</span>}
                      {isSelf && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          você
                        </span>
                      )}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {u.id}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cadastro: {formatDate(u.created_at)} · Último acesso: {formatDate(u.last_sign_in_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.email_confirmed_at ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <MailCheck className="h-3 w-3" /> Confirmado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                        <MailX className="h-3 w-3" /> Pendente
                      </span>
                    )}
                    <RoleBadge kind={kind} />
                    {kind === "funcionario" && u.permissions.length > 0 && (
                      <span className="hidden rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:inline">
                        {u.permissions.length} permiss{u.permissions.length === 1 ? "ão" : "ões"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditing(u)}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-accent"
                    >
                      Gerenciar acesso
                    </button>
                    {!isSelf && (
                      <button
                        onClick={() => confirmDelete(u)}
                        disabled={deleteMutation.isPending}
                        title="Excluir usuário"
                        className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {editing && (
        <EditRoleModal
          user={editing}
          isSelf={session?.user.id === editing.id}
          onClose={() => setEditing(null)}
          onSave={(role, permissions) =>
            saveMutation.mutate({ userId: editing.id, role, permissions })
          }
          saving={saveMutation.isPending}
          errorMessage={
            saveMutation.isError ? (saveMutation.error as Error)?.message : null
          }
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function RoleBadge({ kind }: { kind: UserRoleKind }) {
  const styles: Record<UserRoleKind, string> = {
    admin: "bg-primary/15 text-primary",
    funcionario: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    cliente: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[kind]}`}>
      {ROLE_LABEL[kind]}
    </span>
  );
}

function EditRoleModal({
  user,
  isSelf,
  onClose,
  onSave,
  saving,
  errorMessage,
}: {
  user: AdminUserRow;
  isSelf: boolean;
  onClose: () => void;
  onSave: (role: UserRoleKind, permissions: PermissionKey[]) => void;
  saving: boolean;
  errorMessage: string | null;
}) {
  const initialKind = classifyRole(user.roles);
  const [role, setRole] = useState<UserRoleKind>(initialKind);
  const [perms, setPerms] = useState<PermissionKey[]>(
    (user.permissions as PermissionKey[]) ?? [],
  );

  function togglePerm(key: PermissionKey) {
    setPerms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">Gerenciar acesso</h2>
            <p className="truncate text-xs text-muted-foreground">
              {user.email ?? user.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Papel
            </p>
            <div className="grid gap-2">
              <RoleOption
                selected={role === "admin"}
                onClick={() => setRole("admin")}
                title="Administrador"
                description="Acesso total ao painel administrativo e a todos os recursos."
              />
              <RoleOption
                selected={role === "funcionario"}
                onClick={() => setRole("funcionario")}
                title="Funcionário"
                description="Acesso ao painel restrito às permissões marcadas abaixo."
              />
              <RoleOption
                selected={role === "cliente"}
                onClick={() => setRole("cliente")}
                title="Cliente"
                description="Nenhum acesso ao painel administrativo."
              />
            </div>
          </div>

          {role === "funcionario" && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Permissões específicas
              </p>
              <div className="space-y-2">
                {ALL_PERMISSIONS.map((p) => {
                  const active = perms.includes(p.key);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => togglePerm(p.key)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:bg-accent"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-5 w-5 place-items-center rounded-md border ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background"
                        }`}
                      >
                        {active && <Check className="h-3 w-3" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-none">{p.label}</p>
                        <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
                          {p.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {errorMessage && (
            <p className="rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-muted/20 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-xs font-semibold transition-colors hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(role, perms)}
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleOption({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:bg-accent"
      }`}
    >
      <div
        className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full border-2 ${
          selected ? "border-primary" : "border-border"
        }`}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-primary" />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold leading-none">{title}</p>
        <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  );
}
