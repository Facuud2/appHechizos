import { AppShell } from "@/components/AppShell";
import { SpellDetailView } from "@/components/SpellDetailView";

export default async function SpellPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ var?: string; improvise?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  return (
    <AppShell>
      <SpellDetailView
        spellId={id}
        initialVariationId={sp.var ?? null}
        openNewVariationModal={sp.improvise === "1"}
      />
    </AppShell>
  );
}
