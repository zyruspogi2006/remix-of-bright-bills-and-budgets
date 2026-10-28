import { z } from "zod";
import { emptyData, withDemo } from "./demo";
import { COLOR_KEYS, type AppData } from "./types";

export const STORAGE_KEY = "pennywise:data:v1";
export const CURRENT_VERSION = 1;
/** Older keys we know how to migrate from. */
const LEGACY_KEYS = ["pennywise", "pennywise:data"];
const CORRUPT_BACKUP_KEY = "pennywise:corrupt-backup";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.number().finite().nonnegative();

const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  type: z.enum(["income", "expense"]),
  icon: z.string().default("tag"),
  color: z.enum(COLOR_KEYS).catch("c8"),
});
const txSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["income", "expense"]),
  amount: z.number().finite().positive(),
  date: isoDate,
  categoryId: z.string(),
  account: z.string().default("Cash"),
  note: z.string().max(500).default(""),
  recurring: z.boolean().default(false),
  demo: z.boolean().optional(),
});
const goalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  target: z.number().finite().positive(),
  current: money.default(0),
  targetDate: isoDate,
  contributions: z.array(z.object({ id: z.string(), amount: z.number().finite(), date: isoDate })).default([]),
  demo: z.boolean().optional(),
});
const billSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().finite().positive(),
  dueDate: isoDate,
  categoryId: z.string(),
  recurring: z.boolean().default(false),
  paid: z.boolean().default(false),
  demo: z.boolean().optional(),
});
const settingsSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/).catch("PHP"),
  theme: z.enum(["light", "dark", "system"]).catch("light"),
  monthlySavingsTarget: money.catch(0),
});

function filterValid<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, arr: unknown): { items: T[]; dropped: number } {
  if (!Array.isArray(arr)) return { items: [], dropped: 0 };
  const items: T[] = [];
  let dropped = 0;
  for (const raw of arr) {
    const r = schema.safeParse(raw);
    if (r.success) items.push(r.data);
    else dropped++;
  }
  return { items, dropped };
}

/** Bring any older shape up to the current version. */
export function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  const out = { ...raw };
  const version = typeof out.version === "number" ? out.version : 0;
  if (version < 1) {
    // v0: budgets were a single number "monthlyBudget"; categoryBudgets lived at top-level.
    if (!out.budgets) {
      out.budgets = {
        overall: typeof out.monthlyBudget === "number" ? out.monthlyBudget : 0,
        byCategory: (out.categoryBudgets as Record<string, number>) ?? {},
      };
    }
    out.version = 1;
  }
  return out;
}

export type ParseResult = { ok: true; data: AppData; dropped: number } | { ok: false; error: string };

/** Lenient parse: keeps valid records, drops broken ones. Used for storage and import. */
export function parseAppData(input: unknown): ParseResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Not a Pennywise backup (expected an object)." };
  const obj = migrate(input as Record<string, unknown>);
  if ((obj.version as number) > CURRENT_VERSION) return { ok: false, error: "This backup is from a newer version of Pennywise." };
  const looksRight = ["transactions", "categories", "settings"].some((k) => k in obj);
  if (!looksRight) return { ok: false, error: "File doesn't contain Pennywise data." };

  const base = emptyData();
  const cats = filterValid(categorySchema, obj.categories);
  const txs = filterValid(txSchema, obj.transactions);
  const goals = filterValid(goalSchema, obj.goals);
  const bills = filterValid(billSchema, obj.bills);
  const settings = settingsSchema.safeParse(obj.settings ?? {});
  const b = (obj.budgets ?? {}) as { overall?: unknown; byCategory?: unknown };
  const byCategory: Record<string, number> = {};
  if (b.byCategory && typeof b.byCategory === "object") {
    for (const [k, v] of Object.entries(b.byCategory as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) byCategory[k] = v;
    }
  }
  const data: AppData = {
    version: CURRENT_VERSION,
    settings: settings.success ? settings.data : base.settings,
    categories: cats.items.length ? cats.items : base.categories,
    transactions: txs.items,
    goals: goals.items,
    bills: bills.items,
    budgets: {
      overall: typeof b.overall === "number" && Number.isFinite(b.overall) && b.overall >= 0 ? b.overall : 0,
      byCategory,
    },
  };
  return { ok: true, data, dropped: cats.dropped + txs.dropped + goals.dropped + bills.dropped };
}

export type LoadStatus = "fresh" | "loaded" | "migrated" | "recovered" | "unavailable";

export function loadData(): { data: AppData; status: LoadStatus; dropped?: number } {
  let storage: Storage;
  try {
    storage = window.localStorage;
    storage.getItem(STORAGE_KEY);
  } catch {
    return { data: withDemo(emptyData()), status: "unavailable" };
  }
  let raw = storage.getItem(STORAGE_KEY);
  let migrated = false;
  if (raw === null) {
    for (const k of LEGACY_KEYS) {
      const legacy = storage.getItem(k);
      if (legacy) {
        raw = legacy;
        migrated = true;
        break;
      }
    }
  }
  if (raw === null) return { data: withDemo(emptyData()), status: "fresh" };
  try {
    const res = parseAppData(JSON.parse(raw));
    if (!res.ok) throw new Error(res.error);
    return { data: res.data, status: migrated ? "migrated" : res.dropped ? "recovered" : "loaded", dropped: res.dropped };
  } catch {
    try {
      storage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      /* ignore */
    }
    return { data: emptyData(), status: "recovered" };
  }
}

export function saveData(data: AppData): { ok: true } | { ok: false; error: string } {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22);
    return { ok: false, error: quota ? "Browser storage is full." : "Couldn't save to this browser." };
  }
}

export function storageBytes(data: AppData) {
  return new Blob([JSON.stringify(data)]).size;
}
