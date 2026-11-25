import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 2 ** 16;
const r = 8;
const p = 1;
const LENGTH = 64;

function derive(password: string, salt: Buffer, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, LENGTH, { ...options, maxmem: 256 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key)
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

let decoy: Promise<string> | undefined;

// Always does the same work, so timing does not reveal whether an account exists.
export async function verifyPassword(password: string, stored: string | null | undefined) {
  const hash = stored ?? (await (decoy ??= hashPassword(randomBytes(16).toString("hex"))));
  const [scheme, n, rr, pp, salt, key] = hash.split("$");
  if (scheme !== "scrypt") return false;
  const expected = Buffer.from(key, "base64url");
  const actual = await derive(password, Buffer.from(salt, "base64url"), { N: Number(n), r: Number(rr), p: Number(pp) });
  return timingSafeEqual(actual, expected) && Boolean(stored);
}
