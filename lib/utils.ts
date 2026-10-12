export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

/** Hanya izinkan redirect ke path internal (cegah open-redirect). */
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

/** Bangun URL dashboard dengan query yang digabung. `null`/"" menghapus key. */
export function dashboardHref(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | null | undefined>,
) {
  const merged: Record<string, string | null | undefined> = { ...base, ...overrides };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}
