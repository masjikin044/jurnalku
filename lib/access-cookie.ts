import { createHmac, timingSafeEqual } from "crypto";

/**
 * Cookie akses untuk jurnal ber-password.
 * Format token: `${expiry}.${hmac}` — HMAC dihitung dari id jurnal + expiry + hash password,
 * sehingga mengganti password otomatis membatalkan semua akses yang sudah diberikan.
 */

export const ACCESS_TTL_SECONDS = 60 * 60 * 24; // 24 jam

function secret(): string {
  const s = process.env.JOURNAL_COOKIE_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "JOURNAL_COOKIE_SECRET belum diisi atau terlalu pendek (minimal 16 karakter).",
    );
  }
  return s;
}

export function accessCookieName(journalId: string): string {
  return `jpa_${journalId.replace(/-/g, "").slice(0, 16)}`;
}

function sign(journalId: string, exp: number, passwordHash: string): string {
  return createHmac("sha256", secret())
    .update(`${journalId}.${exp}.${passwordHash}`)
    .digest("hex");
}

export function createAccessToken(journalId: string, passwordHash: string): string {
  const exp = Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS;
  return `${exp}.${sign(journalId, exp, passwordHash)}`;
}

export function verifyAccessToken(
  token: string | undefined,
  journalId: string,
  passwordHash: string,
): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!sig || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const expected = Buffer.from(sign(journalId, exp, passwordHash), "hex");
  let given: Buffer;
  try {
    given = Buffer.from(sig, "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}
