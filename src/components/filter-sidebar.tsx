import { useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import type { Categoria } from "@/lib/products";
import { brl } from "@/lib/format";

export type Filters = {
  q: string;
  categoriaSlug: string | null;
  novidades: boolean;
  promocao: boolean;
  precoMin: number;
  precoMax: number;
  ordem: "recentes" | "menor-preco" | "maior-preco" | "nome";
};

export const defaultFilters: Filters = {
  q: "",
  categoriaSlug: null,
  novidades: false,
  promocao: false,
  precoMin: 0,
  precoMax: 500,
  ordem: "recentes",
};

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-4 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2 text-xs font-semibold uppercase tracking-wider text-foreground"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ${
          open ? "grid-rows-[1fr] pt-3 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function FilterContent({
  categorias,
  filters,
  onChange,
}: {
  categorias: Categoria[];
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    onChange({ ...filters, [k]: v });

  const activeCount =
    (filters.categoriaSlug ? 1 : 0) +
    (filters.novidades ? 1 : 0) +
    (filters.promocao ? 1 : 0) +
    (filters.precoMax < 500 ? 1 : 0);

  return (
    <>
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1.5 text-[10px] font-bold text-background">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={() => onChange(defaultFilters)}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Limpar
          </button>
        )}
      </div>

      <Section title="Destaques">
        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground/80 hover:text-foreground">
            <input
              type="checkbox"
              checked={filters.novidades}
              onChange={(e) => set("novidades", e.target.checked)}
              className="h-3.5 w-3.5 accent-foreground"
            />
            Novidades
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground/80 hover:text-foreground">
            <input
              type="checkbox"
              checked={filters.promocao}
              onChange={(e) => set("promocao", e.target.checked)}
              className="h-3.5 w-3.5 accent-foreground"
            />
            Em promoção
          </label>
        </div>
      </Section>

      <Section title="Ordenar">
        <div className="space-y-1.5">
          {(
            [
              ["recentes", "Relevância"],
              ["menor-preco", "Menor preço"],
              ["maior-preco", "Maior preço"],
              ["nome", "Nome (A–Z)"],
            ] as const
          ).map(([val, label]) => (
            <label
              key={val}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground/80 hover:text-foreground"
            >
              <input
                type="radio"
                checked={filters.ordem === val}
                onChange={() => set("ordem", val)}
                className="h-3.5 w-3.5 accent-foreground"
              />
              {label}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Preço">
        <div className="space-y-3 pt-1">
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                De
              </span>
              <div className="flex items-center rounded-md border border-border bg-background px-2 focus-within:border-foreground">
                <span className="text-xs text-muted-foreground">R$</span>
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={filters.precoMin || ""}
                  placeholder="0"
                  onChange={(e) =>
                    set("precoMin", Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-full bg-transparent px-1.5 py-1.5 text-sm outline-none"
                />
              </div>
            </label>
            <span className="pb-2 text-muted-foreground">—</span>
            <label className="flex-1">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Até
              </span>
              <div className="flex items-center rounded-md border border-border bg-background px-2 focus-within:border-foreground">
                <span className="text-xs text-muted-foreground">R$</span>
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={filters.precoMax || ""}
                  placeholder="500"
                  onChange={(e) =>
                    set("precoMax", Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-full bg-transparent px-1.5 py-1.5 text-sm outline-none"
                />
              </div>
            </label>
          </div>
          {(filters.precoMin > 0 || filters.precoMax !== 500) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {brl(filters.precoMin)} — {brl(filters.precoMax || 0)}
              </span>
              <button
                onClick={() => {
                  set("precoMin", 0);
                  set("precoMax", 500);
                }}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Redefinir
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section title="Categorias">
        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground/80 hover:text-foreground">
            <input
              type="radio"
              checked={filters.categoriaSlug === null}
              onChange={() => set("categoriaSlug", null)}
              className="h-3.5 w-3.5 accent-foreground"
            />
            Todas
          </label>
          {categorias.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground/80 hover:text-foreground"
            >
              <input
                type="radio"
                checked={filters.categoriaSlug === c.slug}
                onChange={() => set("categoriaSlug", c.slug)}
                className="h-3.5 w-3.5 accent-foreground"
              />
              {c.nome}
            </label>
          ))}
        </div>
      </Section>
    </>
  );
}

export function FilterSidebar({
  categorias,
  filters,
  onChange,
}: {
  categorias: Categoria[];
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount =
    (filters.categoriaSlug ? 1 : 0) +
    (filters.novidades ? 1 : 0) +
    (filters.promocao ? 1 : 0) +
    (filters.precoMax < 500 ? 1 : 0);

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="mb-4 flex items-center gap-2 self-start rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm md:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filtros
        {activeCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1.5 text-[10px] font-bold text-background">
            {activeCount}
          </span>
        )}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden md:block">
        <div className="sticky top-24 space-y-1 rounded-xl border border-border bg-card p-4 lg:top-40 lg:p-5">
          <FilterContent
            categorias={categorias}
            filters={filters}
            onChange={onChange}
          />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-background p-5 shadow-2xl animate-fade-in-up">
            <div className="mb-2 flex items-center justify-between">
              <div className="mx-auto h-1 w-10 rounded-full bg-border" />
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1.5 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <FilterContent
              categorias={categorias}
              filters={filters}
              onChange={onChange}
            />
            <button
              onClick={() => setMobileOpen(false)}
              className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground"
            >
              Ver resultados
            </button>

          </div>
        </div>
      )}
    </>
  );
}
