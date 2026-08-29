"use client";

import { useMemo, useState } from "react";
import {
  calculateDillonBeachEstimate,
  type BeachAccess,
  type DillonBeachAmenities,
  type DillonBeachEstimatorInput,
  type DillonBeachEstimatorOutput,
  type InteriorCondition,
  type MarketPositioning,
  type OceanView,
  type PropertyType,
} from "@/lib/dillonBeachEstimator";
import styles from "./DillonBeachEstimator.module.css";

type StepKey = "about" | "property" | "features" | "review";

const steps: { key: StepKey; label: string }[] = [
  { key: "about", label: "About you" },
  { key: "property", label: "Property" },
  { key: "features", label: "Features" },
  { key: "review", label: "Review" },
];

const amenityLabels: { key: keyof DillonBeachAmenities; label: string; detail: string }[] = [
  { key: "hotTub", label: "Hot tub", detail: "Four-season conversion support" },
  { key: "petFriendly", label: "Pet friendly", detail: "Broader Bay Area demand" },
  { key: "fireplace", label: "Fireplace", detail: "Winter and shoulder appeal" },
  { key: "gameRoom", label: "Game room", detail: "Group and family utility" },
  { key: "evCharger", label: "EV charger", detail: "Premium drive-to convenience" },
  { key: "firePitDeck", label: "Fire pit or deck", detail: "Coastal gathering space" },
];

