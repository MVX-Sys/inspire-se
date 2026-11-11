import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { 
  listCategorias as listCategoriasServer, 
  listProdutos as listProdutosServer, 
  getProduto as getProdutoServer 
} from "./products.server";

// Simple in-memory cache for server functions (TTL 60 seconds)
const CACHE_TTL = 60 * 1000;
let cache: Record<string, { data: any; timestamp: number }> = {};

function getCached(key: string) {
  const entry = cache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setCache(key: string, data: any) {
  cache[key] = { data, timestamp: Date.now() };
}

export const listCategoriasFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const cached = getCached("categorias");
    if (cached) return cached;
    
    const data = await listCategoriasServer();
    setCache("categorias", data);
    return data;
  });

export const listProdutosFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const cached = getCached("produtos");
    if (cached) return cached;
    
    const data = await listProdutosServer();
    setCache("produtos", data);
    return data;
  });

export const getProdutoFn = createServerFn({ method: "GET" })
  .inputValidator((id: unknown) => z.string().parse(id))
  .handler(async ({ data: id }) => {
    const cacheKey = `produto:${id}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    
    const data = await getProdutoServer(id);
    setCache(cacheKey, data);
    return data;
  });
