import { AppShell } from "@/components/AppShell";
import { ExplorarBarSkeleton } from "@/components/Skeletons";

export default function ExplorarLoading() {
  return (
    <AppShell>
      <div className="mb-4 space-y-1.5">
        <div className="skeleton-shimmer h-8 w-48 rounded-lg sm:h-10 sm:w-64" />
        <div className="skeleton-shimmer h-4 w-72 rounded-md" />
      </div>
      <div className="mb-3.5 grid w-full grid-cols-2 gap-1 rounded-[14px] border border-border-subtle bg-surface p-1 sm:max-w-md">
        <div className="skeleton-shimmer h-9 rounded-[10px]" />
        <div className="skeleton-shimmer h-9 rounded-[10px] opacity-50" />
      </div>
      <ExplorarBarSkeleton includePicker />
    </AppShell>
  );
}
