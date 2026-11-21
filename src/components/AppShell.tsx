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
import { IosBottomSheet } from "./IosBottomSheet";
import { MorphingStatusPill } from "./MorphingStatusPill";
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

  const activeNavIndex = Math.max(
    0,
    NAV_ITEMS.findIndex((item) =>
      item.href === "/"
        ? pathname === "/" || pathname.startsWith("/hechizos")
        : pathname.startsWith(item.href)
    )
  );

  return (
    <div className="min-h-dvh w-full overflow-x-clip bg-canvas text-ink md:flex">
      {/* Unified Morphing Status Pill (Idle = hidden, shows background sync or offline state) */}
      <MorphingStatusPill
        isFetching={isFetching}
        hasData={!!data}
        spellCount={data?.spells.length ?? 0}
        onSyncNow={() => refetch()}
      />

      {/* Mobile Translucent Top Bar (<768px) */}
      <div className="apple-chrome apple-chrome-top pt-safe sticky top-0 z-30 md:hidden">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-2 px-4">
          <Link href="/" className="apple-press flex items-center gap-2">
            <BrandMark className="h-7 w-7" />
            <span className="section-heading text-[17px] font-semibold tracking-[-0.01em] text-ink">
              Altar &amp; Hechizos
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            {canInstall && (
              <button
                type="button"
                onClick={promptInstall}
                className="apple-press hit-44 inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border-subtle bg-surface px-2.5 text-xs font-semibold text-accent-text"
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

        <nav
          aria-label="Navegación principal"
          className="flex-1 space-y-1 p-2.5 lg:p-3"
        >
          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const active = idx === activeNavIndex;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={`apple-press flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-medium lg:flex-row lg:justify-start lg:gap-3 lg:px-3.5 lg:py-2.5 lg:text-sm ${
                  active
                    ? "border border-border-subtle bg-surface font-semibold text-ink"
                    : "border border-transparent text-ink-muted hover:bg-surface-elevated hover:text-ink"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-transform duration-[150ms] ease-[var(--ease-out)] ${
                    active ? "scale-105 text-accent-text" : "text-ink-muted"
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
              <span className="hidden text-[11px] opacity-80 lg:inline">
                PWA
              </span>
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
      <main className="ios-scroll-content min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-3.5 md:px-7 md:py-6 lg:px-10 lg:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Translucent Bottom Tab Bar (<768px) with Fast Sliding Pill Indicator */}
      <nav
        aria-label="Navegación inferior"
        className="apple-chrome apple-chrome-bottom pb-safe fixed bottom-0 left-0 right-0 z-40 w-full md:hidden"
      >
        <div className="relative mx-auto grid max-w-md grid-cols-3 px-3 pt-1">
          {/* GPU-Composited Sliding Active Pill (160ms high-frequency rule) */}
          <span
            aria-hidden="true"
            style={{
              transform: `translateX(${activeNavIndex * 100}%)`,
            }}
            className="pointer-events-none absolute top-1 bottom-0 left-3 w-[calc((100%-24px)/3)] rounded-[11px] bg-accent-soft transition-transform duration-[160ms] ease-[var(--ease-out)]"
          />

          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const active = idx === activeNavIndex;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`apple-press relative z-10 flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[11px] px-2 py-1 text-[11px] leading-none font-medium tracking-[0.01em] transition-colors duration-[140ms] ${
                  active ? "text-accent-text font-semibold" : "text-ink-muted"
                }`}
              >
                <Icon
                  className={`h-[22px] w-[22px] transition-transform duration-[140ms] ease-[var(--ease-out)] ${
                    active ? "scale-105" : "scale-100"
                  }`}
                  strokeWidth={active ? 2.15 : 1.75}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* iOS Safari Install Guide Bottom Sheet (with 1:1 Drag-to-Dismiss) */}
      <IosBottomSheet
        open={iosGuideOpen}
        onClose={() => setIosGuideOpen(false)}
        ariaLabelledBy="ios-install-title"
      >
        <div className="pb-sheet-safe px-4 pt-1.5 pb-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-8 w-8" />
              <h2
                id="ios-install-title"
                className="section-heading text-[18px] font-semibold text-ink sm:text-xl"
              >
                Instalar en iPhone / iPad
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIosGuideOpen(false)}
              aria-label="Cerrar guía de instalación"
              className="apple-press hit-44 flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-muted hover:bg-surface-elevated hover:text-ink"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <p className="text-sm text-ink-muted">
            Agregá <strong className="text-ink">Altar &amp; Hechizos</strong> a
            tu pantalla de inicio para abrirla a pantalla completa como una app
            nativa:
          </p>

          <ol className="mt-4 space-y-2.5 text-sm text-ink">
            <li className="flex items-center gap-3 rounded-xl border border-border-subtle bg-canvas px-3.5 py-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-text tabular-nums">
                1
              </span>
              <span className="flex items-center gap-1.5">
                Tocá el botón{" "}
                <Share
                  className="inline h-4 w-4 text-accent-text"
                  aria-hidden="true"
                />{" "}
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
      </IosBottomSheet>
    </div>
  );
}
