import { supabase } from "@/integrations/supabase/client";
import { signImagesFn } from "@/lib/image-urls.functions";

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'origin';
  resize?: 'cover' | 'contain' | 'fill';
}

type Entry = { url: string; expires: number };

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<string>>();

const LS_KEY = "img-url-cache-v3";
const EXPIRES_IN = 60 * 60 * 24 * 7; // 7 dias
const SAFE_TTL = (EXPIRES_IN - 60 * 60 * 12) * 1000;

function keyOf(path: string, width?: number, quality?: number) {
  return `${path}|${width ?? 0}|${quality ?? 0}`;
}

// --- Cache persistente (sobrevive a recarregamentos e navegação) ---
let loaded = false;
function loadPersisted() {
  if (loaded || typeof localStorage === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const now = Date.now();
    const parsed = JSON.parse(raw) as Record<string, Entry>;
    for (const [k, v] of Object.entries(parsed)) {
      if (v && v.expires > now) cache.set(k, v);
    }
  } catch {
    /* cache corrompido: ignora */
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persist() {
  if (typeof localStorage === "undefined") return;
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const now = Date.now();
      const obj: Record<string, Entry> = {};
      for (const [k, v] of cache) if (v.expires > now) obj[k] = v;
      localStorage.setItem(LS_KEY, JSON.stringify(obj));
    } catch {
      try {
        localStorage.removeItem(LS_KEY);
      } catch {
        /* noop */
      }
    }
  }, 300);
}

/** Leitura síncrona do cache — evita "flicker" ao voltar para uma página. */
export function getCachedImageUrl(
  path: string | null | undefined,
  options?: ImageOptions,
): string {
  if (!path) return "";
  loadPersisted();
  const hit = cache.get(keyOf(path, options?.width, options?.quality));
  return hit && hit.expires > Date.now() ? hit.url : "";
}

// --- Batching: junta os pedidos do mesmo tick numa única chamada ---
type QueueItem = { path: string; resolve: (u: string) => void };
const queues = new Map<string, QueueItem[]>();
const scheduled = new Set<string>();

function flush(bucketKey: string, width?: number, quality?: number) {
  const batch = queues.get(bucketKey) ?? [];
  queues.delete(bucketKey);
  scheduled.delete(bucketKey);
  const paths = [...new Set(batch.map((b) => b.path))];
  if (paths.length === 0) return;

  const done = (urls: Map<string, string>) => {
    const now = Date.now();
    for (const p of paths) {
      const url = urls.get(p) ?? "";
      const k = keyOf(p, width, quality);
      if (url) cache.set(k, { url, expires: now + SAFE_TTL });
      inflight.delete(k);
    }
    persist();
    for (const b of batch) b.resolve(urls.get(b.path) ?? "");
  };

  const fallback = async (): Promise<Map<string, string>> => {
    const urls = new Map<string, string>();
    const { data } = await supabase.storage
      .from("product-images")
      .createSignedUrls(paths, EXPIRES_IN);
    for (const d of data ?? []) {
      if (d.signedUrl && d.path) urls.set(d.path, d.signedUrl);
    }
    return urls;
  };

  // Uma única requisição assina o lote inteiro já redimensionado.
  const chunks: string[][] = [];
  for (let i = 0; i < paths.length; i += 50) chunks.push(paths.slice(i, i + 50));

  Promise.all(
    chunks.map((chunk) =>
      signImagesFn({
        data: { paths: chunk, ...(width ? { width } : {}), ...(quality ? { quality } : {}) },
      }),
    ),
  )
    .then(async (results) => {
      const urls = new Map<string, string>();
      for (const r of results) {
        for (const [p, u] of Object.entries(r ?? {})) if (u) urls.set(p, u);
      }
      if (urls.size < paths.length) {
        try {
          const fb = await fallback();
          for (const [p, u] of fb) if (!urls.has(p)) urls.set(p, u);
        } catch {
          /* noop */
        }
      }
      done(urls);
    })
    .catch(async () => {
      try {
        done(await fallback());
      } catch {
        done(new Map());
      }
    });
}

export async function getImageUrl(
  path: string | null | undefined,
  options?: ImageOptions,
): Promise<string> {
  if (!path) return "";
  loadPersisted();

  const width = options?.width;
  const quality = options?.quality;
  const k = keyOf(path, width, quality);

  const hit = cache.get(k);
  if (hit && hit.expires > Date.now()) return hit.url;

  const pending = inflight.get(k);
  if (pending) return pending;

  const bucketKey = `${width ?? 0}|${quality ?? 0}`;
  const promise = new Promise<string>((resolve) => {
    const q = queues.get(bucketKey) ?? [];
    q.push({ path, resolve });
    queues.set(bucketKey, q);
    if (!scheduled.has(bucketKey)) {
      scheduled.add(bucketKey);
      queueMicrotask(() => flush(bucketKey, width, quality));
    }
  });
  inflight.set(k, promise);
  return promise;
}

