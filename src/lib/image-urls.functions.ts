import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
export const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 dias

const schema = z.object({
  paths: z.array(z.string()).min(1).max(60),
  width: z.number().int().min(16).max(2000).optional(),
  quality: z.number().int().min(20).max(100).optional(),
});

type Entry = { url: string; expires: number };
const memo = new Map<string, Entry>();

function keyOf(path: string, width?: number, quality?: number) {
  return `${path}|${width ?? 0}|${quality ?? 0}`;
}

export const signImagesFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
    const out: Record<string, string> = {};
    if (!url || !key) return out;

    const now = Date.now();
    const missing: string[] = [];
    for (const p of [...new Set(data.paths)]) {
      const hit = memo.get(keyOf(p, data.width, data.quality));
      if (hit && hit.expires > now) out[p] = hit.url;
      else missing.push(p);
    }
    if (missing.length === 0) return out;

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const transform =
      data.width || data.quality
        ? { width: data.width, quality: data.quality ?? 72, resize: "contain" as const }
        : undefined;

    await Promise.all(
      missing.map(async (p) => {
        try {
          const { data: signed } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(p, SIGNED_TTL, transform ? { transform } : undefined);
          if (signed?.signedUrl) {
            out[p] = signed.signedUrl;
            memo.set(keyOf(p, data.width, data.quality), {
              url: signed.signedUrl,
              // renova com folga antes de expirar
              expires: now + (SIGNED_TTL - 60 * 60 * 12) * 1000,
            });
          }
        } catch {
          /* ignora imagem individual */
        }
      }),
    );

    return out;
  });
