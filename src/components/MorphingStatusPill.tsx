"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, WifiOff, X } from "lucide-react";

type PillState = "idle" | "syncing" | "synced" | "offline";

export function MorphingStatusPill({
  isFetching,
  hasData,
  spellCount,
  onSyncNow,
}: {
  isFetching: boolean;
  hasData: boolean;
  spellCount: number;
  onSyncNow: () => void;
}) {
  const [isOnline, setIsOnline] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [pillState, setPillState] = useState<PillState>("idle");
  const [wasFetching, setWasFetching] = useState(false);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setPillState("offline");
      return;
    }
    if (isFetching && hasData) {
      setWasFetching(true);
      setPillState("syncing");
      return;
    }
    if (wasFetching && !isFetching && hasData) {
      setWasFetching(false);
      setPillState("synced");
      const timer = setTimeout(() => {
        setPillState("idle");
        setExpanded(false);
      }, 1600);
      return () => clearTimeout(timer);
    }
    setPillState("idle");
  }, [isOnline, isFetching, hasData, wasFetching]);

  if (pillState === "idle") return null;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-50 flex justify-center px-4"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 54px)",
      }}
    >
      {expanded ? (
        <div
          role="status"
          aria-live="polite"
          className="animate-pill-enter apple-chrome pointer-events-auto flex w-full max-w-xs items-center justify-between gap-3 rounded-[20px] border border-border-strong px-3.5 py-2.5 shadow-sm"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            {pillState === "offline" ? (
              <WifiOff className="h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
            ) : pillState === "syncing" ? (
              <RefreshCw
                className="h-4 w-4 shrink-0 animate-spin text-accent-text"
                aria-hidden="true"
              />
            ) : (
              <CheckCircle2
                className="animate-check-pop h-4 w-4 shrink-0 text-ready"
                aria-hidden="true"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink">
                {pillState === "offline"
                  ? "Sin conexión · Cache local activo"
                  : pillState === "syncing"
                    ? "Sincronizando grimorio en segundo plano"
                    : "Grimorio al día"}
              </p>
              <p className="truncate text-[11px] text-ink-muted tabular-nums">
                {spellCount} hechizos disponibles al instante
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {pillState === "offline" && (
              <button
                type="button"
                onClick={onSyncNow}
                className="apple-press rounded-lg bg-accent-soft px-2 py-1 text-[11px] font-semibold text-accent-text"
              >
                Reintentar
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Contraer estado"
              className="apple-press flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:bg-surface-elevated hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-live="polite"
          className="animate-pill-enter apple-press apple-chrome pointer-events-auto inline-flex h-8 items-center gap-2 rounded-full border border-border-strong px-3 text-xs font-semibold text-ink shadow-xs"
        >
          {pillState === "offline" ? (
            <>
              <WifiOff className="h-3.5 w-3.5 text-warn" aria-hidden="true" />
              <span>Modo offline · Guardado local</span>
            </>
          ) : pillState === "syncing" ? (
            <>
              <RefreshCw
                className="h-3.5 w-3.5 animate-spin text-accent-text"
                aria-hidden="true"
              />
              <span>Sincronizando...</span>
            </>
          ) : (
            <>
              <CheckCircle2
                className="animate-check-pop h-3.5 w-3.5 text-ready"
                aria-hidden="true"
              />
              <span>Grimorio sincronizado</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