/** Aquece o cache de várias imagens de uma só vez (1 requisição). */
export function prefetchImageUrls(
  paths: (string | null | undefined)[],
  options?: ImageOptions,
) {
  for (const p of paths) if (p) void getImageUrl(p, options);
}

export async function getImageUrls(paths: (string | null | undefined)[]): Promise<string[]> {
  return Promise.all(paths.map((p) => getImageUrl(p)));
}



export async function uploadImage(file: File): Promise<string> {
  const { processImageFile } = await import("@/lib/images");
  const processed = await processImageFile(file);
  const ext = processed.name.split(".").pop() ?? "webp";
  const path = `uploads/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, processed, { upsert: false, contentType: processed.type, cacheControl: "31536000" });
  if (error) throw error;
  return path;
}

function sanitize(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "imagem";
}

function extFromUrl(url: string, fallback = "jpg") {
  try {
    const pathname = new URL(url).pathname;
    const m = pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    if (m) return m[1].toLowerCase();
  } catch {}
  return fallback;
}

export async function downloadImage(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao baixar imagem");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  const ext = extFromUrl(url, blob.type.split("/")[1] || "jpg");
  a.download = `${sanitize(filename)}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

export async function downloadImagesAsZip(
  urls: string[],
  baseName: string,
) {
  if (urls.length === 0) return;
  if (urls.length === 1) {
    return downloadImage(urls[0], baseName);
  }
  const [{ default: JSZip }] = await Promise.all([import("jszip")]);
  const zip = new JSZip();
  const folder = zip.folder(sanitize(baseName)) ?? zip;
  await Promise.all(
    urls.map(async (u, i) => {
      const res = await fetch(u);
      if (!res.ok) return;
      const blob = await res.blob();
      const ext = extFromUrl(u, blob.type.split("/")[1] || "jpg");
      folder.file(`${sanitize(baseName)}-${String(i + 1).padStart(2, "0")}.${ext}`, blob);
    }),
  );
  const content = await zip.generateAsync({ type: "blob" });
  const objectUrl = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `${sanitize(baseName)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

/**
 * Baixa um arquivo .zip contendo as imagens de todos os produtos do pedido,
 * organizadas em uma pasta por produto.
 */
export async function downloadOrderImagesZip(
  items: { produtoId: string; nome: string; foto?: string | null }[],
  baseName = "imagens-pedido",
): Promise<boolean> {
  if (items.length === 0) return false;

  // Produtos únicos do pedido
  const produtos = new Map<string, string>();
  for (const i of items) if (!produtos.has(i.produtoId)) produtos.set(i.produtoId, i.nome);

  // Busca todas as imagens dos produtos no banco
  const ids = [...produtos.keys()];
  let paths = new Map<string, string[]>();
  try {
    const { data } = await supabase
      .from("imagens_produto")
      .select("produto_id,storage_path,principal,ordem")
      .in("produto_id", ids)
      .order("ordem");
    for (const row of data ?? []) {
      const list = paths.get(row.produto_id) ?? [];
      list.push(row.storage_path);
      paths.set(row.produto_id, list);
    }
  } catch (e) {
    console.error("Erro ao buscar imagens do pedido:", e);
  }

  // Fallback: foto já presente no item do carrinho
  for (const i of items) {
    if (!paths.get(i.produtoId)?.length && i.foto) paths.set(i.produtoId, [i.foto]);
  }

  const [{ default: JSZip }] = await Promise.all([import("jszip")]);
  const zip = new JSZip();
  let count = 0;

  await Promise.all(
    [...produtos.entries()].map(async ([produtoId, nome]) => {
      const list = paths.get(produtoId) ?? [];
      if (list.length === 0) return;
      const folder = zip.folder(sanitize(nome)) ?? zip;
      await Promise.all(
        list.map(async (p, idx) => {
          try {
            const url = await getImageUrl(p);
            if (!url) return;
            const res = await fetch(url);
            if (!res.ok) return;
            const blob = await res.blob();
            const ext = extFromUrl(p, blob.type.split("/")[1] || "jpg");
            folder.file(`${sanitize(nome)}-${String(idx + 1).padStart(2, "0")}.${ext}`, blob);
            count++;
          } catch (e) {
            console.error("Erro ao adicionar imagem no zip:", e);
          }
        }),
      );
    }),
  );

  if (count === 0) return false;

  const content = await zip.generateAsync({ type: "blob" });
  const objectUrl = URL.createObjectURL(content);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = objectUrl;
  a.download = `${sanitize(baseName)}-${stamp}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  return true;
}
