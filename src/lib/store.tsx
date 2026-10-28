import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { emptyData, hasDemo, withDemo, withoutDemo } from "./demo";
import { addMonthsISO, currentMonth, formatMoney, round2, todayISO } from "./finance";
import { loadData, saveData, STORAGE_KEY, type LoadStatus } from "./storage";
import type { AppData, Bill, Category, Goal, Settings, Transaction } from "./types";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

type SaveState = { status: "idle" | "saving" | "saved" | "error"; at?: number; error?: string };
type TxDialogState = { open: boolean; initial?: Partial<Transaction> };

function useStoreValue() {
  const [data, setData] = useState<AppData>(() => emptyData());
  const [hydrated, setHydrated] = useState(false);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loaded");
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const [month, setMonth] = useState("2026-01");
  const [today, setToday] = useState("2026-01-01");
  const [txDialog, setTxDialog] = useState<TxDialogState>({ open: false });
  const latest = useRef(data);
  latest.current = data;

  useEffect(() => {
    const r = loadData();
    setData(r.data);
    setLoadStatus(r.status);
    setMonth(currentMonth());
    setToday(todayISO());
    setHydrated(true);
    if (r.status === "recovered")
      toast.warning("Some saved data couldn't be read", { description: "We kept what was valid. A copy of the raw data was stored as a backup." });
    if (r.status === "unavailable")
      toast.error("Browser storage is unavailable", { description: "Changes won't be saved (private mode or storage disabled)." });
    if (r.status === "migrated") toast.success("Your data was upgraded to the latest format");
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setSave((s) => ({ ...s, status: "saving" }));
    const t = setTimeout(() => {
      const res = saveData(data);
      setSave(res.ok ? { status: "saved", at: Date.now() } : { status: "error", error: res.error });
      if (!res.ok) toast.error("Couldn't save", { description: res.error });
    }, 250);
    return () => clearTimeout(t);
  }, [data, hydrated]);

  // Flush on tab close; pick up edits from another tab.
  useEffect(() => {
    if (!hydrated) return;
    const flush = () => saveData(latest.current);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const r = loadData();
        setData(r.data);
        toast("Updated from another tab");
      }
    };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("storage", onStorage);
    };
  }, [hydrated]);

  const theme = data.settings.theme;
  useEffect(() => {
    if (!hydrated) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && mq.matches));
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, hydrated]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);

  const actions = useMemo(
    () => ({
      upsertTransaction: (t: Transaction) =>
        update((d) => {
          const exists = d.transactions.some((x) => x.id === t.id);
          return { ...d, transactions: exists ? d.transactions.map((x) => (x.id === t.id ? t : x)) : [t, ...d.transactions] };
        }),
      deleteTransaction: (id: string) => update((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) })),
      restoreTransaction: (t: Transaction) => update((d) => ({ ...d, transactions: [t, ...d.transactions] })),
      upsertCategory: (c: Category) =>
        update((d) => ({
          ...d,
          categories: d.categories.some((x) => x.id === c.id) ? d.categories.map((x) => (x.id === c.id ? c : x)) : [...d.categories, c],
        })),
      deleteCategory: (id: string) =>
        update((d) => {
          const byCategory = { ...d.budgets.byCategory };
          delete byCategory[id];
          return { ...d, categories: d.categories.filter((c) => c.id !== id), budgets: { ...d.budgets, byCategory } };
        }),
      setOverallBudget: (overall: number) => update((d) => ({ ...d, budgets: { ...d.budgets, overall: round2(overall) } })),
      setCategoryBudget: (id: string, amount: number) =>
        update((d) => {
          const byCategory = { ...d.budgets.byCategory };
          if (amount > 0) byCategory[id] = round2(amount);
          else delete byCategory[id];
          return { ...d, budgets: { ...d.budgets, byCategory } };
        }),
      upsertGoal: (g: Goal) =>
        update((d) => ({ ...d, goals: d.goals.some((x) => x.id === g.id) ? d.goals.map((x) => (x.id === g.id ? g : x)) : [...d.goals, g] })),
      deleteGoal: (id: string) => update((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) })),
      addContribution: (goalId: string, amount: number, date: string) =>
        update((d) => ({
          ...d,
          goals: d.goals.map((g) =>
            g.id === goalId
              ? { ...g, current: round2(Math.max(0, g.current + amount)), contributions: [{ id: uid(), amount, date }, ...g.contributions] }
              : g,
          ),
        })),
      upsertBill: (b: Bill) =>
        update((d) => ({ ...d, bills: d.bills.some((x) => x.id === b.id) ? d.bills.map((x) => (x.id === b.id ? b : x)) : [...d.bills, b] })),
      deleteBill: (id: string) => update((d) => ({ ...d, bills: d.bills.filter((b) => b.id !== id) })),
      setBillPaid: (id: string, paid: boolean) => update((d) => ({ ...d, bills: d.bills.map((b) => (b.id === id ? { ...b, paid } : b)) })),
      advanceBill: (id: string) =>
        update((d) => ({ ...d, bills: d.bills.map((b) => (b.id === id ? { ...b, paid: false, dueDate: addMonthsISO(b.dueDate, 1) } : b)) })),
      updateSettings: (s: Partial<Settings>) => update((d) => ({ ...d, settings: { ...d.settings, ...s } })),
      loadDemo: () => update((d) => withDemo(d)),
      clearDemo: () => update((d) => withoutDemo(d)),
      resetAll: () => update(() => emptyData()),
      replaceAll: (next: AppData) => update(() => next),
    }),
    [update],
  );

  const getCategory = useCallback(
    (id: string): Category => data.categories.find((c) => c.id === id) ?? { id, name: "Uncategorized", type: "expense", icon: "tag", color: "c8" },
    [data.categories],
  );
  const money = useCallback((n: number) => formatMoney(n, data.settings.currency), [data.settings.currency]);

  return {
    data,
    hydrated,
    loadStatus,
    save,
    month,
    setMonth,
    today,
    txDialog,
    openTransaction: (initial?: Partial<Transaction>) => setTxDialog({ open: true, initial }),
    closeTransaction: () => setTxDialog((s) => ({ ...s, open: false })),
    getCategory,
    money,
    demoActive: hasDemo(data),
    ...actions,
  };
}

export type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
