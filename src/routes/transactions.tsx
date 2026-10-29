import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Plus, Receipt, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonthSelector } from "@/components/pw/AppShell";
import { CategoryBadge, DemoTag, EmptyState, PageHeader } from "@/components/pw/shared";
import { formatDate, inMonth, summarize } from "@/lib/finance";
import { useStore } from "@/lib/store";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Pennywise" },
      { name: "description", content: "Search, filter and manage every income and expense you've logged." },
      { property: "og:title", content: "Transactions — Pennywise" },
      { property: "og:description", content: "Search, filter and manage every income and expense you've logged." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TransactionsPage,
});

type TypeFilter = "all" | "income" | "expense";

function TransactionsPage() {
  const { data, month, money, getCategory, openTransaction, deleteTransaction, restoreTransaction } = useStore();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [catFilter, setCatFilter] = useState("all");

  const monthTxs = inMonth(data.transactions, month);
  const q = query.trim().toLowerCase();
  const filtered = monthTxs
    .filter((t) => typeFilter === "all" || t.type === typeFilter)
    .filter((t) => catFilter === "all" || t.categoryId === catFilter)
    .filter(
      (t) =>
        !q ||
        t.note.toLowerCase().includes(q) ||
        t.account.toLowerCase().includes(q) ||
        getCategory(t.categoryId).name.toLowerCase().includes(q),
    )
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const s = summarize(filtered);
  const hasFilters = q !== "" || typeFilter !== "all" || catFilter !== "all";

  const remove = (t: Transaction) => {
    deleteTransaction(t.id);
    toast("Transaction deleted", {
      action: { label: "Undo", onClick: () => restoreTransaction(t) },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Every peso in and out, for the selected month."
        actions={
          <>
            <MonthSelector />
            <Button onClick={() => openTransaction()}>
              <Plus className="size-4" /> Add transaction
            </Button>
          </>
        }
      />

      <div className="surface grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, categories, accounts…"
            aria-label="Search transactions"
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-full sm:w-36" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expenses</SelectItem>
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {data.categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Income", s.income, "text-income"],
          ["Expenses", s.expense, "text-expense"],
          ["Net", s.net, s.net >= 0 ? "text-income" : "text-expense"],
        ].map(([label, value, tone]) => (
          <div key={label as string} className="surface p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
            <p className={cn("tabular mt-1 font-display text-xl font-bold", tone as string)}>{money(value as number)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{filtered.length} shown{hasFilters ? ` of ${monthTxs.length}` : ""}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={monthTxs.length === 0 ? "No transactions this month" : "Nothing matches your filters"}
          description={
            monthTxs.length === 0
              ? "Log your first income or expense to start tracking."
              : "Try a different search, type or category."
          }
          action={
            monthTxs.length === 0 ? (
              <Button onClick={() => openTransaction()}>
                <Plus className="size-4" /> Add transaction
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="surface divide-y">
          {filtered.map((t) => (
            <li key={t.id} className="group flex items-center gap-3 px-4 py-3">
              <button
                className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={() => openTransaction(t)}
                aria-label={`Edit ${t.note || getCategory(t.categoryId).name}, ${money(t.amount)}`}
              >
                <CategoryBadge category={getCategory(t.categoryId)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {t.note || getCategory(t.categoryId).name} {t.demo && <DemoTag />}
                    {t.recurring && <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Monthly</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(t.date)} · {t.account}
                  </span>
                </span>
                <span className={cn("tabular shrink-0 text-sm font-semibold", t.type === "income" ? "text-income" : "text-expense")}>
                  {t.type === "income" ? <ArrowDownLeft className="mr-0.5 inline size-3.5" aria-hidden /> : <ArrowUpRight className="mr-0.5 inline size-3.5" aria-hidden />}
                  {money(t.amount)}
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-destructive max-lg:opacity-100"
                onClick={() => remove(t)}
                aria-label={`Delete ${t.note || getCategory(t.categoryId).name}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
