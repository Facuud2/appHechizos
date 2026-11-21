import { AppShell } from "@/components/AppShell";
import { HomeGrimorioSkeleton } from "@/components/Skeletons";

export default function HomeLoading() {
  return (
    <AppShell>
      <div className="mb-4 flex items-start justify-between gap-2.5">
        <div className="space-y-1.5">
          <div className="skeleton-shimmer h-8 w-44 rounded-lg sm:h-10 sm:w-56" />
          <div className="skeleton-shimmer h-4 w-64 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="skeleton-shimmer h-10 w-24 rounded-[12px] sm:h-11 sm:w-28" />
          <div className="skeleton-shimmer h-10 w-20 rounded-[12px] sm:h-11 sm:w-24" />
        </div>
      </div>
      <HomeGrimorioSkeleton includeStatusAndFilters />
    </AppShell>
  );
}
