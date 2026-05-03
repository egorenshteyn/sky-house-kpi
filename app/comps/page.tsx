import SubHeader from "@/components/SubHeader";
import { getAllCompetitors } from "@/lib/queries";
import CompetitorsClient from "./CompetitorsClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function CompsPage() {
  const competitors = getAllCompetitors();
  return (
    <>
      <SubHeader
        title="Comp Set"
        subtitle="Track competitor properties and pricing in the Dillon Beach market"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/comps/calendar"
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              Pricing calendar
            </Link>
            <Link
              href="/comps/pricing"
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              Bulk pricing entry
            </Link>
          </div>
        }
      />
      <div className="px-6 py-6">
        <CompetitorsClient competitors={competitors} />
      </div>
    </>
  );
}
