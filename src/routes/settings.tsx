import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CircleHelp, Download, Eraser, Pencil, Plus, RotateCcw, Sparkles, Trash2, Upload } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryBadge, ConfirmDialog, FieldError, PageHeader, Panel } from "@/components/pw/shared";
import { parseAppData, storageBytes } from "@/lib/storage";
import { formatMoney, todayISO, validateAmount } from "@/lib/finance";
import { uid, useStore } from "@/lib/store";
import { CATEGORY_ICONS, COLOR_CLASSES } from "@/lib/icons";
import { CURRENCIES, COLOR_KEYS, type AppData, type Category, type TxType } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Pennywise" },
      { name: "description", content: "Currency, theme, categories, backups and help for Pennywise." },
      { property: "og:title", content: "Settings — Pennywise" },
      { property: "og:description", content: "Currency, theme, categories, backups and help for Pennywise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const ICON_NAMES = Object.keys(CATEGORY_ICONS);

/** Add-or-edit category form. Empty `editing` means "adding a new one". */
function CategoryForm({ editing, onDone }: { editing: Category | null; onDone: () => void }) {
  const { upsertCategory, data } = useStore();
  const [name, setName] = useState(editing?.name ?? "");
  const [type, setType] = useState<TxType>(editing?.type ?? "expense");
  const [icon, setIcon] = useState(editing?.icon ?? "tag");
  const [color, setColor] = useState(editing?.color ?? "c8");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the category a name");
    if (trimmed.length > 60) return setError("Name is too long (max 60)");
    const clash = data.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editing?.id);
    if (clash) return setError(`"${trimmed}" already exists`);
    upsertCategory({ id: editing?.id ?? `cat-${uid()}`, name: trimmed, type, icon, color });
    toast.success(editing ? "Category updated" : `Category "${trimmed}" added`);
    onDone();
  };

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="cat-name">Name</Label>
        <Input id="cat-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-invalid={!!error} aria-describedby="cat-name-err" placeholder="e.g. Coffee runs" />
        <FieldError id="cat-name-err" message={error} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-type">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as TxType)}>
          <SelectTrigger id="cat-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-icon">Icon</Label>
        <Select value={icon} onValueChange={setIcon}>
          <SelectTrigger id="cat-icon"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-64">
            {ICON_NAMES.map((i) => {
              const Icon = CATEGORY_ICONS[i];
              return (
                <SelectItem key={i} value={i}>
                  <span className="inline-flex items-center gap-2"><Icon className="size-4" aria-hidden /> {i}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Colour</Label>
        <div className="flex flex-wrap gap-1.5 pt-1" role="radiogroup" aria-label="Category colour">
          {COLOR_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={color === k}
              aria-label={`Colour ${k}`}
              onClick={() => setColor(k)}
              className={cn("size-7 rounded-full transition-transform", COLOR_CLASSES[k].dot, color === k ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "hover:scale-110")}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit">{editing ? "Save changes" : "Add category"}</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function SettingsPage() {
  const store = useStore();
  const { data, updateSettings, upsertCategory, deleteCategory, loadDemo, clearDemo, demoActive, resetAll, replaceAll, money } = store;
  const [editing, setEditing] = useState<Category | null>(null);
  const [adding, setAdding] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importTarget, setImportTarget] = useState<AppData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openForm = (cat: Category | null) => {
    setEditing(cat);
    setAdding(cat === null);
    setFormOpen(true);
  };

  const backup = () => {
    const blob = JSON.stringify(data, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([blob], { type: "application/json" }));
    a.download = `pennywise-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast.success("Backup downloaded", { description: "Keep this file somewhere safe — it restores everything." });
  };

  const onImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const res = parseAppData(JSON.parse(String(reader.result)));
        if (!res.ok) {
          toast.error("Couldn't read that file", { description: res.error });
          return;
        }
        setImportTarget(res.data);
        if (res.dropped > 0) toast.warning(`${res.dropped} item${res.dropped === 1 ? "" : "s"} in the file were damaged and will be skipped.`);
      } catch {
        toast.error("Couldn't read that file", { description: "It isn't a valid Pennywise backup (JSON expected)." });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Make Pennywise yours, and keep your data safe." />

      <Panel title="Preferences">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="pref-currency">Currency</Label>
            <Select value={data.settings.currency} onValueChange={(v) => updateSettings({ currency: v })}>
              <SelectTrigger id="pref-currency"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pref-theme">Theme</Label>
            <Select value={data.settings.theme} onValueChange={(v) => updateSettings({ theme: v as "light" | "dark" | "system" })}>
              <SelectTrigger id="pref-theme"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">Match device</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pref-target">Monthly savings target</Label>
            <Input
              id="pref-target"
              inputMode="decimal"
              defaultValue={data.settings.monthlySavingsTarget ? String(data.settings.monthlySavingsTarget) : ""}
              placeholder="0"
              className="tabular"
              onBlur={(e) => {
                const raw = e.target.value.trim();
                if (!raw) return updateSettings({ monthlySavingsTarget: 0 });
                if (validateAmount(raw)) return toast.error(validateAmount(raw) ?? "Invalid amount");
                updateSettings({ monthlySavingsTarget: Number(raw) });
              }}
            />
            <p className="text-xs text-muted-foreground">Shown on the dashboard as your goal for leftover money.</p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Categories"
        action={
          <Button size="sm" variant="outline" onClick={() => openForm(null)}>
            <Plus className="size-4" /> Add
          </Button>
        }
      >
        {formOpen && <div className="mb-4 rounded-xl border bg-background p-4"><CategoryForm editing={editing} onDone={() => setFormOpen(false)} /></div>}
        <ul className="divide-y">
          {data.categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <CategoryBadge category={c} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-xs capitalize text-muted-foreground">{c.type}</p>
              </div>
              <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${c.name}`} onClick={() => openForm(c)}>
                <Pencil className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={`Delete ${c.name}`} onClick={() => setDeleteTarget(c)}>
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title={`Delete "${deleteTarget?.name}"?`}
          description="Transactions in this category will show as Uncategorized. Your budget limit for it is removed too."
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            if (deleteTarget) {
              deleteCategory(deleteTarget.id);
              toast.success("Category deleted");
            }
            setDeleteTarget(null);
          }}
        />
      </Panel>

      <Panel title="Demo data">
        <p className="mb-3 text-sm text-muted-foreground">
          Sample data of a Filipino student's month — allowance, jeepney fares, milk tea, the works. Demo items are marked and can be removed without touching your own data.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { loadDemo(); toast.success("Demo data loaded"); }}>
            <Sparkles className="size-4" /> Load demo data
          </Button>
          {demoActive && (
            <Button variant="outline" onClick={() => { clearDemo(); toast.success("Demo data removed"); }}>
              <Eraser className="size-4" /> Remove demo data
            </Button>
          )}
        </div>
      </Panel>

      <Panel title="Backup & restore">
        <p className="mb-3 text-sm text-muted-foreground">
          Pennywise saves in this browser only — clearing browser data removes everything. Download a backup regularly and keep it in your email or Google Drive.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={backup}><Download className="size-4" /> Download backup</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="size-4" /> Restore from backup</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Choose backup file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = "";
            }}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
        </p>
        <ConfirmDialog
          open={!!importTarget}
          onOpenChange={(o) => !o && setImportTarget(null)}
          title="Replace current data with this backup?"
          description="Everything currently saved in this browser will be replaced by the contents of the backup file."
          confirmLabel="Restore backup"
          destructive
          onConfirm={() => {
            if (importTarget) {
              replaceAll(importTarget);
              toast.success("Backup restored");
            }
            setImportTarget(null);
          }}
        />
      </Panel>

      <Panel title="Danger zone">
        <p className="mb-3 text-sm text-muted-foreground">Erase everything and start fresh. There's no undo — download a backup first if you might want your data back.</p>
        <Button variant="destructive" onClick={() => setConfirmReset(true)}>
          <RotateCcw className="size-4" /> Reset all data
        </Button>
        <ConfirmDialog
          open={confirmReset}
          onOpenChange={setConfirmReset}
          title="Delete all data?"
          description="All transactions, budgets, goals and bills will be permanently erased from this browser."
          confirmLabel="Erase everything"
          destructive
          onConfirm={() => {
            resetAll();
            setConfirmReset(false);
            toast.success("All data erased");
          }}
        />
      </Panel>

      <Panel title="Help" className="text-sm">
        <Accordion type="single" collapsible>
          <AccordionItem value="storage">
            <AccordionTrigger><span className="flex items-center gap-2"><CircleHelp className="size-4" aria-hidden /> Where is my data stored?</span></AccordionTrigger>
            <AccordionContent>
              In this browser only, on this device. There are no accounts and nothing is uploaded to the internet, which also means Pennywise works offline. If you clear your browser's site data, use private browsing, or open Pennywise in another browser or device, you won't see your data there.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="backup">
            <AccordionTrigger><span className="flex items-center gap-2"><CircleHelp className="size-4" aria-hidden /> How do I back up my data?</span></AccordionTrigger>
            <AccordionContent>
              Use <em>Backup &amp; restore</em> above: <em>Download backup</em> saves a single <code className="rounded bg-muted px-1">.json</code> file with everything. Keep a copy somewhere safe (email it to yourself, save it to Drive). Do this regularly — at least once a month.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="restore">
            <AccordionTrigger><span className="flex items-center gap-2"><CircleHelp className="size-4" aria-hidden /> How do I move my data to another phone or laptop?</span></AccordionTrigger>
            <AccordionContent>
              Download a backup here, open Pennywise on the other device, go to Settings → Backup &amp; restore → <em>Restore from backup</em>, and pick the file. Restoring replaces whatever is currently saved on that device.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="csv">
            <AccordionTrigger><span className="flex items-center gap-2"><CircleHelp className="size-4" aria-hidden /> Can I open my data in Excel or Sheets?</span></AccordionTrigger>
            <AccordionContent>
              Yes — the Reports page lets you export transactions as CSV, which Excel and Google Sheets open directly.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="demo">
            <AccordionTrigger><span className="flex items-center gap-2"><CircleHelp className="size-4" aria-hidden /> What is demo data?</span></AccordionTrigger>
            <AccordionContent>
              Sample transactions, goals and bills so you can explore before entering your own. Every demo item is tagged <em>Demo</em> and can be removed in one click without touching your own entries.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Panel>
    </div>
  );
}
