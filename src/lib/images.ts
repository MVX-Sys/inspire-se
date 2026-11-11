import { toast } from "sonner";

export const SUPPORTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".avif", ".jxl"];
export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif", "image/jxl"];

export const isHeic = (f: File) =>
  /\.hei[cf]$/i.test(f.name) || /image\/hei[cf]/i.test(f.type);

export const convertHeic = async (f: File): Promise<File> => {
  try {
    const heic2any = (await import("heic2any")).default;
    const blob = (await heic2any({ 
      blob: f, 
      toType: "image/jpeg", 
      quality: 0.9 
    })) as Blob;
    
    const newName = f.name.replace(/\.hei[cf]$/i, ".jpg");
    return new File([blob], newName, { type: "image/jpeg" });
  } catch (err) {
    console.error("HEIC conversion failed", err);
    throw new Error(`Falha ao converter HEIC: ${f.name}`);
  }
};

/** Largura/altura máxima após a conversão (mantém proporção). */
const MAX_DIMENSION = 2000;
const WEBP_QUALITY = 0.82;

export const isWebp = (f: File) =>
  /\.webp$/i.test(f.name) || f.type === "image/webp";

/** Converte qualquer imagem para WebP no navegador (canvas). */
export const convertToWebp = async (f: File): Promise<File> => {
  if (isWebp(f)) return f;
  if (typeof document === "undefined") return f;

  try {
    const bitmap = await createImageBitmap(f);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return f;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );
    if (!blob || blob.type !== "image/webp") return f;
    // Se por algum motivo ficar maior que o original, mantém o original
    if (blob.size >= f.size && /\.(jpe?g)$/i.test(f.name)) return f;

    const newName = f.name.replace(/\.[a-z0-9]+$/i, "") + ".webp";
    return new File([blob], newName, { type: "image/webp" });
  } catch (err) {
    console.error("WebP conversion failed", err);
    return f;
  }
};

export const processImageFile = async (file: File): Promise<File> => {
  let f = file;
  if (isHeic(f)) {
    toast.info(`Convertendo ${f.name}...`);
    f = await convertHeic(f);
  }
  return await convertToWebp(f);
};

