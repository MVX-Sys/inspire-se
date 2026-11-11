import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/product-form";

export const Route = createFileRoute("/_authenticated/admin/produtos/novo")({
  component: () => (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Cadastrar
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Novo produto
        </h1>
      </div>
      <ProductForm />
    </div>
  ),
});
