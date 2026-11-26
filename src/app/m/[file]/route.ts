import { readMedia } from "@/server/ai/images";

// Public on purpose: the social platforms fetch media from here. Names are long and random.
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const bytes = await readMedia((await params).file);
  if (!bytes) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" } });
}
