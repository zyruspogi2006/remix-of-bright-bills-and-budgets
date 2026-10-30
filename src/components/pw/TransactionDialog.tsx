import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { validateAmount } from "@/lib/finance";
import { uid, useStore } from "@/lib/store";
import { ACCOUNTS, type TxType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FieldError } from "./shared";

type TxErrors = { amount: string | null; date: string | null; categoryId: string | null; note: string | null };
const EMPTY_TX_ERRORS: TxErrors = { amount: null, date: null, categoryId: null, note: null };

export function TransactionDialog() {
  const { txDialog, closeTransaction, data, upsertTransaction, today } = useStore();
  const initial = txDialog.initial;
  const editing = Boolean(initial?.id);
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [categoryId, setCategoryId] = useState("");
  const [account, setAccount] = useState<string>("Cash");
  const [note, setNote] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [errors, setErrors] = useState<TxErrors>(EMPTY_TX_ERRORS);

  useEffect(() => {
    if (!txDialog.open) return;
    setType(initial?.type ?? "expense");
    setAmount(initial?.amount ? String(initial.amount) : "");
    setDate(initial?.date ?? today);
    setCategoryId(initial?.categoryId ?? "");
    setAccount(initial?.account ?? "Cash");
    setNote(initial?.note ?? "");
    setRecurring(initial?.recurring ?? false);
    setErrors(EMPTY_TX_ERRORS);
  }, [txDialog.open, initial, today]);

  const cats = data.categories.filter((c) => c.type === type);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: TxErrors = {
      amount: validateAmount(amount),
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? null : "Pick a date",
      categoryId: cats.some((c) => c.id === categoryId) ? null : "Choose a category",
      note: note.length > 200 ? "Keep notes under 200 characters" : null,
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    upsertTransaction({
      id: initial?.id ?? uid(),
      type,
      amount: Number(amount),
      date,
      categoryId,
      account,
      note: note.trim(),
      recurring,
      demo: editing ? initial?.demo : undefined,
    });
    toast.success(editing ? "Transaction updated" : `${type === "income" ? "Income" : "Expense"} added`);
    closeTransaction();
  };

  return (
    <Dialog open={txDialog.open} onOpenChange={(o) => !o && closeTransaction()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit transaction" : "New transaction"}</DialogTitle>
          <DialogDescription>Amounts are in {data.settings.currency}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div role="radiogroup" aria-label="Transaction type" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => {
                  setType(t);
                  setCategoryId("");
                }}
                className={cn(
                  "rounded-lg py-2 text-sm font-semibold capitalize transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  type === t ? (t === "income" ? "bg-card text-income shadow-sm" : "bg-card text-expense shadow-sm") : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Amount *</Label>
              <Input
                id="tx-amount"
                inputMode="decimal"
                placeholder="0.00"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={!!errors.amount}
                aria-describedby="tx-amount-err"
                className="tabular text-lg font-semibold"
              />
              <FieldError id="tx-amount-err" message={errors.amount} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Date *</Label>
              <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} aria-describedby="tx-date-err" />
              <FieldError id="tx-date-err" message={errors.date} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-cat">Category *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="tx-cat" aria-invalid={!!errors.categoryId} aria-describedby="tx-cat-err">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="tx-cat-err" message={errors.categoryId} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-account">Account / method</Label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger id="tx-account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNTS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx-note">Note</Label>
            <Textarea id="tx-note" rows={2} placeholder="e.g. Lunch with blockmates" value={note} onChange={(e) => setNote(e.target.value)} aria-describedby="tx-note-err" />
            <FieldError id="tx-note-err" message={errors.note} />
          </div>
          <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
            <div>
              <Label htmlFor="tx-rec">Recurring</Label>
              <p className="text-xs text-muted-foreground">Repeats monthly (e.g. allowance, rent)</p>
            </div>
            <Switch id="tx-rec" checked={recurring} onCheckedChange={setRecurring} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeTransaction}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save changes" : "Add transaction"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
