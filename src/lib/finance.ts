import type { Bill, Category, Goal, Transaction, TxType } from "./types";

export const pad = (n: number) => String(n).padStart(2, "0");
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const currentMonth = () => todayISO().slice(0, 7);

export function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return toISO(new Date(y ?? 0, (m ?? 1) - 1 + delta, 1)).slice(0, 7);
}

export function monthRange(month: string): [string, string] {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y ?? 0, m ?? 1, 0).getDate();
  return [`${month}-01`, `${month}-${pad(last)}`];
}

export function monthLabel(month: string, short = false) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, 1).toLocaleDateString("en-PH", {
    month: short ? "short" : "long",
    year: "numeric",
  });
}

export function formatDate(iso: string, withYear = true) {
  return parseISO(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function formatMoney(n: number, currency = "PHP") {
  try {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function daysBetween(fromISO: string, toISODate: string) {
  return Math.round((parseISO(toISODate).getTime() - parseISO(fromISO).getTime()) / 86_400_000);
}

export const inRange = (t: { date: string }, from: string, to: string) => t.date >= from && t.date <= to;

export function inMonth<T extends { date: string }>(items: T[], month: string) {
  const [from, to] = monthRange(month);
  return items.filter((t) => inRange(t, from, to));
}

export function summarize(txs: Transaction[]) {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  income = round2(income);
  expense = round2(expense);
  return { income, expense, net: round2(income - expense) };
}

export function totalsByCategory(txs: Transaction[], type: TxType) {
  const map = new Map<string, number>();
  for (const t of txs) if (t.type === type) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  return [...map.entries()]
    .map(([categoryId, total]) => ({ categoryId, total: round2(total) }))
    .sort((a, b) => b.total - a.total);
}

export type BudgetLevel = "none" | "ok" | "warn" | "over";
export const WARN_THRESHOLD = 0.8;

export function budgetLevel(spent: number, limit: number): { pct: number; level: BudgetLevel } {
  if (!limit || limit <= 0) return { pct: 0, level: "none" };
  const pct = spent / limit;
  return { pct, level: pct > 1 ? "over" : pct >= WARN_THRESHOLD ? "warn" : "ok" };
}

export type BillStatus = "paid" | "overdue" | "due-soon" | "upcoming";
export function billStatus(bill: Bill, today: string): BillStatus {
  if (bill.paid) return "paid";
  const d = daysBetween(today, bill.dueDate);
  if (d < 0) return "overdue";
  if (d <= 7) return "due-soon";
  return "upcoming";
}

export function addMonthsISO(iso: string, n: number) {
  const d = parseISO(iso);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, last));
  return toISO(target);
}

export function goalProjection(goal: Goal, today: string) {
  const remaining = round2(Math.max(0, goal.target - goal.current));
  const pct = goal.target > 0 ? Math.min(1, goal.current / goal.target) : 0;
  const daysLeft = daysBetween(today, goal.targetDate);
  const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30.44));
  const perMonth = remaining > 0 && daysLeft > 0 ? round2(remaining / monthsLeft) : remaining;
  const status: "done" | "overdue" | "active" = remaining === 0 ? "done" : daysLeft < 0 ? "overdue" : "active";
  return { remaining, pct, daysLeft, monthsLeft, perMonth, status };
}

export function monthlyHistory(txs: Transaction[]) {
  const map = new Map<string, { income: number; expense: number }>();
  for (const t of txs) {
    const m = t.date.slice(0, 7);
    const row = map.get(m) ?? { income: 0, expense: 0 };
    row[t.type] += t.amount;
    map.set(m, row);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([month, r]) => ({
      month,
      income: round2(r.income),
      expense: round2(r.expense),
      net: round2(r.income - r.expense),
    }));
}

function csvCell(v: string | number | boolean) {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionsToCSV(txs: Transaction[], categories: Category[], currency: string) {
  const name = (id: string) => categories.find((c) => c.id === id)?.name ?? "Uncategorized";
  const header = ["Date", "Type", "Category", "Amount", "Currency", "Account", "Note", "Recurring"];
  const rows = [...txs]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((t) => [t.date, t.type, name(t.categoryId), t.amount.toFixed(2), currency, t.account, t.note, t.recurring ? "yes" : "no"]);
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** Validates a user-typed money amount. Returns error message or null. */
export function validateAmount(raw: string): string | null {
  if (!raw.trim()) return "Amount is required";
  if (!/^\d+(\.\d{1,2})?$/.test(raw.trim())) return "Enter a number with up to 2 decimals";
  const n = Number(raw);
  if (n <= 0) return "Amount must be greater than 0";
  if (n > 1_000_000_000) return "Amount is too large";
  return null;
}

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
