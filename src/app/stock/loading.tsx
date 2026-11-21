import { AppShell } from "@/components/AppShell";
import { StockAlacenaSkeleton } from "@/components/Skeletons";

export default function StockLoading() {
  return (
    <AppShell>
      <div className="mb-4 flex items-start justify-between gap-2.5">
        <div className="space-y-1.5">
          <div className="skeleton-shimmer h-8 w-48 rounded-lg sm:h-10 sm:w-56" />
          <div className="skeleton-shimmer h-4 w-64 rounded-md" />
        </div>
        <div className="skeleton-shimmer h-10 w-20 rounded-[12px] sm:h-11 sm:w-24" />
      </div>
      <div className="mb-2.5 flex gap-2">
        <div className="skeleton-shimmer h-10 flex-1 rounded-[14px]" />
        <div className="skeleton-shimmer h-10 w-24 rounded-[14px]" />
      </div>
      <div className="mb-5 flex gap-2 overflow-hidden pb-1">
        {[76, 88, 72, 92, 84].map((w, i) => (
          <div
            key={i}
            style={{ width: `${w}px` }}
            className="skeleton-shimmer h-9 shrink-0 rounded-full"
          />
        ))}
      </div>
      <StockAlacenaSkeleton />
    </AppShell>
  );
}
