"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Apple's rubberband resistance formula from Designing Fluid Interfaces (WWDC).
 */
function rubberband(overshoot: number, dimension: number, constant = 0.45): number {
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

export function IosBottomSheet({
  open,
  onClose,
  ariaLabelledBy,
  maxWidthClass = "max-w-md",
  shakeTick = 0,
  children,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabelledBy: string;
  maxWidthClass?: string;
  shakeTick?: number;
  children: ReactNode;
}) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const dragStartY = useRef<number>(0);
  const dragStartTime = useRef<number>(0);
  const currentOffsetY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
    } else if (rendered) {
      setClosing(true);
      const timer = setTimeout(() => {
        setRendered(false);
        setClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open, rendered]);

  // Trigger horizontal damped error shake (±6px, 240ms) without re-mounting or losing input focus
  useEffect(() => {
    if (shakeTick <= 0 || !sheetRef.current) return;
    const el = sheetRef.current;
    el.animate(
      [
        { transform: "translateX(0px)" },
        { transform: "translateX(-6px)", offset: 0.2 },
        { transform: "translateX(5px)", offset: 0.45 },
        { transform: "translateX(-3px)", offset: 0.7 },
        { transform: "translateX(2px)", offset: 0.85 },
        { transform: "translateX(0px)" },
      ],
      {
        duration: 240,
        easing: "cubic-bezier(0.23, 1, 0.32, 1)",
      }
    );
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(12);
    }
  }, [shakeTick]);

  // Escape key dismissal
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!rendered) return null;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Only initiate drag from the grab handle area or non-interactive header space
    const target = e.target as HTMLElement;
    if (target.closest("button, input, textarea, select, a")) return;
    if (isDragging.current) return; // Multi-touch guard

    activePointerId.current = e.pointerId;
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartTime.current = performance.now();
    currentOffsetY.current = 0;

    e.currentTarget.setPointerCapture(e.pointerId);

    if (sheetRef.current) {
      sheetRef.current.style.transition = "none";
    }
    if (scrimRef.current) {
      scrimRef.current.style.transition = "none";
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current || activePointerId.current !== e.pointerId) return;

    const rawDelta = e.clientY - dragStartY.current;
    const sheetEl = sheetRef.current;
    if (!sheetEl) return;

    // Downward drag follows 1:1; upward drag applies progressive Apple rubber-banding
    const offsetY =
      rawDelta >= 0 ? rawDelta : -rubberband(Math.abs(rawDelta), 180, 0.42);

    currentOffsetY.current = offsetY;
    sheetEl.style.transform = `translateY(${offsetY}px)`;

    if (scrimRef.current && offsetY > 0) {
      const progress = Math.min(1, offsetY / 320);
      scrimRef.current.style.opacity = String(1 - progress * 0.65);
    }
  }

  function handlePointerUpOrCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current || activePointerId.current !== e.pointerId) return;

    isDragging.current = false;
    activePointerId.current = null;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const elapsed = Math.max(1, performance.now() - dragStartTime.current);
    const distance = currentOffsetY.current;
    const velocity = distance / elapsed; // px/ms

    const sheetEl = sheetRef.current;
    const scrimEl = scrimRef.current;

    // Dismiss on downward flick (velocity > 0.11 px/ms) or distance >= 84px
    if (distance >= 84 || (distance > 20 && velocity > 0.11)) {
      if (sheetEl) {
        sheetEl.style.transition = "transform 200ms var(--ease-out), opacity 200ms var(--ease-out)";
        sheetEl.style.transform = "translateY(100%)";
      }
      if (scrimEl) {
        scrimEl.style.transition = "opacity 200ms var(--ease-out)";
        scrimEl.style.opacity = "0";
      }
      onClose();
      return;
    }

    // Otherwise snap back smoothly with iOS drawer curve
    if (sheetEl) {
      sheetEl.style.transition = "transform 280ms var(--ease-drawer)";
      sheetEl.style.transform = "translateY(0px)";
    }
    if (scrimEl) {
      scrimEl.style.transition = "opacity 240ms var(--ease-out)";
      scrimEl.style.opacity = "1";
    }
  }

  return (
    <div
      ref={scrimRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      className={`${
        closing ? "animate-scrim-exit" : "animate-scrim-enter"
      } fixed inset-0 z-[70] flex items-end justify-center bg-[var(--bg-scrim)] p-0 sm:items-center sm:p-4`}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        className={`${
          closing ? "animate-sheet-exit" : "animate-sheet-enter"
        } scroll-contain flex max-h-[88dvh] w-full ${maxWidthClass} flex-col overflow-hidden rounded-t-[24px] border border-border-subtle bg-surface sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Interactive Touch Grab Zone for 1:1 Drag-to-Dismiss */}
        <div
          className="cursor-grab touch-pan-x pt-2.5 pb-1 active:cursor-grabbing sm:hidden"
          title="Deslizá hacia abajo para cerrar"
        >
          <div className="ios-grab-handle" aria-hidden="true" />
        </div>

        {children}
      </div>
    </div>
  );
}
