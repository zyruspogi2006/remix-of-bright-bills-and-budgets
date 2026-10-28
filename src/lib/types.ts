export type TxType = "income" | "expense";

export const COLOR_KEYS = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export interface Category {
  id: string;
  name: string;
  type: TxType;
  icon: string;
  color: ColorKey;
}

export const ACCOUNTS = ["Cash", "GCash", "Maya", "Bank / Debit", "Credit Card", "Other"] as const;

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  date: string; // YYYY-MM-DD
  categoryId: string;
  account: string;
  note: string;
  recurring: boolean;
  demo?: boolean;
}

export interface Contribution {
  id: string;
  amount: number;
  date: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  targetDate: string;
  contributions: Contribution[];
  demo?: boolean;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  categoryId: string;
  recurring: boolean;
  paid: boolean;
  demo?: boolean;
}

export type ThemePref = "light" | "dark" | "system";

export interface Settings {
  currency: string;
  theme: ThemePref;
  monthlySavingsTarget: number;
}

export interface Budgets {
  overall: number;
  byCategory: Record<string, number>;
}

export interface AppData {
  version: number;
  settings: Settings;
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  bills: Bill[];
  budgets: Budgets;
}

export const CURRENCIES = [
  { code: "PHP", label: "Philippine Peso (₱)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
  { code: "SGD", label: "Singapore Dollar (S$)" },
  { code: "KRW", label: "Korean Won (₩)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "GBP", label: "British Pound (£)" },
] as const;
