import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { GET } from "../src/app/m/[file]/route";
import { mediaBase, openStored, sniff, storeUpload } from "../src/server/storage";

beforeAll(() => {
  process.env.STORAGE_PATH = mkdtempSync(join(tmpdir(), "sg-uploads-"));
});

const png = () => sharp({ create: { width: 40, height: 30, channels: 3, background: "#6d28d9" } }).png().toBuffer();
// The first bytes of a real MP4, then filler.
const mp4 = () => Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from("ftypisom"), Buffer.alloc(2000, 7)]);
const serve = (name: string, range?: string) => GET(new Request(`https://socialgem.online/m/${name}`, { headers: range ? { range } : {} }), { params: Promise.resolve({ file: name }) });

describe("what an upload is", () => {
  it("is judged by its bytes, not its name", async () => {
    expect(sniff(await png())).toBe("png");
    expect(sniff(mp4())).toBe("mp4");
    expect(sniff(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
  });

  it("refuses a web page dressed as an image", async () => {
    const fake = new File(["<svg onload=alert(1)>"], "cat.png", { type: "image/png" });
    await expect(storeUpload(fake)).rejects.toMatchObject({ status: 415 });
  });

  it("refuses empty and oversized files", async () => {
    await expect(storeUpload(new File([], "x.png"))).rejects.toMatchObject({ status: 400 });
    const big = new File([Buffer.concat([await png(), Buffer.alloc(11 * 1024 * 1024)])], "big.png");
    await expect(storeUpload(big)).rejects.toMatchObject({ status: 413 });
  });

  it("refuses a broken image", async () => {
    const broken = new File([Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)])], "x.png");
    await expect(storeUpload(broken)).rejects.toMatchObject({ status: 415 });
  });
});

describe("storing and serving", () => {
  it("re-encodes a photo and serves it", async () => {
    const stored = await storeUpload(new File([await png()], "photo.png", { type: "image/png" }));
    expect(stored).toMatchObject({ type: "image", contentType: "image/png", width: 40, height: 30 });
    expect(stored.name).toMatch(/^[a-f0-9]{32}\.png$/);
    expect(readdirSync(process.env.STORAGE_PATH!).some((f) => f.endsWith(".part"))).toBe(false);
    const response = await serve(stored.name);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width).toBe(40);
  });

  it("keeps a video as sent and serves parts of it", async () => {
    const bytes = mp4();
    const stored = await storeUpload(new File([bytes], "clip.mp4"));
    expect(stored).toMatchObject({ type: "video", contentType: "video/mp4", size: bytes.length });
    const whole = await serve(stored.name);
    expect(Buffer.from(await whole.arrayBuffer()).equals(bytes)).toBe(true);
    const part = await serve(stored.name, "bytes=4-11");
    expect(part.status).toBe(206);
    expect(part.headers.get("content-range")).toBe(`bytes 4-11/${bytes.length}`);
    expect(Buffer.from(await part.arrayBuffer()).toString()).toBe("ftypisom");
    expect((await serve(stored.name, `bytes=${bytes.length + 5}-`)).status).toBe(416);
  });

  it("never opens a name it did not make", async () => {
    for (const name of ["../.env", "..%2f.env", "a.png", `${"g".repeat(32)}.png`, `${"a".repeat(32)}.html`, `${"a".repeat(32)}.png.part`]) {
      expect(await openStored(name)).toBeNull();
    }
    expect((await serve(`${"a".repeat(32)}.png`)).status).toBe(404);
  });
});

describe("the public address", () => {
  it("prefers a configured https address, else the checked origin", () => {
    const saved = { ...process.env };
    process.env.APP_URL = "https://socialgem.online";
    expect(mediaBase("https://evil.example")).toBe("https://socialgem.online/m");
    delete process.env.APP_URL;
    delete process.env.MEDIA_PUBLIC_URL;
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    expect(mediaBase("https://socialgem.online")).toBe("https://socialgem.online/m");
    process.env = saved;
  });
});
