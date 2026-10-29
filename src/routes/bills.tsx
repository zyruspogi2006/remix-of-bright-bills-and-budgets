import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarClock, Check, Plus, RedoDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CategoryBadge, ConfirmDialog, DemoTag, EmptyState, FieldError, PageHeader } from "@/components/pw/shared";
import { billStatus, daysBetween, formatDate, round2, todayISO, validateAmount } from "@/lib/finance";
import { uid, useStore } from "@/lib/store";
import type { Bill } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bills")({
  head: () => ({
    meta: [
      { title: "Bills — Pennywise" },
      { name: "description", content: "Track due dates, mark bills paid and never miss a recurring bill." },
      { property: "og:title", content: "Bills — Pennywise" },
      { property: "og:description", content: "Track due dates, mark bills paid and never miss a recurring bill." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BillsPage,
});

function BillDialog({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: Partial<Bill> }) {
  const { data, upsertBill, today } = useStore();
  const editing = Boolean(initial?.id);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const expenseCats = data.categories.filter((c) => c.type === "expense");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setAmount(initial?.amount ? String(initial.amount) : "");
    setDueDate(initial?.dueDate ?? "");
    setCategoryId(initial?.categoryId ?? "");
    setRecurring(initial?.recurring ?? false);
    setErrors({});
  }, [open, initial]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = {
      name: name.trim() ? (name.trim().length > 60 ? "Keep the name under 60 characters" : null) : "Give the bill a name",
      amount: validateAmount(amount),
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? null : "Pick a due date",
      categoryId: expenseCats.some((c) => c.id === categoryId) ? null : "Choose a category",
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    upsertBill({
      id: initial?.id ?? uid(),
      name: name.trim(),
      amount: Number(amount),
      dueDate,
      categoryId,
      recurring,
      paid: initial?.paid ?? false,
      demo: editing ? initial?.demo : undefined,
    });
    toast.success(editing ? "Bill updated" : "Bill added");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit bill" : "New bill"}</DialogTitle>
          <DialogDescription>Recurring bills can jump to next month when you pay them.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="bill-name">Name *</Label>
            <Input id="bill-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dorm Wi-Fi share" aria-invalid={!!errors.name} aria-describedby="bill-name-err" />
            <FieldError id="bill-name-err" message={errors.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bill-amount">Amount *</Label>
              <Input id="bill-amount" inputMode="decimal" placeholder="0.00" className="tabular" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!errors.amount} aria-describedby="bill-amount-err" />
              <FieldError id="bill-amount-err" message={errors.amount} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bill-due">Due date *</Label>
              <Input id="bill-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-invalid={!!errors.dueDate} aria-describedby="bill-due-err" />
              <FieldError id="bill-due-err" message={errors.dueDate} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-cat">Category *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="bill-cat" aria-invalid={!!errors.categoryId} aria-describedby="bill-cat-err">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {expenseCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="bill-cat-err" message={errors.categoryId} />
          </div>
          <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
            <div>
              <Label htmlFor="bill-rec">Recurring monthly</Label>
              <p className="text-xs text-muted-foreground">Same bill, every month</p>
            </div>
            <Switch id="bill-rec" checked={recurring} onCheckedChange={setRecurring} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{editing ? "Save changes" : "Add bill"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-accent text-accent-foreground",
  overdue: "bg-destructive/10 text-destructive",
  "due-soon": "bg-warning/15 text-warning-foreground",
  upcoming: "bg-muted text-muted-foreground",
};
const STATUS_LABEL: Record<string, string> = { paid: "Paid", overdue: "Overdue", "due-soon": "Due soon", upcoming: "Upcoming" };

function BillsPage() {
  const { data, money, getCategory, deleteBill, setBillPaid, advanceBill, today } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Bill> | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<Bill | null>(null);

  const sorted = [...data.bills].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  });
  const unpaid = data.bills.filter((b) => !b.paid);
  const dueSoon = unpaid.filter((b) => billStatus(b, today) === "overdue" || billStatus(b, today) === "due-soon");
  const dueSoonTotal = round2(dueSoon.reduce((a, b) => a + b.amount, 0));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bills"
        description="Due dates at a glance — overdue first, then by date."
        actions={
          <Button onClick={() => { setEditing(undefined); setDialogOpen(true); }}>
            <Plus className="size-4" /> Add bill
          </Button>
        }
      />

      {unpaid.length > 0 && (
        <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm", dueSoon.length > 0 ? "border-warning/40 bg-warning/10" : "bg-card")}>
          <span className="inline-flex items-center gap-2 font-medium">
            <CalendarClock className="size-4" aria-hidden />
            {dueSoon.length > 0 ? `${dueSoon.length} bill${dueSoon.length > 1 ? "s" : ""} overdue or due within 7 days` : `${unpaid.length} unpaid bill${unpaid.length > 1 ? "s" : ""}, none urgent`}
          </span>
          <span className="tabular font-semibold">{money(dueSoonTotal)} to settle soon</span>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No bills tracked yet"
          description="Add rent, Wi-Fi, load plans or subscriptions so due dates never surprise you."
          action={<Button onClick={() => { setEditing(undefined); setDialogOpen(true); }}><Plus className="size-4" /> Add your first bill</Button>}
        />
      ) : (
        <ul className="surface divide-y">
          {sorted.map((b) => {
            const st = billStatus(b, today);
            const d = daysBetween(today, b.dueDate);
            return (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <CategoryBadge category={getCategory(b.categoryId)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {b.name} {b.demo && <DemoTag />} {b.recurring && <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Monthly</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(b.dueDate)}
                    {!b.paid && d >= 0 && ` · in ${d} day${d === 1 ? "" : "s"}`}
                    {!b.paid && d < 0 && ` · ${-d} day${-d === 1 ? "" : "s"} late`}
                  </p>
                </div>
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLE[st])}>
                  {STATUS_LABEL[st]}
                </span>
                <span className={cn("tabular w-24 text-right text-sm font-semibold", b.paid && "text-muted-foreground line-through")}>{money(b.amount)}</span>
                <div className="flex w-full gap-1.5 sm:w-auto">
                  {!b.paid ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { setBillPaid(b.id, true); toast.success(`“${b.name}” marked paid`); }}>
                        <Check className="size-4" /> Mark paid
                      </Button>
                      {b.recurring && (
                        <Button size="sm" variant="ghost" onClick={() => { advanceBill(b.id); toast.success(`Next “${b.name}” due ${formatDate(addMonth(b.dueDate))}`); }}>
                          <RedoDot className="size-4" /> Paid, next month
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => { setBillPaid(b.id, false); toast("Marked unpaid"); }}>
                      Undo payment
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(b); setDialogOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(b)}>Delete</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <BillDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} />
      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete this bill?"
        description={confirmDelete ? `“${confirmDelete.name}” will be removed from your list. This can't be undone.` : ""}
        confirmLabel="Delete bill"
        destructive
        onConfirm={() => {
          if (confirmDelete) {
            deleteBill(confirmDelete.id);
            toast.success("Bill deleted");
          }
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}

function addMonth(iso: string) {
  const d = todayISO();
  void d;
  const [y, m, day] = iso.split("-").map(Number);
  const target = new Date(y, m, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}
