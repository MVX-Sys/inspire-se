import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Package, 
  History, 
  CheckCircle, 
  Settings, 
  LogOut, 
  ChevronRight,
  ChevronLeft,
  RefreshCcw,

  ShoppingBag
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — Inspire-se" },
      { name: "description", content: "Gerencie sua conta, pedidos e solicitações." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { session } = useAuth();
  const user = session?.user;
  const nav = useNavigate();

  useEffect(() => {
    if (!session) {
      nav({ to: "/auth" });
    }
  }, [session, nav]);

  if (!session) return null;

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Saiu da conta.");
    nav({ to: "/" });
  };

  const menuItems = [
    {
      title: "Histórico de Pedidos",
      description: "Veja todos os seus pedidos realizados",
      icon: History,
      color: "text-blue-500",
      bg: "bg-blue-50",
      href: "/pedidos",
    },
    {
      title: "Compras Aprovadas",
      description: "Itens confirmados e em preparação",
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-50",
      href: "/pedidos",
    },
    {
      title: "Reposições Pedidas",
      description: "Acompanhe seus pedidos de 'Avise-me'",
      icon: RefreshCcw,
      color: "text-orange-500",
      bg: "bg-orange-50",
      href: "/reposicoes",
    },
    {
      title: "Dados da Conta",
      description: "Altere sua senha e informações",
      icon: Settings,
      color: "text-gray-500",
      bg: "bg-gray-50",
      href: "/dados-conta",
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30 pb-20 pt-0 md:pt-0">
      <div className="fixed top-4 left-4 z-50">
        <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/30 active:scale-90">
          <ChevronLeft className="h-6 w-6" />
        </Link>
      </div>


      {/* Header */}
      <div className="bg-primary pt-10 pb-20 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
            <User className="h-10 w-10" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            Olá, {user?.email?.split('@')[0]}
          </h1>
          <p className="mt-1 text-sm text-white/70">{user?.email}</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto -mt-10 max-w-2xl px-4">
        <div className="grid gap-4">
          {menuItems.map((item, idx) => (
            <Link
              key={idx}
              to={item.href as any}
              className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.bg}`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          ))}

          <button
            onClick={signOut}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 py-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </button>
        </div>

        {/* Quick access to shop */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ShoppingBag className="h-4 w-4" />
            Continuar comprando
          </Link>
        </div>
      </div>
    </div>
  );
}