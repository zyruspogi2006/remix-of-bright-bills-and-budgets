import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthSelector } from "@/components/pw/AppShell";
import { CategoryBadge, DemoTag, EmptyState, Panel, PageHeader, ProgressBar } from "@/components/pw/shared";
import { billStatus, formatDate, inMonth, summarize } from "@/lib/finance";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Pennywise" },
      { name: "description", content: "Your monthly income, expenses, budget and savings at a glance." },
      { property: "og:title", content: "Dashboard — Pennywise" },
      { property: "og:description", content: "Your monthly income, expenses, budget and savings at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, month, money, getCategory, openTransaction, today, demoActive, clearDemo } = useStore();
  const txs = inMonth(data.transactions, month);
  const s = summarize(txs);
  const budget = data.budgets.overall;
  const target = data.settings.monthlySavingsTarget;
  const recent = [...txs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  const bills = data.bills.filter((b) => !b.paid).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Everything this month, in one place." actions={<MonthSelector />} />
      {demoActive && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <span>You're viewing sample data.</span>
          <Button size="sm" variant="outline" onClick={clearDemo}>Remove demo data</Button>
        </div>
      )}
      <div className="hero-panel grid gap-4 p-6 sm:grid-cols-3">
        {[["Income", s.income], ["Expenses", s.expense], ["Remaining", s.net]].map(([l, v]) => (
          <div key={l as string}>
            <p className="text-sm opacity-75">{l}</p>
            <p className="tabular font-display text-2xl font-bold sm:text-3xl">{money(v as number)}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Budget used">
          {budget > 0 ? (
            <>
              <p className="tabular mb-2 text-sm">{money(s.expense)} of {money(budget)}</p>
              <ProgressBar value={s.expense} max={budget} tone={s.expense > budget ? "over" : s.expense >= budget * 0.8 ? "warn" : "primary"} label="Budget used" size="lg" />
            </>
          ) : <p className="text-sm text-muted-foreground">No monthly budget set yet.</p>}
        </Panel>
        <Panel title="Savings this month">
          <p className="tabular mb-2 text-sm">{money(Math.max(0, s.net))} of {money(target)}</p>
          <ProgressBar value={Math.max(0, s.net)} max={target} tone="income" label="Savings progress" size="lg" />
        </Panel>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => openTransaction({ type: "expense" })}><ArrowUpRight className="size-4" /> Add expense</Button>
        <Button variant="outline" onClick={() => openTransaction({ type: "income" })}><ArrowDownLeft className="size-4" /> Add income</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Recent transactions" className="lg:col-span-2">
          {recent.length === 0 ? (
            <EmptyState icon={Receipt} title="No transactions this month" action={<Button onClick={() => openTransaction()}>Add one</Button>} />
          ) : (
            <ul className="divide-y">
              {recent.map((t) => (
                <li key={t.id}>
                  <button className="flex w-full items-center gap-3 py-2.5 text-left" onClick={() => openTransaction(t)}>
                    <CategoryBadge category={getCategory(t.categoryId)} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{t.note || getCategory(t.categoryId).name} {t.demo && <DemoTag />}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(t.date, false)} · {t.account}</span>
                    </span>
                    <span className={cn("tabular text-sm font-semibold", t.type === "income" ? "text-income" : "text-expense")}>
                      {t.type === "income" ? "+" : "−"}{money(t.amount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Upcoming bills">
          {bills.length === 0 ? <p className="text-sm text-muted-foreground">No unpaid bills.</p> : (
            <ul className="space-y-3">
              {bills.map((b) => {
                const st = billStatus(b, today);
                return (
                  <li key={b.id} className="flex justify-between text-sm">
                    <span>{b.name}<span className={cn("block text-xs", st === "overdue" ? "text-destructive" : "text-muted-foreground")}>{st === "overdue" ? "Overdue · " : ""}{formatDate(b.dueDate, false)}</span></span>
                    <span className="tabular font-semibold">{money(b.amount)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
