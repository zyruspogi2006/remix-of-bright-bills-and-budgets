import {
  Bus,
  Briefcase,
  Coffee,
  Film,
  Gift,
  GraduationCap,
  Heart,
  Home,
  PiggyBank,
  Plane,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Utensils,
  Wallet,
  Zap,
  Shirt,
  type LucideIcon,
} from "lucide-react";
import type { ColorKey } from "./types";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  bus: Bus,
  home: Home,
  zap: Zap,
  graduation: GraduationCap,
  bag: ShoppingBag,
  film: Film,
  heart: Heart,
  coffee: Coffee,
  phone: Smartphone,
  plane: Plane,
  shirt: Shirt,
  gift: Gift,
  briefcase: Briefcase,
  sparkles: Sparkles,
  wallet: Wallet,
  piggy: PiggyBank,
  tag: Tag,
};

/** Used when a category's icon key isn't in the map (e.g. imported data). */
export const FALLBACK_CATEGORY_ICON: LucideIcon = Tag;

export const COLOR_CLASSES: Record<ColorKey, { soft: string; bar: string; dot: string }> = {
  c1: { soft: "bg-cat-1/15 text-cat-1", bar: "bg-cat-1", dot: "bg-cat-1" },
  c2: { soft: "bg-cat-2/15 text-cat-2", bar: "bg-cat-2", dot: "bg-cat-2" },
  c3: { soft: "bg-cat-3/15 text-cat-3", bar: "bg-cat-3", dot: "bg-cat-3" },
  c4: { soft: "bg-cat-4/15 text-cat-4", bar: "bg-cat-4", dot: "bg-cat-4" },
  c5: { soft: "bg-cat-5/20 text-cat-5", bar: "bg-cat-5", dot: "bg-cat-5" },
  c6: { soft: "bg-cat-6/15 text-cat-6", bar: "bg-cat-6", dot: "bg-cat-6" },
  c7: { soft: "bg-cat-7/15 text-cat-7", bar: "bg-cat-7", dot: "bg-cat-7" },
  c8: { soft: "bg-cat-8/15 text-cat-8", bar: "bg-cat-8", dot: "bg-cat-8" },
};
