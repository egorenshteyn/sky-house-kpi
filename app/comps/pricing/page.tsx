import SubHeader from "@/components/SubHeader";
import { getAllCompetitors, getCompPricing } from "@/lib/queries";
import BulkPricingClient from "./BulkPricingClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function CompPricingPage() {
  const competitors = getAllCompetitors();
  const recent = getCompPricing({ limit: 100 });
  return (
    <>
      <SubHeader
        title="Comp Pricing Entry"
        subtitle="Bulk-enter competitor pricing across a date range"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/comps"
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              Manage comps
            </Link>
            <Link
              href="/comps/calendar"
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              Pricing calendar
            </Link>
          </div>
        }
      />
      <div className="px-6 py-6">
        <BulkPricingClient competitors={competitors} recent={recent} />
      </div>
    </>
  );
}
