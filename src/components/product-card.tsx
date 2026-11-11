import { Link } from "@tanstack/react-router";
import { useEffect, useState, memo } from "react";
import { brl } from "@/lib/format";
import { getCachedImageUrl, getImageUrl } from "@/lib/storage";
import { getPromoInfo, isEsgotado, type ProductListItem } from "@/lib/products";

const CARD_IMG = { width: 600, quality: 72 } as const;

export const ProductCard = memo(function ProductCard({
  p,
  priority = false,
}: {
  p: ProductListItem;
  priority?: boolean;
}) {
  const esgotado = isEsgotado(p);
  const promo = getPromoInfo(p);
  const principal =
    p.imagens.find((i) => i.principal) ??
    [...p.imagens].sort((a, b) => a.ordem - b.ordem)[0];

  const [img, setImg] = useState<string>(() =>
    getCachedImageUrl(principal?.storage_path, CARD_IMG),
  );

  useEffect(() => {
    if (!principal) return;
    const cached = getCachedImageUrl(principal.storage_path, CARD_IMG);
    if (cached) {
      setImg(cached);
      return;
    }
    let alive = true;
    getImageUrl(principal.storage_path, CARD_IMG).then((u) => {
      if (alive) setImg(u);
    });
    return () => {
      alive = false;
    };
  }, [principal]);

  return (
    <Link
      to="/produto/$id"
      params={{ id: p.id }}
      className="group block focus:outline-none"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-showcase">
        {img ? (
          <img
            src={img}
            alt={p.nome}
            width={600}
            height={750}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "low"}
            decoding="async"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="skeleton h-full w-full" />
        )}



        {/* Subtle bottom gradient for legibility of badges/prices over image */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex flex-col gap-1.5">
          {esgotado ? (
            <span className="rounded-full bg-foreground/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-background shadow-sm backdrop-blur-sm">
              Esgotado
            </span>
          ) : (
            <>
              {promo.ativa && (
                <span className="bg-foreground px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-background">
                  {promo.percentual}% OFF
                </span>
              )}
              {p.novidade && (
                <span className="bg-primary px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-primary-foreground">
                  Novidade
                </span>
              )}
            </>
          )}
        </div>

        {esgotado && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-[2px]">
            <span className="rotate-[-8deg] rounded-md bg-foreground/95 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-background shadow-lg">
              Esgotado
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1 px-0.5 text-center">
        <h3 className={`line-clamp-1 text-[13px] font-medium leading-snug transition-colors sm:text-sm ${esgotado ? "text-muted-foreground" : "text-foreground group-hover:text-primary"}`}>
          {p.nome}
        </h3>
        {promo.ativa && !esgotado ? (
          <div className="flex items-baseline justify-center gap-2">
            <p className="text-xs tabular-nums text-muted-foreground line-through">{brl(promo.precoOriginal)}</p>
            <p className="text-base font-bold tabular-nums text-foreground">{brl(promo.precoFinal)}</p>
          </div>
        ) : (
          <p className={`text-base font-bold tabular-nums ${esgotado ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {brl(p.preco)}
          </p>
        )}
        {!esgotado && (
          <p className="text-[11px] tabular-nums text-muted-foreground">
            Até 12x de {brl((promo.ativa ? promo.precoFinal : p.preco) / 12)}
          </p>
        )}
        {!esgotado && (promo.ativa || p.novidade) && (
          <span className="inline-block rounded-full bg-foreground px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-background">
            {promo.ativa ? "Oferta" : "Lançamento"}
          </span>
        )}
      </div>
    </Link>
  );
});




export function ProductCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[4/5] rounded-xl" />
      <div className="mt-3 space-y-2 px-0.5">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/3 rounded" />
      </div>
    </div>
  );
}
