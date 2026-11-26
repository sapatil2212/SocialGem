import type { FileHandle } from "node:fs/promises";
import { openStored } from "@/server/storage";

// Public on purpose: the social platforms fetch media from here. Names are long and random.
const HEADERS = { "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex", "Content-Security-Policy": "default-src 'none'; sandbox", "Accept-Ranges": "bytes" };
const missing = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const file = await openStored((await params).file);
  if (!file) return missing();

  // One byte range, as video players and some platform fetchers ask for.
  let start = 0;
  let end = file.size - 1;
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "");
  if (range && (range[1] || range[2])) {
    start = range[1] ? Number(range[1]) : Math.max(0, file.size - Number(range[2]));
    end = range[1] && range[2] ? Math.min(Number(range[2]), file.size - 1) : file.size - 1;
    if (start > end || start >= file.size) return new Response(null, { status: 416, headers: { ...HEADERS, "Content-Range": `bytes */${file.size}` } });
  }

  const handle = await file.handle().catch(() => null);
  if (!handle) return missing();
  return new Response(slice(handle, start, end), {
    status: range && (range[1] || range[2]) ? 206 : 200,
    headers: {
      ...HEADERS,
      "Content-Type": file.contentType,
      "Content-Length": String(end - start + 1),
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(range && (range[1] || range[2]) ? { "Content-Range": `bytes ${start}-${end}/${file.size}` } : {}),
    },
  });
}

// Reads only the asked-for part, in 256 KB pieces, and always closes the file.
function slice(handle: FileHandle, start: number, end: number) {
  let position = start;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const length = Math.min(256 * 1024, end - position + 1);
      if (length <= 0) {
        await handle.close();
        controller.close();
        return;
      }
      const { bytesRead, buffer } = await handle.read(new Uint8Array(length), 0, length, position);
      if (!bytesRead) {
        await handle.close();
        controller.close();
        return;
      }
      position += bytesRead;
      controller.enqueue(buffer.subarray(0, bytesRead));
    },
    async cancel() {
      await handle.close();
    },
  });
}
