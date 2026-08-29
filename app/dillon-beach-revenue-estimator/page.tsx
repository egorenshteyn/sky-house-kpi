import type { Metadata } from "next";
import DillonBeachEstimatorClient from "./DillonBeachEstimatorClient";

export const metadata: Metadata = {
  title: "Dillon Beach Vacation Rental Revenue Estimator",
  description:
    "Estimate annual vacation-rental revenue, owner net, ADR, occupancy, and amenity opportunities for Dillon Beach, California homes.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function DillonBeachRevenueEstimatorPage() {
  return <DillonBeachEstimatorClient />;
}
