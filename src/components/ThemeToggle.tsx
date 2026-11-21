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
    return (
      <div
        role="radiogroup"
        aria-label="Tema de apariencia"
        className="grid grid-cols-3 gap-1 rounded-xl border border-border-subtle bg-canvas p-1"
      >
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
              className={`apple-press flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium ${
                active
                  ? "bg-surface text-ink border border-border-subtle"
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
      className="apple-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface text-ink-muted hover:border-border-strong hover:text-ink"
    >
      {resolved === "dark" ? (
        <Sun className="h-4 w-4 text-accent-text" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-ink" aria-hidden="true" />
      )}
    </button>
  );
}
