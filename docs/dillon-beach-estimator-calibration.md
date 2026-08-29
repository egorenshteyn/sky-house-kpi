# Dillon Beach Estimator Calibration

Last calibrated: 2026-08-29

## Purpose

This document records the sanitized calibration inputs and formulas for the public Dillon Beach revenue estimator. It intentionally excludes property names, guest data, raw reservation rows, private annual results, and exact private annual revenue.

## Sanitized Source Aggregates

Recent local large-luxury operating sample: the sanitized combined 2023-2025 baseline is 310 paid nights across 1,096 calendar nights, or 28.3% paid occupancy. Weighted realized accommodation ADR is about $1,773. Year-by-year paid nights, occupancy, ADR, revenue, property names, guest data, and raw reservations are intentionally excluded from this public calibration note.

Recent 2023-2025 season revenue shares are rounded as:

| Season | Share |
| --- | ---: |
| Winter | 23% |
| Spring | 21% |
| Summer | 32% |
| Fall | 24% |

Asking-rate anchors use four active Dillon Beach listings, one listing per 2BR/6, 3BR/8, 4BR/10, and 5BR/14 tier. The observation window is May 1-July 31, 2026, with 92 daily snapshots per listing and 368 listing-days total.

| Tier | Average ask |
| --- | ---: |
| 2BR/6 | $663 |
| 3BR/8 | $892 |
| 4BR/10 | $1,173 |
| 5BR/14 | $1,624 |

Blocked or unavailable comp calendar days are not treated as bookings because they may be owner blocks, holds, or stale calendars. The 1BR and 6BR anchors are explicit extrapolations.

## Formula

1. Normalize input bounds for bedrooms, bathrooms, guests, owner-use weeks, and management rate.
2. Select the bedroom ADR anchor and multiply by the 0.90 asking-to-realized factor.
3. Apply non-bedroom ADR multipliers for property type, positioning, condition, view, access, bath fit, guest fit, and amenities. Clamp the combined non-bedroom multiplier to 0.72-1.35.
4. Select the bedroom-tier paid-occupancy baseline:

| Bedrooms | Paid occupancy baseline |
| --- | ---: |
| 1BR | 38% |
| 2BR | 36% |
| 3BR | 33% |
| 4BR | 30% |
| 5BR | 28% |
| 6BR | 26% |

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

6. Clamp paid occupancy to 20%-45%. Occupancy is a percent of rentable nights after owner-use weeks are removed.
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

The operating sample is a sanitized local large-luxury sample, so smaller-home occupancy baselines are modeled with a conservative bedroom-size curve rather than direct operating histories. The comp asking-rate dataset is a small active-listing snapshot and should be refreshed before treating the anchors as current market evidence.

## Refresh Procedure

1. Privately recompute year-level paid nights, paid occupancy, and realized accommodation ADR from local operating records, but publish only the combined recent aggregate and rounded seasonal shares.
2. Recompute the recent baseline from the latest three stable operating years, using aggregate paid nights divided by aggregate calendar nights.
3. Refresh active Dillon Beach asking-rate snapshots by bedroom tier. Do not infer occupancy from blocked or unavailable comp dates.
4. Recalculate rounded seasonal revenue shares from the same recent operating window.
5. Update estimator constants, public methodology copy, and this document together.
6. Run the estimator tests, TypeScript check, production build, scenario script, and `git diff --check`.
