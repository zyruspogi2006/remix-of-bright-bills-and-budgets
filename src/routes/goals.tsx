import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Clock, PiggyBank, Plus, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog, EmptyState, FieldError, PageHeader, ProgressBar } from "@/components/pw/shared";
import { formatDate, goalProjection, validateAmount } from "@/lib/finance";
import { uid, useStore } from "@/lib/store";
import type { Goal } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Savings goals — Pennywise" },
      { name: "description", content: "Set savings targets, log contributions and see how much to save each month." },
      { property: "og:title", content: "Savings goals — Pennywise" },
      { property: "og:description", content: "Set savings targets, log contributions and see how much to save each month." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GoalsPage,
});

type GoalErrors = { name: string | null; target: string | null; targetDate: string | null };
const EMPTY_GOAL_ERRORS: GoalErrors = { name: null, target: null, targetDate: null };

function GoalDialog({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: Partial<Goal> | undefined }) {
  const { upsertGoal, today } = useStore();
  const editing = Boolean(initial?.id);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [errors, setErrors] = useState<GoalErrors>(EMPTY_GOAL_ERRORS);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setTarget(initial?.target ? String(initial.target) : "");
    setTargetDate(initial?.targetDate ?? "");
    setErrors(EMPTY_GOAL_ERRORS);
  }, [open, initial]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: GoalErrors = {
      name: name.trim() ? (name.trim().length > 60 ? "Keep the name under 60 characters" : null) : "Give the goal a name",
      target: validateAmount(target),
      targetDate: /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? null : "Pick a target date",
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    upsertGoal({
      id: initial?.id ?? uid(),
      name: name.trim(),
      target: Number(target),
      current: initial?.current ?? 0,
      targetDate,
      contributions: initial?.contributions ?? [],
      demo: editing ? initial?.demo : undefined,
    });
    toast.success(editing ? "Goal updated" : "Goal created");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit goal" : "New savings goal"}</DialogTitle>
          <DialogDescription>Something worth saving for — a laptop, a trip, an emergency fund.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="goal-name">Name *</Label>
            <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency fund" aria-invalid={!!errors.name} aria-describedby="goal-name-err" />
            <FieldError id="goal-name-err" message={errors.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Target amount *</Label>
              <Input id="goal-target" inputMode="decimal" placeholder="0.00" className="tabular" value={target} onChange={(e) => setTarget(e.target.value)} aria-invalid={!!errors.target} aria-describedby="goal-target-err" />
              <FieldError id="goal-target-err" message={errors.target} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">Target date *</Label>
              <Input id="goal-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} aria-invalid={!!errors.targetDate} aria-describedby="goal-date-err" />
              <FieldError id="goal-date-err" message={errors.targetDate} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{editing ? "Save changes" : "Create goal"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ContributeDialog({ goal, open, onOpenChange }: { goal: Goal | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { addContribution, money, today } = useStore();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setDate(today);
    setError(null);
  }, [open, today]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!goal) return;
    const err = validateAmount(amount);
    setError(err);
    if (err) return;
    addContribution(goal.id, Number(amount), date);
    toast.success(`${money(Number(amount))} added to “${goal.name}”`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add contribution</DialogTitle>
          <DialogDescription>{goal ? `Putting money towards “${goal.name}” (${money(goal.current)} so far).` : ""}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contrib-amount">Amount *</Label>
              <Input id="contrib-amount" inputMode="decimal" placeholder="0.00" className="tabular" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus aria-invalid={!!error} aria-describedby="contrib-amount-err" />
              <FieldError id="contrib-amount-err" message={error} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contrib-date">Date</Label>
              <Input id="contrib-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Add money</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GoalCard({ goal, onEdit, onContribute, onDelete }: { goal: Goal; onEdit: () => void; onContribute: () => void; onDelete: () => void }) {
  const { money } = useStore();
  const p = goalProjection(goal, todayISOStr());
  const tone = p.status === "done" ? "income" : p.status === "overdue" ? "over" : "primary";

  return (
    <div className="surface lift flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{goal.name} {goal.demo && <DemoTagInline />}</h3>
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", p.status === "done" ? "bg-accent text-accent-foreground" : p.status === "overdue" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
          {p.status === "done" ? <CheckCircle2 className="size-3" aria-hidden /> : p.status === "overdue" ? <TriangleAlert className="size-3" aria-hidden /> : <Clock className="size-3" aria-hidden />}
          {p.status === "done" ? "Reached" : p.status === "overdue" ? "Past due" : `${p.daysLeft} days left`}
        </span>
      </div>
      <p className="tabular mt-3 font-display text-xl font-bold">
        {money(goal.current)} <span className="text-sm font-normal text-muted-foreground">of {money(goal.target)}</span>
      </p>
      <ProgressBar value={goal.current} max={goal.target} tone={tone} label={`${goal.name} progress`} className="mt-2" />
      <p className="mt-2 text-xs text-muted-foreground">
        {p.status === "done"
          ? "Goal complete — congratulations!"
          : p.remaining > 0 && p.daysLeft > 0
            ? `Save about ${money(p.perMonth)}/month across ${p.monthsLeft} month${p.monthsLeft > 1 ? "s" : ""} to get there.`
            : "Past the target date — adjust the date or amount."}
      </p>
      {goal.contributions.length > 0 && (
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">
            {goal.contributions.length} contribution{goal.contributions.length > 1 ? "s" : ""}
          </summary>
          <ul className="mt-1.5 space-y-1">
            {goal.contributions.slice(0, 5).map((c) => (
              <li key={c.id} className="tabular flex justify-between">
                <span>{formatDate(c.date, false)}</span>
                <span className="font-medium text-income">+{money(c.amount)}</span>
              </li>
            ))}
            {goal.contributions.length > 5 && <li>…and {goal.contributions.length - 5} more</li>}
          </ul>
        </details>
      )}
      <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
        <Button size="sm" onClick={onContribute} disabled={p.status === "done"}>
          <Plus className="size-4" /> Add contribution
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={onDelete}>Delete</Button>
      </div>
    </div>
  );
}

// Kept tiny: goals render after hydration, so reading today's date at call time is fine.
import { todayISO } from "@/lib/finance";
const todayISOStr = todayISO;

function DemoTagInline() {
  return <span className="ml-1 rounded-md bg-warning/15 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-warning-foreground">Demo</span>;
}

function GoalsPage() {
  const { data, deleteGoal } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Goal> | undefined>(undefined);
  const [contribFor, setContribFor] = useState<Goal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Goal | null>(null);

  const sorted = [...data.goals].sort((a, b) => a.targetDate < b.targetDate ? -1 : 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings goals"
        description="Set a target, add money when you can, and Pennywise does the math."
        actions={
          <Button onClick={() => { setEditing(undefined); setDialogOpen(true); }}>
            <Plus className="size-4" /> New goal
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No savings goals yet"
          description="Emergency fund? New laptop? Baguio trip? Name it, set an amount and a date."
          action={<Button onClick={() => { setEditing(undefined); setDialogOpen(true); }}><Plus className="size-4" /> Create your first goal</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={() => { setEditing(g); setDialogOpen(true); }}
              onContribute={() => setContribFor(g)}
              onDelete={() => setConfirmDelete(g)}
            />
          ))}
        </div>
      )}

      {sorted.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" aria-hidden />
          Contributions aren't counted as expenses — they're money you set aside.
        </p>
      )}

      <GoalDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} />
      <ContributeDialog goal={contribFor} open={contribFor !== null} onOpenChange={(o) => !o && setContribFor(null)} />
      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete this goal?"
        description={confirmDelete ? `“${confirmDelete.name}” and its ${confirmDelete.contributions.length} contribution(s) will be removed. This can't be undone.` : ""}
        confirmLabel="Delete goal"
        destructive
        onConfirm={() => {
          if (confirmDelete) {
            deleteGoal(confirmDelete.id);
            toast.success("Goal deleted");
          }
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
