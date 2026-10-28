import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CloudOff,
  FileText,
  LayoutDashboard,
  Loader2,
  Menu,
  PiggyBank,
  Plus,
  Settings,
  ShieldCheck,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { currentMonth, monthLabel, shiftMonth } from "@/lib/finance";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { TransactionDialog } from "./TransactionDialog";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/budgets", label: "Budgets", icon: Target },
  { to: "/goals", label: "Savings goals", icon: PiggyBank },
  { to: "/bills", label: "Bills", icon: CalendarClock },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
        <span className="font-display text-lg font-bold">₱</span>
      </span>
      <span className="font-display text-xl font-bold tracking-tight">Pennywise</span>
    </Link>
  );
}

export function SaveStatus({ compact }: { compact?: boolean }) {
  const { save, loadStatus } = useStore();
  if (loadStatus === "unavailable")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
        <CloudOff className="size-3.5" aria-hidden /> Not saving
      </span>
    );
  const content =
    save.status === "error" ? (
      <span className="inline-flex items-center gap-1.5 text-destructive">
        <CircleAlert className="size-3.5" aria-hidden /> {save.error}
      </span>
    ) : save.status === "saving" ? (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Saving…
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-success">
        <ShieldCheck className="size-3.5" aria-hidden /> Saved on this device
      </span>
    );
  return (
    <span role="status" aria-live="polite" className={cn("text-xs font-medium", compact && "text-[11px]")}>
      {content}
    </span>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <n.icon className="size-[18px]" aria-hidden />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MonthSelector() {
  const { month, setMonth } = useStore();
  const isCurrent = month === currentMonth();
  return (
    <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-card">
      <Button variant="ghost" size="icon" className="size-8" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[8.5rem] text-center text-sm font-semibold tabular" aria-live="polite">
        {monthLabel(month)}
      </span>
      <Button variant="ghost" size="icon" className="size-8" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
        <ChevronRight className="size-4" />
      </Button>
      {!isCurrent && (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={() => setMonth(currentMonth())}>
          Today
        </Button>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your budget">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { hydrated, openTransaction } = useStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const bottom = [NAV[0], NAV[1], null, NAV[2], NAV[3]];

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <Button className="mt-6" onClick={() => openTransaction()}>
          <Plus className="size-4" /> Add transaction
        </Button>
        <div className="mt-6 flex-1">
          <NavList />
        </div>
        <div className="rounded-xl border bg-card p-3">
          <SaveStatus />
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Your data stays in this browser. It doesn't sync across devices.</p>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <SaveStatus compact />
          <Button variant="ghost" size="icon" onClick={() => setMoreOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </div>
      </header>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar">
          <SheetHeader>
            <SheetTitle className="text-left">Menu</SheetTitle>
          </SheetHeader>
          <div className="px-2">
            <NavList onNavigate={() => setMoreOpen(false)} />
            <p className="mt-6 rounded-xl border bg-card p-3 text-xs text-muted-foreground">Data is saved only in this browser on this device.</p>
          </div>
        </SheetContent>
      </Sheet>

      <main id="main" className="px-4 pt-5 pb-28 sm:px-6 lg:ml-64 lg:px-10 lg:pt-8 lg:pb-12">
        <div className="mx-auto max-w-6xl">{hydrated ? children : <LoadingState />}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 py-1.5">
          {bottom.map((n, i) =>
            n ? (
              <Link
                key={n.to}
                to={n.to}
                aria-current={(n.to === "/" ? path === "/" : path.startsWith(n.to)) ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium",
                  (n.to === "/" ? path === "/" : path.startsWith(n.to)) ? "text-primary" : "text-muted-foreground",
                )}
              >
                <n.icon className="size-5" aria-hidden />
                {n.label.split(" ")[0]}
              </Link>
            ) : (
              <div key={i} className="flex justify-center">
                <button
                  onClick={() => openTransaction()}
                  aria-label="Add transaction"
                  className="-mt-6 inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lift transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Plus className="size-6" />
                </button>
              </div>
            ),
          )}
        </div>
      </nav>
      <TransactionDialog />
    </div>
  );
}
