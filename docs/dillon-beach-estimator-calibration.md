# Dillon Beach Estimator Calibration

Last calibrated: 2026-08-30

## Purpose

This document records the public calibration inputs and formulas for the Dillon Beach revenue estimator. It intentionally excludes property names, guest data, raw reservation rows, private annual results, and exact private annual revenue.

## Public Benchmark Sources

Paid occupancy is calibrated against public third-party Dillon Beach benchmark pages:

| Source | URL | Approved public values |
| --- | --- | --- |
| AirROI | https://www.airroi.com/airbnb-data/united-states/california/dillon-beach | Updated 2026-08-08, covering Aug 2025-Jul 2026: 81 active listings, 38.1% average occupancy, approximately 36% median occupancy, $725 ADR, and $96,206 average annual revenue. |
| STR Profit Map | https://www.strprofitmap.com/analysis/state/CA/dillon-beach | 149 reliable / 203 active listings, approximately 49.7% median occupancy, $503 ADR, and $79,068 median revenue. |
| AirDNA | https://www.airdna.co/vacation-rental-data/app/us/california/dillon-beach/overview | Public Dillon Beach overview exists; deeper methodology and data may be paywalled. |

These sources materially disagree because they use different filters, available-night denominators, and blocked-date treatment. They are third-party modeled estimates, not audited reservation records or government statistics.

## ADR Anchors

Asking-rate anchors use four active Dillon Beach listings, one listing per 2BR/6, 3BR/8, 4BR/10, and 5BR/14 tier. The observation window is May 1-July 31, 2026, with 92 daily snapshots per listing and 368 listing-days total.

| Tier | Average ask |
| --- | ---: |
| 2BR/6 | $663 |
| 3BR/8 | $892 |
| 4BR/10 | $1,173 |
| 5BR/14 | $1,624 |

Revenue converts asking-rate evidence to realized accommodation revenue with a 0.90 asking-to-realized ADR factor. Blocked or unavailable comp calendar days are not treated as bookings because they may be owner blocks, holds, or stale calendars. The 1BR and 6BR ADR anchors are explicit extrapolations.

## Seasonal Shares

Seasonal revenue shares are rounded model assumptions:

| Season | Share |
| --- | ---: |
| Winter | 23% |
| Spring | 21% |
| Summer | 32% |
| Fall | 24% |

These shares are allocation assumptions used after annual gross revenue is estimated. They are not sourced from the public occupancy benchmarks and are not presented as a private operating-sample result.

## Formula

1. Normalize input bounds for bedrooms, bathrooms, guests, owner-use weeks, and management rate.
2. Select the bedroom ADR anchor and multiply by the 0.90 asking-to-realized factor.
3. Apply non-bedroom ADR multipliers for property type, positioning, condition, view, access, bath fit, guest fit, and amenities. Clamp the combined non-bedroom multiplier to 0.72-1.35.
4. Select the bedroom-tier paid-occupancy baseline:

| Bedrooms | Paid occupancy baseline |
| --- | ---: |
| 1BR | 43% |
| 2BR | 42% |
| 3BR | 40% |
| 4BR | 38% |
| 5BR | 36% |
| 6BR | 35% |

5. Apply occupancy-point adjustments:

| Driver | Adjustment |
| --- | ---: |
| Direct ocean view | +2 |
| Partial ocean view | +0.5 |
| No ocean view | -1 |
| Walkable beach access | +1.5 |
| Nearby beach access | +0.5 |
| Drive-to beach access | -1 |
| Luxury positioning | -1.5 |
| Premium positioning | 0 |
| Standard positioning | +1 |
| Dated condition | -3 |
| Standard condition | -1 |
| Updated condition | 0 |
| Fully renovated condition | +0.5 |
| Designer condition | +0.5 |
| Hot tub | +1 |
| Pet-friendly | +1 |

6. Clamp paid occupancy to 25%-50%. The guardrail applies to both the midpoint and the displayed occupancy range. Occupancy is a percent of rentable nights after owner-use weeks are removed.
7. Gross accommodation revenue midpoint = blended ADR midpoint x rentable nights x paid occupancy.
8. Owner net = gross accommodation revenue less the selected management rate.
9. Seasonal revenue is allocated using 23/21/32/24 shares for winter/spring/summer/fall.

## Uncertainty

The public estimate uses intentionally wide deterministic ranges:

| Metric | Range |
| --- | ---: |
| Annual gross | +/-18% |
| Blended ADR | +/-12% |
| Occupancy | +/-15% |
| Booked nights | +/-15% |

## Limitations

This is an estimate, not an appraisal or guarantee. It does not include cleaning fees, transient occupancy tax, platform fees, operating expenses, insurance, repairs, debt service, or income tax effects. Results may differ because of listing quality, calendar strategy, minimum stays, cancellation policy, review count, channel mix, regulation, macro demand, and operational execution.

The occupancy model is centered on public third-party market benchmarks, with a conservative 3BR midpoint near 40%, smaller homes modestly higher, larger homes modestly lower, and a 25%-50% paid-occupancy guardrail. The comp asking-rate dataset is a small active-listing snapshot and should be refreshed before treating the ADR anchors as current market evidence.

## Refresh Procedure

1. Re-check the public AirROI, STR Profit Map, and AirDNA Dillon Beach pages for current URLs, update dates, coverage windows, listing counts, occupancy, ADR, and revenue values.
2. Compare source definitions before changing constants, especially listing filters, available-night denominators, and blocked-date treatment.
3. Refresh active Dillon Beach asking-rate snapshots by bedroom tier. Do not infer occupancy from blocked or unavailable comp dates.
4. Revisit rounded seasonal-share assumptions and document any model changes without attributing them to the public occupancy sources.
5. Update estimator constants, tests, UI methodology copy, and this document together.
6. Run the estimator tests, TypeScript check, production build, scenario script, and `git diff --check`.
