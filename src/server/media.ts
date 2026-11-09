/** Upload validation for exercise media: size limit + file-signature ("magic bytes") check. */
export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

const startsWith = (b: Uint8Array, sig: number[], offset = 0) => sig.every((x, i) => b[offset + i] === x);

/** Returns the real MIME type from the file's bytes, or null if it isn't an allowed type. */
export function sniffMediaType(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | null {
  if (startsWith(b, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (startsWith(b, [0x66, 0x74, 0x79, 0x70], 4)) return "video/mp4"; // ISO-BMFF "ftyp" box
  return null;
}

export async function readMediaFile(file: unknown): Promise<{ ok: true; mime: string; data: Uint8Array } | { ok: false; error: string } | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_MEDIA_BYTES) return { ok: false, error: "حجم فایل حداکثر ۴ مگابایت است" };
  const data = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMediaType(data);
  if (!mime) return { ok: false, error: "فقط تصویر JPG، PNG، WebP یا ویدیوی MP4 مجاز است" };
  return { ok: true, mime, data };
}
