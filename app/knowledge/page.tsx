import SubHeader from "@/components/SubHeader";
import { getAllKnowledge } from "@/lib/queries";
import KnowledgeClient from "./KnowledgeClient";

export const dynamic = "force-dynamic";

export default function KnowledgePage({
  searchParams,
}: {
  searchParams?: { q?: string; type?: string };
}) {
  const search = (searchParams?.q || "").trim();
  const type = (searchParams?.type || "").trim();
  const entries = getAllKnowledge({
    search: search || undefined,
    type: type || undefined,
  });

  return (
    <>
      <SubHeader
        title="Knowledge Base"
        subtitle={`${entries.length} entr${entries.length === 1 ? "y" : "ies"} · context, strategy, experiments, and notes`}
      />
      <div className="px-6 py-6">
        <KnowledgeClient
          entries={entries}
          currentSearch={search}
          currentType={type}
        />
      </div>
    </>
  );
}
