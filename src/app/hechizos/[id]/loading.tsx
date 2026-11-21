import { AppShell } from "@/components/AppShell";
import { SpellDetailSkeleton } from "@/components/Skeletons";

export default function SpellDetailLoading() {
  return (
    <AppShell>
      <SpellDetailSkeleton />
    </AppShell>
  );
}
