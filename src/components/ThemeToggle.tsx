"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/providers/ThemeProvider";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "system", label: "Auto", icon: Monitor },
  { value: "dark", label: "Oscuro", icon: Moon },
];

export function ThemeToggle({
  variant = "compact",
}: {
  variant?: "compact" | "segmented";
}) {
  const { preference, resolved, setPreference, toggleTheme } = useTheme();

  if (variant === "segmented") {
    const activeIndex = Math.max(
      0,
      OPTIONS.findIndex((o) => o.value === preference)
    );

    return (
      <div
        role="radiogroup"
        aria-label="Tema de apariencia"
        className="relative grid grid-cols-3 rounded-xl border border-border-subtle bg-canvas p-1"
      >
        {/* Sliding Concentric Active Thumb (Outer 12px - 4px pad = 8px inner) */}
        <span
          aria-hidden="true"
          style={{
            transform: `translateX(${activeIndex * 100}%)`,
          }}
          className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-8px)/3)] rounded-lg border border-border-subtle bg-surface transition-transform duration-[180ms] ease-[var(--ease-in-out)]"
        />

        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = preference === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPreference(opt.value)}
              className={`apple-press relative z-10 flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors duration-[150ms] ${
                active
                  ? "text-ink font-semibold"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        resolved === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
      }
      title={resolved === "dark" ? "Modo claro" : "Modo oscuro"}
      className="apple-press hit-44 relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-border-subtle bg-surface text-ink-muted hover:border-border-strong hover:text-ink md:h-10 md:w-10"
    >
      <Sun
        className={`h-4 w-4 text-accent-text transition-[transform,opacity,filter] duration-[160ms] ease-[var(--ease-out)] ${
          resolved === "dark"
            ? "scale-100 opacity-100 blur-0"
            : "pointer-events-none absolute scale-75 opacity-0 blur-[2px]"
        }`}
        aria-hidden="true"
      />
      <Moon
        className={`h-4 w-4 text-ink transition-[transform,opacity,filter] duration-[160ms] ease-[var(--ease-out)] ${
          resolved !== "dark"
            ? "scale-100 opacity-100 blur-0"
            : "pointer-events-none absolute scale-75 opacity-0 blur-[2px]"
        }`}
        aria-hidden="true"
      />
    </button>
  );
}
