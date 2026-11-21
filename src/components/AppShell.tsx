"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Download,
  ExternalLink,
  FlaskConical,
  Package,
  RefreshCw,
  Share,
  X,
} from "lucide-react";
import { useGrimorio } from "@/hooks/useGrimorioData";
import { usePwa } from "@/providers/PwaProvider";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Hechizos", icon: BookOpen },
  { href: "/explorar", label: "My Bar", icon: FlaskConical },
  { href: "/stock", label: "Alacena", icon: Package },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isFetching, refetch, data } = useGrimorio();
  const { canInstall, promptInstall, iosGuideOpen, setIosGuideOpen } = usePwa();

  return (
    <div className="min-h-dvh w-full overflow-x-clip bg-canvas text-ink md:flex">
      {/* Mobile Translucent Top Bar (<768px) */}
      <div className="apple-chrome apple-chrome-top pt-safe sticky top-0 z-30 md:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <span className="section-heading text-lg font-semibold text-ink">
              Altar &amp; Hechizos
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            {canInstall && (
              <button
                type="button"
                onClick={promptInstall}
                className="apple-press inline-flex h-11 items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-3 text-xs font-semibold text-accent-text"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Instalar</span>
              </button>
            )}
            <ThemeToggle variant="compact" />
          </div>
        </div>
      </div>

      {/* Tablet Rail (md) & Desktop Labelled Sidebar (lg+) */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-20 md:shrink-0 md:flex-col md:border-r md:border-border-subtle md:bg-surface-subtle/80 lg:w-64">
        <div className="flex items-center justify-center gap-3 border-b border-border-subtle px-3 py-4 lg:justify-start lg:px-5 lg:py-5">
          <BrandMark className="h-9 w-9 shrink-0" />
          <div className="hidden min-w-0 lg:block">
            <p className="section-heading truncate text-xl font-semibold text-ink">
              Altar &amp; Hechizos
            </p>
            <p className="mt-0.5 text-xs text-ink-dim">Grimorio personal</p>
          </div>
        </div>

        <nav aria-label="Navegación principal" className="flex-1 space-y-1 p-2.5 lg:p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/" || pathname.startsWith("/hechizos")
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={`apple-press flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-medium lg:flex-row lg:justify-start lg:gap-3 lg:px-3.5 lg:py-2.5 lg:text-sm ${
                  active
                    ? "bg-surface text-ink border border-border-subtle font-semibold"
                    : "border border-transparent text-ink-muted hover:bg-surface-elevated hover:text-ink"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? "text-accent-text" : "text-ink-muted"
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Utility Stack */}
        <div className="space-y-2 border-t border-border-subtle p-2.5 text-xs lg:p-4">
          {/* Theme Switcher */}
          <div className="hidden lg:block">
            <ThemeToggle variant="segmented" />
          </div>
          <div className="flex justify-center lg:hidden">
            <ThemeToggle variant="compact" />
          </div>

          {canInstall && (
            <button
              type="button"
              onClick={promptInstall}
              title="Instalar como app"
              className="apple-press flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 font-semibold text-accent-text lg:justify-between"
            >
              <span className="flex items-center gap-2">
                <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden lg:inline">Instalar app</span>
              </span>
              <span className="hidden text-[11px] opacity-80 lg:inline">PWA</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            title={isFetching ? "Sincronizando..." : "Sincronizar grimorio"}
            className="apple-press flex w-full items-center justify-center rounded-xl border border-border-subtle bg-surface px-2.5 py-2 text-ink-muted hover:border-border-strong hover:text-ink lg:justify-between lg:px-3"
          >
            <span className="flex items-center gap-2">
              <RefreshCw
                className={`h-3.5 w-3.5 shrink-0 ${
                  isFetching ? "animate-spin text-accent-text" : ""
                }`}
                aria-hidden="true"
              />
              <span className="hidden lg:inline">
                {isFetching ? "Sincronizando..." : "Sincronizado"}
              </span>
            </span>
            <span className="hidden tabular-nums text-[11px] text-ink-dim lg:inline">
              {data ? `${data.spells.length} hech.` : "—"}
            </span>
          </button>

          <a
            href="https://tarotdeluna.netlify.app"
            target="_blank"
            rel="noreferrer"
            title="Catálogo web público"
            className="apple-press flex w-full items-center justify-center rounded-xl px-2.5 py-2 text-ink-muted hover:bg-surface-elevated hover:text-ink lg:justify-between lg:px-3"
          >
            <span className="hidden lg:inline">Catálogo web público</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 pb-28 md:pb-10">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-7 md:py-6 lg:px-10 lg:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Translucent Bottom Tab Bar (<768px) */}
      <nav
        aria-label="Navegación inferior"
        className="apple-chrome apple-chrome-bottom pb-safe fixed bottom-0 left-0 right-0 z-40 w-full md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1 px-3 pt-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/" || pathname.startsWith("/hechizos")
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`apple-press flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-medium ${
                  active
                    ? "bg-accent-soft text-accent-text font-semibold"
                    : "text-ink-muted"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* iOS Safari Install Guide Bottom Sheet */}
      {iosGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="fixed inset-0 z-[70] flex items-end justify-center bg-[var(--bg-scrim)] p-0 sm:items-center sm:p-4"
          onClick={() => setIosGuideOpen(false)}
        >
          <div
            className="animate-sheet-enter pb-sheet-safe w-full max-w-md rounded-t-3xl border border-border-subtle bg-surface p-5 sm:rounded-2xl sm:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrandMark className="h-8 w-8" />
                <h2
                  id="ios-install-title"
                  className="section-heading text-xl font-semibold text-ink"
                >
                  Instalar en iPhone / iPad
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIosGuideOpen(false)}
                aria-label="Cerrar guía de instalación"
                className="apple-press flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-elevated hover:text-ink"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-sm text-ink-muted">
              Agregá <strong className="text-ink">Altar &amp; Hechizos</strong> a tu
              pantalla de inicio para abrirla a pantalla completa como una app
              nativa:
            </p>

            <ol className="mt-4 space-y-2.5 text-sm text-ink">
              <li className="flex items-center gap-3 rounded-xl border border-border-subtle bg-canvas px-3.5 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-text tabular-nums">
                  1
                </span>
                <span className="flex items-center gap-1.5">
                  Tocá el botón <Share className="inline h-4 w-4 text-accent-text" aria-hidden="true" />{" "}
                  <strong>Compartir</strong> en Safari.
                </span>
              </li>
              <li className="flex items-center gap-3 rounded-xl border border-border-subtle bg-canvas px-3.5 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-text tabular-nums">
                  2
                </span>
                <span>
                  Elegí <strong>Agregar a inicio</strong> y tocá{" "}
                  <strong>Agregar</strong>.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setIosGuideOpen(false)}
              className="apple-press mt-5 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-on-accent"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
