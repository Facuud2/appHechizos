"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ProgressiveImage: Eliminates abrupt image pop-in by showing a GPU-composited
 * concentric shimmer placeholder until the image is decoded, then cross-fading
 * smoothly in 180ms (--ease-out). Instant (0ms) if already in browser cache.
 */
export function ProgressiveImage({
  src,
  alt,
  className = "",
  containerClassName = "",
}: {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div className={`relative h-full w-full overflow-hidden ${containerClassName}`}>
      {!loaded && (
        <div
          aria-hidden="true"
          className="skeleton-shimmer absolute inset-0"
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`${className} transition-opacity duration-[180ms] ease-[var(--ease-out)] ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

/**
 * Anatomical Skeleton for Mis Hechizos (HomePage)
 * Matches 375x812px iOS mobile density: status strip + category pills + concentric spell cards.
 */
export function HomeGrimorioSkeleton({
  includeStatusAndFilters = true,
}: {
  includeStatusAndFilters?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label="Cargando grimorio..."
      className="space-y-4"
    >
      {includeStatusAndFilters && (
        <>
          {/* 3-Column Hairline Status Strip Skeleton */}
          <div className="grid grid-cols-3 divide-x divide-border-subtle rounded-[16px] border border-border-subtle bg-surface">
            {[0, 1, 2].map((col) => (
              <div key={col} className="px-3 py-2.5 sm:px-5 sm:py-3">
                <div className="skeleton-shimmer h-3 w-14 rounded-md" />
                <div className="skeleton-shimmer mt-2 h-6 w-12 rounded-lg sm:h-7" />
              </div>
            ))}
          </div>

          {/* Category Pill Carousel Skeleton */}
          <div className="flex gap-2 overflow-hidden pb-1">
            {[78, 96, 112, 88, 92].map((w, i) => (
              <div
                key={i}
                style={{ width: `${w}px` }}
                className="skeleton-shimmer h-9 shrink-0 rounded-full border border-border-subtle"
              />
            ))}
          </div>
        </>
      )}

      {/* Section Header + Anatomical Spell Card Grid */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-border-subtle pb-1.5">
          <div className="skeleton-shimmer h-5 w-36 rounded-lg sm:h-6" />
          <div className="skeleton-shimmer h-3.5 w-16 rounded-md" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-[16px] border border-border-subtle bg-surface p-3.5 sm:p-4"
            >
              {/* Top Row: Concentric 10px thumbnail inside 16px card + Title & Privacy badge */}
              <div className="flex items-start gap-3">
                <div className="skeleton-shimmer h-18 w-18 shrink-0 rounded-[10px] border border-border-subtle sm:h-20 sm:w-20" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="skeleton-shimmer h-4 w-3/4 rounded-md sm:h-5" />
                    <div className="skeleton-shimmer h-6 w-6 shrink-0 rounded-full sm:h-7 sm:w-7" />
                  </div>
                  <div className="skeleton-shimmer h-3 w-full rounded-md" />
                  <div className="skeleton-shimmer h-3 w-2/3 rounded-md" />
                </div>
              </div>

              {/* Bottom Hairline Metadata Footer */}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-2.5">
                <div className="skeleton-shimmer h-3.5 w-24 rounded-md" />
                <div className="flex items-center gap-1.5">
                  <div className="skeleton-shimmer h-5 w-10 rounded-[8px]" />
                  <div className="skeleton-shimmer h-5 w-16 rounded-[8px]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Anatomical Skeleton for My Bar Holístico (ExplorarMyBarPage)
 */
export function ExplorarBarSkeleton({
  includePicker = false,
}: {
  includePicker?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label="Evaluando disponibilidad..."
      className="space-y-5"
    >
      {includePicker && (
        <div className="rounded-[16px] border border-border-subtle bg-surface p-3.5 sm:p-4">
          <div className="skeleton-shimmer mb-3 h-10 w-full rounded-[11px]" />
          <div className="flex flex-wrap gap-2">
            {[84, 102, 74, 96, 110, 88, 78, 94].map((w, i) => (
              <div
                key={i}
                style={{ width: `${w}px` }}
                className="skeleton-shimmer h-9 rounded-full"
              />
            ))}
          </div>
        </div>
      )}

      {/* Ready 100% Section */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="skeleton-shimmer h-4 w-4 rounded-full" />
          <div className="skeleton-shimmer h-5 w-44 rounded-lg sm:h-6" />
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex min-w-0 items-start gap-3 rounded-[16px] border border-border-subtle bg-surface p-3.5 sm:p-4"
            >
              <div className="skeleton-shimmer h-15 w-15 shrink-0 rounded-[10px] sm:h-16 sm:w-16" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="skeleton-shimmer h-4 w-3/4 rounded-md" />
                <div className="skeleton-shimmer h-3 w-1/2 rounded-md" />
                <div className="skeleton-shimmer h-3.5 w-24 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Missing 1-2 Section */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="skeleton-shimmer h-4 w-4 rounded-full" />
          <div className="skeleton-shimmer h-5 w-52 rounded-lg sm:h-6" />
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex min-w-0 flex-col justify-between rounded-[16px] border border-border-subtle bg-surface p-3.5 sm:p-4"
            >
              <div className="flex items-start gap-3">
                <div className="skeleton-shimmer h-15 w-15 shrink-0 rounded-[10px] sm:h-16 sm:w-16" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="skeleton-shimmer h-4 w-2/3 rounded-md" />
                    <div className="skeleton-shimmer h-5 w-11 rounded-md" />
                  </div>
                  <div className="skeleton-shimmer h-3 w-1/2 rounded-md" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-2.5">
                <div className="skeleton-shimmer h-3.5 w-16 rounded-md" />
                <div className="skeleton-shimmer h-7 w-32 rounded-[8px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Anatomical Skeleton for Alacena & Stock (StockAlacenaPage)
 */
export function StockAlacenaSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando alacena..."
      className="flex w-full min-w-0 flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-3.5"
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex w-full min-w-0 flex-col justify-between rounded-[16px] border border-border-subtle bg-surface p-3.5 sm:p-4"
        >
          {/* Top Row: Concentric 10px Photo Box + Name/Group/Meta + Trash */}
          <div className="flex items-start gap-3">
            <div className="skeleton-shimmer h-15 w-15 shrink-0 rounded-[10px] border border-border-subtle sm:h-16 sm:w-16" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5">
                  <div className="skeleton-shimmer h-4 w-32 rounded-md" />
                  <div className="skeleton-shimmer h-4 w-16 rounded-md" />
                </div>
                <div className="skeleton-shimmer h-8 w-8 shrink-0 rounded-[10px]" />
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <div className="skeleton-shimmer h-5 w-20 rounded-lg" />
                <div className="skeleton-shimmer h-5 w-24 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Bottom Bar: Exact Qty Stepper + Sin Stock button */}
          <div className="mt-3.5 flex items-center justify-between gap-2.5 border-t border-border-subtle pt-3">
            <div className="skeleton-shimmer h-10 w-36 rounded-xl" />
            <div className="skeleton-shimmer h-10 w-24 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Anatomical Skeleton for Detalle de Hechizo (SpellDetailView)
 */
export function SpellDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando detalle del hechizo..."
      className="space-y-4"
    >
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="skeleton-shimmer h-9 w-24 rounded-[10px] sm:h-10" />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="skeleton-shimmer h-9 w-24 rounded-[10px] sm:h-10" />
          <div className="skeleton-shimmer h-9 w-20 rounded-[10px] sm:h-10" />
          <div className="skeleton-shimmer h-9 w-9 rounded-[10px] sm:h-10 sm:w-10" />
        </div>
      </div>

      {/* Hero Card with Cover, Title, Price & Variation Switcher */}
      <div className="rounded-[18px] border border-border-subtle bg-surface p-3.5 sm:p-6">
        <div className="skeleton-shimmer mb-3.5 h-40 w-full rounded-[12px] sm:mb-4 sm:h-52" />
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="skeleton-shimmer h-7 w-48 rounded-lg sm:h-9 sm:w-64" />
              <div className="skeleton-shimmer h-5 w-24 rounded-full" />
            </div>
            <div className="skeleton-shimmer h-3.5 w-60 rounded-md" />
          </div>
          <div className="skeleton-shimmer h-5 w-28 rounded-md" />
        </div>

        {/* Variation Switcher Bar */}
        <div className="mt-3.5 rounded-[12px] border border-border-subtle bg-canvas p-2.5 sm:mt-4 sm:p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="skeleton-shimmer h-10 w-10 rounded-[9px]" />
            <div className="flex flex-col items-center gap-1.5">
              <div className="skeleton-shimmer h-4 w-36 rounded-md" />
              <div className="skeleton-shimmer h-3 w-24 rounded-md" />
            </div>
            <div className="skeleton-shimmer h-10 w-10 rounded-[9px]" />
          </div>
        </div>
      </div>

      {/* Segmented Control Skeleton */}
      <div className="grid grid-cols-3 gap-1 rounded-[14px] border border-border-subtle bg-surface p-1 sm:max-w-xl">
        <div className="skeleton-shimmer h-9 rounded-[10px]" />
        <div className="skeleton-shimmer h-9 rounded-[10px] opacity-60" />
        <div className="skeleton-shimmer h-9 rounded-[10px] opacity-60" />
      </div>

      {/* Perform Ritual Banner + Checklist Skeleton */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-accent-soft/50 p-4">
        <div className="space-y-1.5">
          <div className="skeleton-shimmer-accent h-4 w-44 rounded-md" />
          <div className="skeleton-shimmer-accent h-3 w-36 rounded-md" />
        </div>
        <div className="skeleton-shimmer-accent h-11 w-36 rounded-xl" />
      </div>

      <div className="divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-surface p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <div className="skeleton-shimmer h-10 w-10 shrink-0 rounded-xl" />
              <div className="space-y-1.5">
                <div className="skeleton-shimmer h-4 w-36 rounded-md" />
                <div className="skeleton-shimmer h-3 w-44 rounded-md" />
              </div>
            </div>
            <div className="skeleton-shimmer h-9 w-9 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
