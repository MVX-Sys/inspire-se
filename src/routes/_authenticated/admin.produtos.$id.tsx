import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/product-form";

export const Route = createFileRoute("/_authenticated/admin/produtos/$id")({
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Editar produto
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Atualizar informações
        </h1>
      </div>
      <ProductForm produtoId={id} />
    </div>
  );
}

