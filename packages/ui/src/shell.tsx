"use client";

import {
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  Workflow,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "./primitives";
import { cn } from "./utils";

export interface NavigationItem {
  readonly label: string;
  readonly href: string;
  readonly active?: boolean;
  readonly icon?: "dashboard" | "people" | "organization" | "workflow" | "security" | "settings";
}
const icons = {
  dashboard: LayoutDashboard,
  people: Users,
  organization: Building2,
  workflow: Workflow,
  security: ShieldCheck,
  settings: Settings,
};

export function AppShell({
  children,
  navigation,
  product = "Workspace",
}: {
  readonly children: ReactNode;
  readonly navigation: readonly NavigationItem[];
  readonly product?: string;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <Sidebar navigation={navigation} product={product} />
      <div className="min-w-0">
        <TopNav product={product} />
        <main id="main-content" className="mx-auto max-w-[96rem] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function Sidebar({
  navigation,
  product,
}: {
  readonly navigation: readonly NavigationItem[];
  readonly product: string;
}) {
  return (
    <aside className="hidden min-h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
          T
        </span>
        <div>
          <strong className="block text-sm">Tnvios</strong>
          <span className="text-xs text-sidebar-muted">{product}</span>
        </div>
      </div>
      <nav className="grid gap-1 p-3" aria-label={`${product} navigation`}>
        {navigation.map((item) => {
          const Icon = icons[item.icon ?? "dashboard"];
          return (
            <a
              key={item.label}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-muted transition hover:bg-sidebar-accent hover:text-sidebar-foreground",
                item.active && "bg-sidebar-accent text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </a>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-sidebar-border p-4 text-xs text-sidebar-muted">
        Permission-aware navigation
      </div>
    </aside>
  );
}

export function TopNav({ product }: { readonly product: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
      <Button aria-label="Open navigation" className="lg:hidden" size="icon" variant="ghost">
        <Menu className="size-5" />
      </Button>
      <button className="hidden min-w-64 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-muted-foreground shadow-sm sm:flex">
        <Search className="size-4" />
        <span className="flex-1">Search Tnvios</span>
        <kbd className="rounded border border-border bg-muted px-1.5 text-[10px]">⌘ K</kbd>
      </button>
      <button className="ml-auto hidden items-center gap-2 text-sm font-medium sm:flex">
        {product}
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>
      <Button aria-label="Help" size="icon" variant="ghost">
        <CircleHelp className="size-4" />
      </Button>
      <Button aria-label="Notifications" size="icon" variant="ghost">
        <Bell className="size-4" />
      </Button>
      <ThemeToggle />
      <span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        GM
      </span>
    </header>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const enabled =
      localStorage.getItem("tnvios-theme") === "dark" ||
      (!localStorage.getItem("tnvios-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("tnvios-theme", next ? "dark" : "light");
  }
  return (
    <Button
      aria-label={dark ? "Use light mode" : "Use dark mode"}
      onClick={toggle}
      size="icon"
      variant="ghost"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function PageHeader({
  actions,
  description,
  eyebrow,
  title,
}: {
  readonly actions?: ReactNode;
  readonly description: string;
  readonly eyebrow: string;
  readonly title: string;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