const initialInput: DillonBeachEstimatorInput = {
  firstName: "",
  email: "",
  addressOrNeighborhood: "",
  bedrooms: 3,
  bathrooms: 2.5,
  maxGuests: 8,
  propertyType: "house",
  marketPositioning: "premium",
  interiorCondition: "updated",
  oceanView: "partial",
  beachAccess: "nearby",
  amenities: {
    hotTub: false,
    petFriendly: false,
    fireplace: true,
    gameRoom: false,
    evCharger: false,
    firePitDeck: true,
  },
  ownerUseWeeks: 2,
  managementRate: 20,
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function number(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function sentence(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isValidOptionalEmail(value: string) {
  const trimmed = value.trim();
  return trimmed.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function enabledAmenityLabels(amenities: DillonBeachAmenities) {
  return amenityLabels
    .filter((amenity) => amenities[amenity.key])
    .map((amenity) => amenity.label);
}

function RadioGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string; detail?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend>{legend}</legend>
      <div className={styles.optionGrid}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`${styles.optionCard} ${value === option.value ? styles.optionCardActive : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
            {option.detail ? <small>{option.detail}</small> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function buildSummary(result: DillonBeachEstimatorOutput) {
  return [
    `Dillon Beach estimate for ${result.personalization.firstName}`,
    `Annual gross: ${money(result.annualGross.low)} to ${money(result.annualGross.high)} (${money(result.annualGross.midpoint)} midpoint)`,
    `Owner net after ${result.inputs.managementRate}% management: ${money(result.ownerNet.low)} to ${money(result.ownerNet.high)} before operating expenses, taxes, and debt service`,
    `Blended ADR: ${money(result.blendedAdr.low)} to ${money(result.blendedAdr.high)}`,
    `Paid occupancy: ${percent(result.occupancy.low)} to ${percent(result.occupancy.high)}`,
    `Booked nights: ${number(result.bookedNights.low)} to ${number(result.bookedNights.high)}`,
    `Link: ${typeof window !== "undefined" ? window.location.href : ""}`,
  ].join("\n");
}

export default function DillonBeachEstimatorClient() {
  const [input, setInput] = useState<DillonBeachEstimatorInput>(initialInput);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<DillonBeachEstimatorOutput | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const currentStep = steps[stepIndex].key;
  const emailIsValid = isValidOptionalEmail(input.email || "");
  const showEmailError = (input.email || "").trim().length > 0 && !emailIsValid;
  const canContinue = currentStep !== "about" || (input.firstName.trim().length > 0 && emailIsValid);

  const chips = useMemo(
    () => [
      `${input.bedrooms} bedrooms`,
      `${input.bathrooms} baths`,
      `${input.maxGuests} guests`,
      sentence(input.marketPositioning),
      sentence(input.oceanView) + " view",
      `${input.ownerUseWeeks} owner weeks`,
      ...enabledAmenityLabels(input.amenities),
    ],
    [input],
  );

  function update<K extends keyof DillonBeachEstimatorInput>(key: K, value: DillonBeachEstimatorInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function updateAmenity(key: keyof DillonBeachAmenities) {
    setInput((current) => ({
      ...current,
      amenities: { ...current.amenities, [key]: !current.amenities[key] },
    }));
  }

  function generateEstimate() {
    const estimate = calculateDillonBeachEstimate(input);
    setResult(estimate);
    setGeneratedAt(new Date().toISOString());
    setStatus("Estimate generated");
    window.setTimeout(() => {
      document.getElementById("estimate-report")?.focus();
    }, 0);
  }

  async function copySummary() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildSummary(result));
      setStatus("Estimate summary and link copied");
    } catch {
      setStatus("Copy failed. Use Email, Print, or select the report text.");
    }
  }

  function continueToNextStep() {
    if (currentStep === "about") {
      if (!canContinue) return;
    }
    setStepIndex((index) => Math.min(steps.length - 1, index + 1));
  }

  const mailto = result
    ? `mailto:${encodeURIComponent(input.email || "")}?subject=${encodeURIComponent("Your Dillon Beach revenue estimate")}&body=${encodeURIComponent(buildSummary(result))}`
    : "#";

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.nav}>
          <span className={styles.brand}>Dillon Beach Revenue Estimator</span>
          <span className={styles.navNote}>Public tool. No login.</span>
        </div>
        <section className={styles.heroInner} aria-labelledby="hero-title">
          <div>
            <p className={styles.eyebrow}>Dillon Beach, California</p>
            <h1 id="hero-title">Estimate vacation-rental revenue before you list, buy, or upgrade.</h1>
            <p className={styles.heroCopy}>
              A data-informed public estimator for coastal homes, calibrated with local Dillon Beach
              asking-rate observations, conservative realized-demand assumptions, seasonality, and practical amenity uplifts.
            </p>
          </div>
          <div className={styles.heroPanel} aria-label="Example estimate preview">
            <span>Typical output</span>
            <strong>$120k to $420k</strong>
            <p>Gross accommodation revenue range depends on size, view, condition, guest capacity, and owner use.</p>
          </div>
        </section>
        <div className={styles.trustStrip} aria-label="Estimator trust signals">
          <span>Local Dillon Beach calibration</span>
          <span>No account required</span>
          <span>Instant estimate</span>
        </div>
      </div>

      <main className={styles.main}>
        {!result ? (
          <section className={styles.estimatorShell} aria-labelledby="form-title">
            <div className={styles.progressPanel}>
              <p className={styles.eyebrow}>Step {stepIndex + 1} of {steps.length}</p>
              <h2 id="form-title">Build your estimate</h2>
              <ol className={styles.steps}>
                {steps.map((step, index) => (
                  <li key={step.key} className={index === stepIndex ? styles.stepActive : ""}>
                    <span>{index + 1}</span>
                    {step.label}
                  </li>
                ))}
              </ol>
              <p className={styles.privacyNote}>
                Your email is optional. The estimate is not gated, and this public page uses only the inputs you provide.
              </p>
            </div>

            <form className={styles.formCard} onSubmit={(event) => event.preventDefault()}>
              {currentStep === "about" ? (
                <div className={styles.formStep}>
                  <div>
                    <p className={styles.eyebrow}>About you</p>
                    <h2>A few basics</h2>
                    <p>First name personalizes the report. Email is only used to prefill your own mail app.</p>
                  </div>
                  <label className={styles.field}>
                    <span>First name *</span>
                    <input
                      value={input.firstName}
                      onChange={(event) => update("firstName", event.target.value)}
                      autoComplete="given-name"
                      required
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Email optional</span>
                    <input
                      type="email"
                      value={input.email}
                      onChange={(event) => update("email", event.target.value)}
                      autoComplete="email"
                      placeholder="you@example.com"
                      aria-invalid={!emailIsValid}
                      aria-describedby={showEmailError ? "email-error" : undefined}
                    />
                    {showEmailError ? (
                      <small id="email-error" className={styles.fieldError}>
                        Enter a valid email address or leave it blank.
                      </small>
                    ) : null}
                  </label>
                  <label className={styles.field}>
                    <span>Property address or neighborhood optional</span>
                    <input
                      value={input.addressOrNeighborhood}
                      onChange={(event) => update("addressOrNeighborhood", event.target.value)}
                      placeholder="Oceana Drive, Village, Oceana Marin..."
                    />
                  </label>
                </div>
              ) : null}

              {currentStep === "property" ? (
                <div className={styles.formStep}>
                  <div>
                    <p className={styles.eyebrow}>Property</p>
                    <h2>Size, fit, and positioning</h2>
                  </div>
                  <div className={styles.numberGrid}>
                    <label className={styles.field}>
                      <span>Bedrooms</span>
                      <input type="number" min={1} max={6} value={input.bedrooms} onChange={(event) => update("bedrooms", Number(event.target.value))} />
                    </label>
                    <label className={styles.field}>
                      <span>Bathrooms</span>
                      <input type="number" min={1} max={6} step={0.5} value={input.bathrooms} onChange={(event) => update("bathrooms", Number(event.target.value))} />
                    </label>
                    <label className={styles.field}>
                      <span>Max guests</span>
                      <input type="number" min={2} max={16} value={input.maxGuests} onChange={(event) => update("maxGuests", Number(event.target.value))} />
                    </label>
                  </div>
                  <RadioGroup<PropertyType>
                    legend="Property type"
                    name="property-type"
                    value={input.propertyType}
                    onChange={(value) => update("propertyType", value)}
                    options={[
                      { value: "cottage", label: "Cottage", detail: "Smaller coastal escape" },
                      { value: "house", label: "House", detail: "Core Dillon Beach home" },
                      { value: "luxury-home", label: "Luxury home", detail: "Larger, higher-service expectations" },
                    ]}
                  />
                  <RadioGroup<MarketPositioning>
                    legend="Market positioning"
                    name="market-positioning"
                    value={input.marketPositioning}
                    onChange={(value) => update("marketPositioning", value)}
                    options={[
                      { value: "standard", label: "Standard" },
                      { value: "premium", label: "Premium" },
                      { value: "luxury", label: "Luxury" },
                    ]}
                  />
                  <RadioGroup<InteriorCondition>
                    legend="Interior condition"
                    name="interior-condition"
                    value={input.interiorCondition}
                    onChange={(value) => update("interiorCondition", value)}
                    options={[
                      { value: "dated", label: "Dated" },
                      { value: "standard", label: "Standard" },
                      { value: "updated", label: "Updated" },
                      { value: "fully-renovated", label: "Fully renovated" },
                      { value: "designer", label: "Designer" },
                    ]}
                  />
                </div>
              ) : null}

              {currentStep === "features" ? (
                <div className={styles.formStep}>
                  <div>
                    <p className={styles.eyebrow}>Features</p>
                    <h2>Coastal demand drivers</h2>
                  </div>
                  <RadioGroup<OceanView>
                    legend="Ocean view quality"
                    name="ocean-view"
                    value={input.oceanView}
                    onChange={(value) => update("oceanView", value)}
                    options={[
                      { value: "none", label: "None" },
                      { value: "partial", label: "Partial" },
                      { value: "direct", label: "Direct" },
                    ]}
                  />
                  <RadioGroup<BeachAccess>
                    legend="Beach access"
                    name="beach-access"
                    value={input.beachAccess}
                    onChange={(value) => update("beachAccess", value)}
                    options={[
                      { value: "drive", label: "Drive" },
                      { value: "nearby", label: "Nearby" },
                      { value: "walkable", label: "Walkable" },
                    ]}
                  />
                  <fieldset className={styles.fieldset}>
                    <legend>Amenities</legend>
                    <div className={styles.amenityGrid}>
                      {amenityLabels.map((amenity) => (
                        <label key={amenity.key} className={`${styles.toggleCard} ${input.amenities[amenity.key] ? styles.toggleActive : ""}`}>
                          <input type="checkbox" checked={input.amenities[amenity.key]} onChange={() => updateAmenity(amenity.key)} />
                          <span>{amenity.label}</span>
                          <small>{amenity.detail}</small>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className={styles.numberGrid}>
                    <label className={styles.field}>
                      <span>Owner-use weeks per year</span>
                      <input type="number" min={0} max={16} value={input.ownerUseWeeks} onChange={(event) => update("ownerUseWeeks", Number(event.target.value))} />
                    </label>
                    <label className={styles.field}>
                      <span>Management rate</span>
                      <select value={input.managementRate} onChange={(event) => update("managementRate", Number(event.target.value))}>
                        {[0, 15, 20, 25, 30].map((rate) => (
                          <option key={rate} value={rate}>{rate}%</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ) : null}

              {currentStep === "review" ? (
                <div className={styles.formStep}>
                  <div>
                    <p className={styles.eyebrow}>Review</p>
                    <h2>Ready to generate</h2>
                    <p>Review the inputs below, then generate a deterministic estimate.</p>
                  </div>
                  <div className={styles.summaryGrid}>
                    {chips.map((chip) => <span key={chip}>{chip}</span>)}
                  </div>
                  <button type="button" className={styles.primaryButton} onClick={generateEstimate}>
                    Generate estimate
                  </button>
                </div>
              ) : null}

              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setStepIndex((index) => Math.max(0, index - 1))} disabled={stepIndex === 0}>
                  Back
                </button>
                {currentStep !== "review" ? (
                  <button type="button" className={styles.primaryButton} onClick={continueToNextStep} disabled={!canContinue}>
                    Continue
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        ) : (
          <section id="estimate-report" className={styles.report} tabIndex={-1} aria-labelledby="report-title">
            <div className={styles.reportHeader}>
              <div>
                <p className={styles.eyebrow}>{new Date(generatedAt || Date.now()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                <h2 id="report-title">{result.personalization.firstName}, here is your Dillon Beach estimate.</h2>
                <div className={styles.summaryGrid}>{chips.map((chip) => <span key={chip}>{chip}</span>)}</div>
              </div>
              <div className={styles.reportActions}>
                <button className={styles.secondaryButton} type="button" onClick={() => setResult(null)}>Edit inputs</button>
                <button className={styles.secondaryButton} type="button" onClick={() => { setInput(initialInput); setResult(null); setGeneratedAt(null); setStepIndex(0); }}>New estimate</button>
              </div>
            </div>

            <div className={styles.metricHero}>
              <p>Estimated annual gross accommodation revenue</p>
              <strong>{money(result.annualGross.low)} - {money(result.annualGross.high)}</strong>
              <span>{money(result.annualGross.midpoint)} midpoint</span>
            </div>

            <div className={styles.metricsGrid}>
              <article>
                <span>Owner net after {result.inputs.managementRate}% management</span>
                <strong>{money(result.ownerNet.low)} - {money(result.ownerNet.high)}</strong>
                <p>Before operating expenses, taxes, insurance, repairs, debt service, and income tax effects.</p>
              </article>
              <article>
                <span>Blended ADR</span>
                <strong>{money(result.blendedAdr.low)} - {money(result.blendedAdr.high)}</strong>
                <p>Weighted across peak, shoulder, and winter demand.</p>
              </article>
              <article>
                <span>Paid occupancy</span>
                <strong>{percent(result.occupancy.low)} - {percent(result.occupancy.high)}</strong>
                <p>Availability is not treated as realized occupancy.</p>
              </article>
              <article>
                <span>Booked nights</span>
                <strong>{number(result.bookedNights.low)} - {number(result.bookedNights.high)}</strong>
                <p>After removing owner-use weeks from rentable supply.</p>
              </article>
            </div>

            <div className={styles.reportColumns}>
              <section className={styles.reportBlock} aria-labelledby="season-title">
                <h3 id="season-title">Seasonal mix</h3>
                {result.seasonalBreakdown.map((season) => (
                  <div key={season.key} className={styles.seasonRow}>
                    <div>
                      <strong>{season.label}</strong>
                      <span>{money(season.revenue)} / {season.share}%</span>
                    </div>
                    <div className={styles.barTrack}><span style={{ width: `${season.share}%` }} /></div>
                    <p>{season.note}</p>
                  </div>
                ))}
              </section>

              <section className={styles.reportBlock} aria-labelledby="drivers-title">
                <h3 id="drivers-title">Top value drivers</h3>
                {result.valueDrivers.map((driver) => (
                  <article key={driver.label} className={styles.noteCard}>
                    <span>{driver.impact}</span>
                    <strong>{driver.label}</strong>
                    <p>{driver.detail}</p>
                  </article>
                ))}
              </section>
            </div>

            <div className={styles.reportColumns}>
              <section className={styles.reportBlock} aria-labelledby="opportunity-title">
                <h3 id="opportunity-title">Practical opportunities</h3>
                {result.opportunities.map((item) => (
                  <article key={item.title} className={styles.noteCard}>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </article>
                ))}
              </section>
              <section className={styles.reportBlock} aria-labelledby="caveat-title">
                <h3 id="caveat-title">Honesty and caveats</h3>
                {result.caveats.map((caveat) => (
                  <article key={caveat.title} className={styles.noteCard}>
                    <strong>{caveat.title}</strong>
                    <p>{caveat.body}</p>
                  </article>
                ))}
              </section>
            </div>

            <section className={styles.methodology} aria-labelledby="methodology-title">
              <h3 id="methodology-title">Methodology</h3>
              <ul>
                {result.methodology.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>

            <div className={styles.reportFooter}>
              <button className={styles.primaryButton} type="button" onClick={copySummary}>Copy summary/link</button>
              <a className={styles.secondaryButton} href={mailto}>Email this estimate</a>
              <button className={styles.secondaryButton} type="button" onClick={() => window.print()}>Print / Save PDF</button>
            </div>
          </section>
        )}
        <p className={styles.liveRegion} aria-live="polite">{status}</p>
      </main>
    </div>
  );
}
