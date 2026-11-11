import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CartDrawer } from "@/components/cart-drawer";
import { ProductCard } from "@/components/product-card";
import { listCategoriasFn, listProdutosFn } from "@/lib/products.functions";
import logoInspire from "@/assets/inspire-se-icon.png";
import regataCapa from "@/assets/regata-capa.jpg.asset.json";
import { isEsgotado, type ProductListItem, type Categoria, getPromoInfo } from "@/lib/products";
import { getSiteConfig } from "@/lib/config-site";
import { getImageUrl } from "@/lib/storage";
import { brl } from "@/lib/format";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["categorias"],
        queryFn: () => listCategoriasFn(),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["produtos"],
        queryFn: () => listProdutosFn(),
      }),
    ]);
  },
  head: () => ({
    meta: [
      { title: "INSPIRE-SE — Ofertas e mais vendidos" },
      {
        name: "description",
        content: "INSPIRE-SE: ofertas, lançamentos e os mais vendidos da semana.",
      },
      { property: "og:title", content: "INSPIRE-SE — Ofertas e mais vendidos" },
      { property: "og:description", content: "Atacado para todo o Brasil: novidades e ofertas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: config } = useQuery({
    queryKey: ["site-config"],
    queryFn: getSiteConfig,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 30, // renova as URLs assinadas do banner antes de expirarem
  });
  const { data: categorias = [] } = useSuspenseQuery({
    queryKey: ["categorias"],
    queryFn: () => listCategoriasFn(),
    staleTime: 1000 * 60 * 5,
  });
  const { data: produtos = [] } = useSuspenseQuery({
    queryKey: ["produtos"],
    queryFn: () => listProdutosFn(),
    staleTime: 1000 * 30,

  });

  const escolhidos = (ids: string[] | undefined) =>
    (ids ?? [])
      .map((id) => produtos.find((p: ProductListItem) => p.id === id))
      .filter((p): p is ProductListItem => !!p && p.ativo && !isEsgotado(p));

  const novidades = useMemo(() => {
    const sel = escolhidos(config?.destaques_novidades);
    if (sel.length > 0) return sel;
    return produtos.filter((p: ProductListItem) => p.ativo && p.novidade && !isEsgotado(p)).slice(0, 4);
  }, [produtos, config?.destaques_novidades]);

  const melhoresOfertas = useMemo(() => {
    const sel = escolhidos(config?.destaques_ofertas);
    if (sel.length > 0) return sel;
    return produtos.filter((p: ProductListItem) => p.ativo && getPromoInfo(p).ativa && !isEsgotado(p))
      .sort((a: ProductListItem, b: ProductListItem) => getPromoInfo(b).percentual - getPromoInfo(a).percentual)
      .slice(0, 4);
  }, [produtos, config?.destaques_ofertas]);

  return (
    <div className="dark min-h-screen bg-background font-body text-foreground">
      <SiteHeader />
      
      <HeroSection config={config} produtos={produtos} />

      <main>
        <ProductSection 
          title={["Mais", "Vendidos"]} 
          highlightIndex={0} 
          products={novidades} 
          emptyMessage="Não há novidades disponíveis no momento"
        />

        <ProductSection 
          title={["Melhores", "Ofertas"]} 
          highlightIndex={1} 
          products={melhoresOfertas} 
          isPromo
          emptyMessage="Não há ofertas disponíveis no momento"
        />

        <CategoriesSection categorias={categorias} produtos={produtos} />
      </main>

      <SiteFooter />
      <CartDrawer />
    </div>
  );
}

const BAND_ITEMS = ["Frete para todo o Brasil", "Até durar o estoque", "Ofertas da semana", "INSPIRE-SE", "Novidades toda semana"];

function Band({ className, reverse }: { className: string; reverse?: boolean }) {
  const items = [...BAND_ITEMS, ...BAND_ITEMS, ...BAND_ITEMS, ...BAND_ITEMS];
  return (
    <div className={`pointer-events-none absolute left-[-10%] z-10 w-[120%] overflow-hidden py-2 md:py-3 ${className}`} aria-hidden>
      <div className={`flex w-max animate-marquee gap-8 whitespace-nowrap ${reverse ? "[animation-direction:reverse]" : ""}`}>
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-8 font-impact text-sm uppercase md:text-2xl">
            {t}<span className="opacity-60">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function HeroSection({ config, produtos }: { config?: any; produtos: ProductListItem[] }) {
  const slides = config?.hero_slides || [];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setCurrent((prev) => (prev + 1) % slides.length), 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const menorPreco = useMemo(() => {
    const precos = produtos
      .filter((p) => p.ativo && !isEsgotado(p))
      .map((p) => (getPromoInfo(p).ativa ? getPromoInfo(p).precoFinal : p.preco));
    return precos.length ? Math.min(...precos) : null;
  }, [produtos]);

  const slide = slides[current];
  const titulo: string = slide?.titulo || "Ofertas INSPIRE-SE";
  const palavras = titulo.split(" ");
  const nextSlide = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <section className="relative w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse at 30% 55%, color-mix(in oklab, var(--hot) 45%, transparent), transparent 60%)" }} />

      <Band className="top-6 -rotate-[6deg] bg-hot text-hot-foreground md:top-10" />
      <Band reverse className="bottom-6 rotate-[3deg] bg-primary text-primary-foreground md:bottom-10" />

      <div className="relative z-20 mx-auto grid min-h-[560px] max-w-7xl items-center gap-8 px-4 py-28 md:min-h-[640px] md:grid-cols-2 md:py-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide?.id ?? "fallback"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-hot" /> INSPIRE-SE · Ofertas
            </span>
            <h1 className="mt-4 font-impact text-5xl uppercase leading-[0.95] md:text-7xl">
              {palavras.map((w, i) => (
                <span key={i} className={i >= Math.ceil(palavras.length / 2) ? "text-lime" : ""}>{w} </span>
              ))}
            </h1>
            {menorPreco !== null && (
              <p className="mt-3 font-impact text-3xl uppercase text-hot md:text-5xl">
                A partir de {brl(menorPreco)}
              </p>
            )}
            {slide?.subtitulo && (
              <p className="mt-4 max-w-md text-sm text-muted-foreground md:text-base">{slide.subtitulo}</p>
            )}
            <Link
              to="/produtos"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
            >
              Ver ofertas <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </AnimatePresence>

        <div className="relative hidden aspect-square md:block">
          {slide?.tipo === "video" && slide.media_url ? (
            <video src={slide.media_url} autoPlay loop muted playsInline className="h-full w-full rounded-3xl object-cover" />
          ) : slide?.tipo === "image" && slide.media_url ? (
            <img src={slide.media_url} alt={slide.titulo} className="h-full w-full rounded-3xl object-cover" fetchPriority="high" />
          ) : (
            <img src={logoInspire} alt="INSPIRE-SE" className="mx-auto h-full w-3/4 object-contain opacity-90 invert" />
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button onClick={prevSlide} className="absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full border border-border bg-card/60 p-2 text-foreground backdrop-blur-sm hover:border-primary" aria-label="Slide anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={nextSlide} className="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full border border-border bg-card/60 p-2 text-foreground backdrop-blur-sm hover:border-primary" aria-label="Próximo slide">
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </section>
  );
}

interface ProductSectionProps {
  title: [string, string];
  highlightIndex: number;
  products: ProductListItem[];
  subtitle?: string;
  isPromo?: boolean;
  emptyMessage?: string;
}

function ProductSection({ title, highlightIndex, products, subtitle, isPromo, emptyMessage }: ProductSectionProps) {
  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
          <h2 className="font-impact text-4xl uppercase md:text-6xl">
            {title.map((word, i) => (
              <span key={i} className={i === highlightIndex && isPromo ? "text-lime" : ""}>
                {word}{" "}
              </span>
            ))}
          </h2>
          {subtitle && (
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
              {products.map((p, i) => (
                <ProductCard key={p.id} p={p} priority={i < 4} />
              ))}

            </div>

            <div className="mt-10 text-center md:mt-16">
              <Link
                to="/produtos"
                className="inline-flex items-center gap-2 font-display text-sm font-black uppercase tracking-widest text-foreground transition-colors hover:text-primary"
              >
                {subtitle ? "Ver Catálogo Completo" : "Ver todos"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center opacity-60">
            <p className="font-display text-lg font-medium text-muted-foreground italic">
              {emptyMessage}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function capaFallback(cat: Categoria): string | null {
  const alvo = `${cat.nome ?? ""} ${cat.slug ?? ""}`.toLowerCase();
  return alvo.includes("regata") ? regataCapa.url : null;
}

function CategoriesSection({ categorias, produtos }: { categorias: Categoria[]; produtos: ProductListItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Para cada categoria: produto com maior estoque total -> imagem principal
  const capaPorCategoria = useMemo(() => {
    const melhor = new Map<string, { estoque: number; path: string }>();
    for (const p of produtos) {
      if (!p.ativo || !p.categoria_id) continue;
      const estoque = (p.variacoes ?? []).reduce((s, v) => s + (v.quantidade_estoque ?? 0), 0);
      const imgs = [...(p.imagens ?? [])].sort(
        (a, b) => Number(b.principal) - Number(a.principal) || a.ordem - b.ordem,
      );
      const path = imgs[0]?.storage_path;
      if (!path) continue;
      const atual = melhor.get(p.categoria_id);
      if (!atual || estoque > atual.estoque) melhor.set(p.categoria_id, { estoque, path });
    }
    const out: Record<string, string> = {};
    melhor.forEach((v, k) => (out[k] = v.path));
    return out;
  }, [produtos]);

  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    const paths = Object.values(capaPorCategoria);
    if (paths.length === 0) return;
    Promise.all(
      Object.entries(capaPorCategoria).map(async ([catId, path]) => {
        const url = await getImageUrl(path, { width: 600, quality: 70 });
        return [catId, url] as const;
      }),
    ).then((pares) => {
      if (!alive) return;
      setUrls(Object.fromEntries(pares.filter(([, u]) => !!u)));
    });
    return () => {
      alive = false;
    };
  }, [capaPorCategoria]);


  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth / 2 
        : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-12 md:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-12 flex items-end justify-between md:mb-16">
          <h2 className="font-impact text-4xl uppercase md:text-6xl">
            Categorias
          </h2>
          
          <div className="hidden items-center gap-2 md:flex">
            <button 
              onClick={() => scroll('left')}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
        >
          {categorias.map((cat) => (
            <Link
              key={cat.id}
              to="/produtos"
              search={{ cat: cat.slug }}
              className="group relative flex aspect-video min-w-[240px] flex-none snap-start items-center justify-center overflow-hidden rounded-2xl bg-muted transition-all hover:ring-2 hover:ring-primary md:min-w-[300px]"
            >
              {(urls[cat.id] || capaFallback(cat)) && (
                <img
                  src={urls[cat.id] || capaFallback(cat)!}
                  alt={cat.nome}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 z-0 bg-navy/60 transition-colors group-hover:bg-navy/40" />
              <span className="relative z-10 font-display text-xl font-black uppercase tracking-tighter text-white transition-transform group-hover:scale-110">
                {cat.nome}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}