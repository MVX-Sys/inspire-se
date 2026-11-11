import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChevronLeft, Save, Key, Mail, Phone, User } from "lucide-react";

export const Route = createFileRoute("/dados-conta")({
  head: () => ({
    meta: [
      { title: "Dados da Conta — Inspire-se" },
      { name: "description", content: "Gerencie seus dados e senha." },
    ],
  }),
  component: AccountDataPage,
});

function AccountDataPage() {
  const { session } = useAuth();
  const nav = useNavigate();
  const user = session?.user;

  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Metadados do usuário
  const [nome, setNome] = useState(user?.user_metadata?.nome || "");
  const [whatsapp, setWhatsapp] = useState(user?.user_metadata?.whatsapp || "");

  if (!session) {
    if (typeof window !== "undefined") nav({ to: "/auth" });
    return null;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        data: { nome, whatsapp }
      });
      if (error) throw error;
      toast.success("Dados atualizados com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error("As senhas não coincidem.");
    }
    if (password.length < 6) {
      return toast.error("A senha deve ter pelo menos 6 caracteres.");
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link to="/perfil" className="rounded-full p-2 hover:bg-muted">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-2xl font-bold">Dados da Conta</h1>
        </div>

        <div className="space-y-8">
          {/* Informações Pessoais */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Informações Pessoais</h2>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">E-mail (não pode ser alterado)</label>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user?.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nome completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Seu nome"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background pl-11 pr-4 py-3 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Salvar Alterações
              </button>
            </form>
          </section>

          {/* Alterar Senha */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Alterar Senha</h2>
            </div>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nova Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="No mínimo 6 caracteres"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Repita a nova senha"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.98] disabled:opacity-50"
              >
                <Key className="h-4 w-4" />
                Atualizar Senha
              </button>
            </form>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
