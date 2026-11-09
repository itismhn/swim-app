import { getViewer } from "@/server/auth";
import { db } from "@/server/db";

/** Serves an exercise image/video to signed-in users only. The exercise library is shared academy content. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getViewer())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const m = await db.exerciseMedia.findUnique({ where: { id } });
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(m.data), {
    headers: {
      "Content-Type": m.mime,
      "Content-Length": String(m.size),
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
