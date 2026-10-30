import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, FileDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthSelector } from "@/components/pw/AppShell";
import { CategoryBadge, EmptyState, Panel, PageHeader, ProgressBar } from "@/components/pw/shared";
import { downloadFile, formatDate, inMonth, monthlyHistory, monthLabel, round2, summarize, totalsByCategory } from "@/lib/finance";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Pennywise" },
      { name: "description", content: "Monthly history, category breakdown and CSV exports of your spending." },
      { property: "og:title", content: "Reports — Pennywise" },
      { property: "og:description", content: "Monthly history, category breakdown and CSV exports of your spending." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data, month, money, getCategory } = useStore();
  const txs = inMonth(data.transactions, month);
  const s = summarize(txs);
  const byCat = totalsByCategory(txs, "expense");
  const incomeByCat = totalsByCategory(txs, "income");
  const history = useMemo(() => monthlyHistory(data.transactions).slice(0, 12), [data.transactions]);
  const maxMonth = Math.max(1, ...history.map((h) => Math.max(h.income, h.expense)));
  const target = data.settings.monthlySavingsTarget;
  const hasAny = data.transactions.length > 0;

  const exportMonth = () => {
    downloadFile(`pennywise-${month}.csv`, import_csv(txs), "text/csv;charset=utf-8");
  };
  const exportAll = () => {
    downloadFile("pennywise-all-transactions.csv", import_csv(data.transactions), "text/csv;charset=utf-8");
  };
  const import_csv = (rows: typeof txs) => {
    const { transactionsToCSV } = require_csv();
    return transactionsToCSV(rows, data.categories, data.settings.currency);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={`How {monthLabel(month)} went, and where the money went.`}
        actions={<MonthSelector />}
      />

      {!hasAny ? (
        <Panel>
          <EmptyState
            icon={TrendingUp}
            title="Nothing to report yet"
            description="Add a few transactions and this page will show your monthly history, top categories and let you export everything to CSV."
          />
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="surface p-5">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowDownLeft className="size-4 text-income" /> Income</p>
              <p className="tabular mt-1 font-display text-2xl font-bold text-income">{money(s.income)}</p>
            </div>
            <div className="surface p-5">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowUpRight className="size-4 text-expense" /> Expenses</p>
              <p className="tabular mt-1 font-display text-2xl font-bold text-expense">{money(s.expense)}</p>
            </div>
            <div className="surface p-5">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><TrendingUp className="size-4" /> Net saved</p>
              <p className={cn("tabular mt-1 font-display text-2xl font-bold", s.net < 0 ? "text-destructive" : "text-income")}>{money(s.net)}</p>
              {target > 0 && (
                <div className="mt-2">
                  <ProgressBar value={Math.max(0, s.net)} max={target} tone="income" label="Savings target reached" size="sm" />
                  <p className="mt-1 text-xs text-muted-foreground">of {money(target)} savings target</p>
                </div>
              )}
            </div>
          </div>

          <Panel
            title="Where the money went"
            action={<span className="text-xs text-muted-foreground">{monthLabel(month)}</span>}
          >
            {byCat.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses recorded this month.</p>
            ) : (
              <ul className="space-y-4">
                {byCat.map((r, i) => {
                  const c = getCategory(r.categoryId);
                  const pct = s.expense > 0 ? Math.round((r.total / s.expense) * 100) : 0;
                  return (
                    <li key={r.categoryId} className="flex items-center gap-3">
                      <CategoryBadge category={c} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <p className="tabular text-sm font-semibold">
                            {money(r.total)} <span className="text-xs font-normal text-muted-foreground">· {pct}%</span>
                          </p>
                        </div>
                        <ProgressBar value={r.total} max={byCat[0].total} tone={i === 0 ? "primary" : "muted"} label={`${c.name} share of spending`} className="mt-1.5" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {incomeByCat.length > 0 && (
              <div className="mt-5 border-t pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Income sources</p>
                <ul className="flex flex-wrap gap-2">
                  {incomeByCat.map((r) => (
                    <li key={r.categoryId} className="rounded-lg bg-muted px-2.5 py-1 text-sm">
                      {getCategory(r.categoryId).name} · <span className="tabular font-semibold text-income">{money(r.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title="Monthly history" action={<span className="text-xs text-muted-foreground">Last {history.length} month{history.length === 1 ? "" : "s"}</span>}>
            <div className="grid grid-cols-3 gap-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="col-span-1">Month</span>
              <span className="text-right">In</span>
              <span className="text-right">Out</span>
            </div>
            <ul className="divide-y">
              {history.map((h) => (
                <li key={h.month} className="py-2.5">
                  <div className="grid grid-cols-3 items-center gap-2 text-sm">
                    <span className="font-medium">{monthLabel(h.month, true)}</span>
                    <span className="tabular text-right text-income">{money(h.income)}</span>
                    <span className="tabular text-right text-expense">{money(h.expense)}</span>
                  </div>
                  <div className="mt-1.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted">
                    <div className="bg-income h-full" style={{ width: `${(h.income / maxMonth) * 100}%` }} />
                    <div className="bg-expense h-full" style={{ width: `${(h.expense / maxMonth) * 100}%` }} />
                  </div>
                  <p className={cn("tabular mt-1 text-xs", h.net < 0 ? "text-destructive" : "text-muted-foreground")}>
                    Net: {money(h.net)}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Export">
            <p className="mb-3 text-sm text-muted-foreground">Download your data as a CSV file you can open in Excel or Google Sheets.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportMonth}><FileDown className="size-4" /> {monthLabel(month)} (CSV)</Button>
              <Button variant="outline" onClick={exportAll}><FileDown className="size-4" /> All transactions (CSV)</Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Includes every transaction's date, category, amount, account and note.
              {txs.length === 0 && ` Nothing recorded yet for ${monthLabel(month)}.`}
            </p>
          </Panel>
        </>
      )}
    </div>
  );
}

function import_csv() {}
function require_csv() {
  return { transactionsToCSV: transactionsToCSVRef };
}
import { transactionsToCSV as transactionsToCSVRef } from "@/lib/finance";
