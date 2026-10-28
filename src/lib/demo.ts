import { addMonthsISO, pad, shiftMonth, todayISO } from "./finance";
import type { AppData, Bill, Category, Goal, Transaction } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-allowance", name: "Allowance", type: "income", icon: "gift", color: "c1" },
  { id: "cat-salary", name: "Salary / Part-time", type: "income", icon: "briefcase", color: "c3" },
  { id: "cat-freelance", name: "Freelance", type: "income", icon: "sparkles", color: "c6" },
  { id: "cat-other-income", name: "Other income", type: "income", icon: "wallet", color: "c8" },
  { id: "cat-food", name: "Food & Dining", type: "expense", icon: "utensils", color: "c2" },
  { id: "cat-transport", name: "Transport", type: "expense", icon: "bus", color: "c3" },
  { id: "cat-school", name: "School", type: "expense", icon: "graduation", color: "c6" },
  { id: "cat-rent", name: "Rent & Dorm", type: "expense", icon: "home", color: "c7" },
  { id: "cat-utilities", name: "Utilities & Load", type: "expense", icon: "zap", color: "c5" },
  { id: "cat-shopping", name: "Shopping", type: "expense", icon: "bag", color: "c4" },
  { id: "cat-fun", name: "Entertainment", type: "expense", icon: "film", color: "c1" },
  { id: "cat-health", name: "Health", type: "expense", icon: "heart", color: "c4" },
  { id: "cat-other", name: "Other", type: "expense", icon: "tag", color: "c8" },
];

export function emptyData(): AppData {
  return {
    version: 1,
    settings: { currency: "PHP", theme: "light", monthlySavingsTarget: 3000 },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    transactions: [],
    goals: [],
    bills: [],
    budgets: { overall: 0, byCategory: {} },
  };
}

let n = 0;
const did = (p: string) => `demo-${p}-${++n}-${Math.random().toString(36).slice(2, 7)}`;

/** Demo items are flagged `demo: true` so they can be removed in one click. */
export function buildDemo() {
  const today = todayISO();
  const thisMonth = today.slice(0, 7);
  const dayNow = Number(today.slice(8, 10));
  const tx: Transaction[] = [];
  const add = (month: string, day: number, type: Transaction["type"], amount: number, categoryId: string, account: string, note: string, recurring = false) => {
    if (month === thisMonth && day > dayNow) return;
    tx.push({ id: did("tx"), type, amount, date: `${month}-${pad(day)}`, categoryId, account, note, recurring, demo: true });
  };
  for (let back = 2; back >= 0; back--) {
    const m = shiftMonth(thisMonth, -back);
    const wiggle = back * 120;
    add(m, 1, "income", 8000, "cat-allowance", "GCash", "Monthly allowance from parents", true);
    add(m, 15, "income", 4500 - wiggle, "cat-salary", "Bank / Debit", "Café part-time shift", true);
    if (back !== 1) add(m, 9, "income", 1800, "cat-freelance", "GCash", "Logo commission");
    add(m, 2, "expense", 3500, "cat-rent", "Bank / Debit", "Dorm rent share", true);
    add(m, 3, "expense", 299, "cat-utilities", "GCash", "Mobile data promo", true);
    add(m, 1, "expense", 185, "cat-food", "Cash", "Silog breakfast + coffee");
    add(m, 4, "expense", 420 + wiggle, "cat-food", "GCash", "Groceries at Puregold");
    add(m, 8, "expense", 260, "cat-food", "Cash", "Jollibee with blockmates");
    add(m, 12, "expense", 540, "cat-food", "Maya", "Weekly groceries");
    add(m, 19, "expense", 310, "cat-food", "Cash", "Lunch – carinderia week");
    add(m, 5, "expense", 350, "cat-transport", "Cash", "Jeep & tricycle fare");
    add(m, 16, "expense", 280, "cat-transport", "GCash", "Grab ride home (rain)");
    add(m, 6, "expense", 650, "cat-school", "Cash", "Photocopies & project materials");
    add(m, 10, "expense", 899 - wiggle, "cat-shopping", "Credit Card", "Shopee 10.10 haul");
    add(m, 14, "expense", 249, "cat-fun", "GCash", "Netflix (shared plan)", true);
    add(m, 20, "expense", 360, "cat-fun", "Cash", "Movie night");
    if (back === 0) add(m, 7, "expense", 480, "cat-health", "Cash", "Vitamins & meds");
  }

  const goals: Goal[] = [
    { id: did("goal"), name: "Emergency fund", target: 20000, current: 7500, targetDate: addMonthsISO(today, 8), contributions: [{ id: did("c"), amount: 7500, date: today }], demo: true },
    { id: did("goal"), name: "New laptop for thesis", target: 45000, current: 12800, targetDate: addMonthsISO(today, 10), contributions: [{ id: did("c"), amount: 12800, date: today }], demo: true },
    { id: did("goal"), name: "Baguio trip with friends", target: 6000, current: 4200, targetDate: addMonthsISO(today, 2), contributions: [{ id: did("c"), amount: 4200, date: today }], demo: true },
  ];

  const due = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const bills: Bill[] = [
    { id: did("bill"), name: "Postpaid / load plan", amount: 299, dueDate: due(3), categoryId: "cat-utilities", recurring: true, paid: false, demo: true },
    { id: did("bill"), name: "Dorm Wi-Fi share", amount: 450, dueDate: due(-2), categoryId: "cat-utilities", recurring: true, paid: false, demo: true },
    { id: did("bill"), name: "Spotify Student", amount: 75, dueDate: due(12), categoryId: "cat-fun", recurring: true, paid: false, demo: true },
    { id: did("bill"), name: "Org membership fee", amount: 300, dueDate: due(20), categoryId: "cat-school", recurring: false, paid: false, demo: true },
  ];

  return {
    transactions: tx,
    goals,
    bills,
    budgets: {
      overall: 14000,
      byCategory: { "cat-food": 2500, "cat-transport": 800, "cat-school": 1000, "cat-shopping": 800, "cat-fun": 700, "cat-rent": 3500 },
    },
  };
}

export function withDemo(base: AppData): AppData {
  const demo = buildDemo();
  const cats = [...base.categories];
  for (const c of DEFAULT_CATEGORIES) if (!cats.some((x) => x.id === c.id)) cats.push({ ...c });
  return {
    ...base,
    categories: cats,
    transactions: [...base.transactions.filter((t) => !t.demo), ...demo.transactions],
    goals: [...base.goals.filter((g) => !g.demo), ...demo.goals],
    bills: [...base.bills.filter((b) => !b.demo), ...demo.bills],
    budgets: {
      overall: base.budgets.overall || demo.budgets.overall,
      byCategory: { ...demo.budgets.byCategory, ...base.budgets.byCategory },
    },
  };
}

export function withoutDemo(d: AppData): AppData {
  return {
    ...d,
    transactions: d.transactions.filter((t) => !t.demo),
    goals: d.goals.filter((g) => !g.demo),
    bills: d.bills.filter((b) => !b.demo),
  };
}

export const hasDemo = (d: AppData) =>
  d.transactions.some((t) => t.demo) || d.goals.some((g) => g.demo) || d.bills.some((b) => b.demo);
