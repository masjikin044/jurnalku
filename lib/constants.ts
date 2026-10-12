export const MOODS = [
  { key: "senang", label: "Senang", emoji: "😊" },
  { key: "bersyukur", label: "Bersyukur", emoji: "🥰" },
  { key: "semangat", label: "Semangat", emoji: "🤩" },
  { key: "tenang", label: "Tenang", emoji: "😌" },
  { key: "biasa", label: "Biasa saja", emoji: "😐" },
  { key: "lelah", label: "Lelah", emoji: "😴" },
  { key: "cemas", label: "Cemas", emoji: "😰" },
  { key: "sedih", label: "Sedih", emoji: "😢" },
  { key: "marah", label: "Marah", emoji: "😠" },
] as const;

export type MoodKey = (typeof MOODS)[number]["key"];

export const MOOD_KEYS: string[] = MOODS.map((m) => m.key);

export function getMood(key?: string | null) {
  if (!key) return null;
  return MOODS.find((m) => m.key === key) ?? null;
}

export const CATEGORY_SUGGESTIONS = [
  "Pribadi",
  "Ide",
  "Work",
  "Belajar",
  "Perjalanan",
  "Kesehatan",
];

export type VisibilityValue = "private" | "public" | "protected";
export type StatusValue = "draft" | "published";

export const VISIBILITY_OPTIONS: {
  value: VisibilityValue;
  label: string;
  desc: string;
}[] = [
  {
    value: "private",
    label: "Private",
    desc: "Hanya Anda yang bisa membaca (saat login).",
  },
  {
    value: "public",
    label: "Public",
    desc: "Siapa saja dengan link bisa membaca.",
  },
  {
    value: "protected",
    label: "Public + Password",
    desc: "Siapa saja dengan link, tapi harus memasukkan password.",
  },
];

export const MEDIA_BUCKET = "journal-media";
export const MAX_IMAGE_MB = 5;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const AUTOSAVE_DELAY_MS = 2500;
