import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { CATEGORY_ICONS, COLOR_CLASSES, FALLBACK_CATEGORY_ICON } from "@/lib/icons";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("surface p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export type Tone = "primary" | "warn" | "over" | "income" | "expense" | "muted" | string;
const toneBar: Record<string, string> = {
  primary: "bg-primary",
  warn: "bg-warning",
  over: "bg-destructive",
  income: "bg-income",
  expense: "bg-expense",
  muted: "bg-muted-foreground/40",
};

export function ProgressBar({ value, max, tone = "primary", label, className, size = "md" }: { value: number; max: number; tone?: Tone; label: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn("w-full overflow-hidden rounded-full bg-muted", size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2", className)}
    >
      <div className={cn("animate-fill h-full rounded-full transition-[width] duration-500", toneBar[tone] ?? tone)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function CategoryBadge({ category, size = "md" }: { category: Category; size?: "sm" | "md" }) {
  const Icon = CATEGORY_ICONS[category.icon] ?? FALLBACK_CATEGORY_ICON;
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-xl", COLOR_CLASSES[category.color].soft, size === "sm" ? "size-8" : "size-10")} aria-hidden>
      <Icon className={size === "sm" ? "size-4" : "size-5"} />
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center">
      <span className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DemoTag() {
  return <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-foreground">Demo</span>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className={cn(destructive && buttonVariants({ variant: "destructive" }))} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs font-medium text-destructive">
      {message}
    </p>
  );
}
