import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MonthSelector } from "@/components/pw/AppShell";
import { CategoryBadge, EmptyState, FieldError, PageHeader, Panel, ProgressBar } from "@/components/pw/shared";
import { budgetLevel, inMonth, round2, summarize, totalsByCategory, validateAmount } from "@/lib/finance";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/budgets")({
  head: () => ({
    meta: [
      { title: "Budgets — Pennywise" },
      { name: "description", content: "Set an overall monthly budget and per-category limits, and see how you're doing." },
      { property: "og:title", content: "Budgets — Pennywise" },
      { property: "og:description", content: "Set an overall monthly budget and per-category limits, and see how you're doing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BudgetsPage,
});

/** Commit-on-blur money input shared by the overall and category budget rows. */
function BudgetInput({ id, initial, onCommit, label }: { id: string; initial: number; onCommit: (n: number) => void; label: string }) {
  const [value, setValue] = useState(initial ? String(initial) : "");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setValue(initial ? String(initial) : "");
  }, [initial]);

  const commit = () => {
    const raw = value.trim();
    if (raw === "") {
      setError(null);
      onCommit(0);
      return;
    }
    const err = validateAmount(raw);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onCommit(Number(raw));
  };

  return (
    <div className="w-32">
      <Input
        id={id}
        inputMode="decimal"
        placeholder="0"
        className="tabular h-8 text-right text-sm"
        aria-label={label}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        aria-invalid={!!error}
        aria-describedby={`${id}-err`}
      />
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}

function BudgetsPage() {
  const { data, month, money, getCategory, setOverallBudget, setCategoryBudget } = useStore();
  const txs = inMonth(data.transactions, month);
  const spentOverall = summarize(txs).expense;
  const bySpent = new Map(totalsByCategory(txs, "expense").map((r) => [r.categoryId, r.total]));
  const expenseCats = data.categories.filter((c) => c.type === "expense");
  const budgeted = expenseCats.filter((c) => (data.budgets.byCategory[c.id] ?? 0) > 0);
  const catTotal = round2(Object.values(data.budgets.byCategory).reduce((a, b) => a + b, 0));

  const o = budgetLevel(spentOverall, data.budgets.overall);

  return (
    <div className="space-y-6">
      <PageHeader title="Budgets" description="Decide your limits for the month, then watch them fill up." actions={<MonthSelector />} />

      <Panel title="Overall monthly budget">
        {data.budgets.overall <= 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 text-sm text-muted-foreground">Set a total spending limit for {month} to see it here.</p>
            <BudgetInput id="budget-overall" initial={0} label="Overall monthly budget" onCommit={(n) => { setOverallBudget(n); if (n > 0) toast.success("Monthly budget set"); }} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="tabular font-display text-2xl font-bold">{money(spentOverall)}</p>
                <p className="text-sm text-muted-foreground">spent of {money(data.budgets.overall)}</p>
              </div>
              <p className={cn("tabular text-sm font-semibold", spentOverall > data.budgets.overall ? "text-destructive" : "text-income")}>
                {money(Math.max(0, data.budgets.overall - spentOverall))} {spentOverall > data.budgets.overall ? "over" : "left"}
              </p>
              <BudgetInput id="budget-overall" initial={data.budgets.overall} label="Overall monthly budget" onCommit={setOverallBudget} />
            </div>
            <ProgressBar value={spentOverall} max={data.budgets.overall} tone={o.level === "over" ? "over" : o.level === "warn" ? "warn" : "primary"} label="Overall budget used" size="lg" />
            {o.level === "warn" && <p className="text-xs font-medium text-warning-foreground">You've used {Math.round(o.pct * 100)}% of this month's budget — go easy.</p>}
            {o.level === "over" && <p className="text-xs font-medium text-destructive">You've gone {money(spentOverall - data.budgets.overall)} over budget.</p>}
          </div>
        )}
      </Panel>

      <Panel
        title="Category budgets"
        action={
          catTotal > 0 && data.budgets.overall > 0 && catTotal > data.budgets.overall ? (
            <span className="text-xs font-medium text-warning-foreground">Category limits total {money(catTotal)} — above your {money(data.budgets.overall)} budget.</span>
          ) : undefined
        }
      >
        {expenseCats.length === 0 ? (
          <EmptyState icon={Target} title="No expense categories" description="Add expense categories in Settings to budget them." />
        ) : (
          <ul className="space-y-5">
            {expenseCats.map((c) => {
              const limit = data.budgets.byCategory[c.id] ?? 0;
              const spent = bySpent.get(c.id) ?? 0;
              const lvl = budgetLevel(spent, limit);
              return (
                <li key={c.id} className="grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <div className="flex items-center gap-2.5">
                    <CategoryBadge category={c} size="sm" />
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="tabular text-xs text-muted-foreground">
                        {limit > 0 ? `${money(spent)} of ${money(limit)}` : spent > 0 ? `${money(spent)} spent · no limit` : "Nothing spent"}
                      </p>
                    </div>
                  </div>
                  <ProgressBar value={spent} max={limit} tone={lvl.level === "over" ? "over" : lvl.level === "warn" ? "warn" : limit > 0 ? "primary" : "muted"} label={`${c.name} budget used`} />
                  <BudgetInput id={`budget-${c.id}`} initial={limit} label={`${c.name} monthly budget`} onCommit={(n) => setCategoryBudget(c.id, n)} />
                </li>
              );
            })}
          </ul>
        )}
        {budgeted.length === 0 && expenseCats.length > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">Tip: set a limit for Food, Transport or School first — they're usually the big ones.</p>
        )}
      </Panel>
    </div>
  );
}
