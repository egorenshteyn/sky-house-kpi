"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney, formatPct } from "@/lib/format";

const STORAGE_KEY = "skyhouse:financials:scenario";

type Defaults = {
  propertyValue: number;
  annualRevenue: number;
  annualOpex: number;
};

type Scenario = Defaults;

export default function ScenarioPanel({ defaults }: { defaults: Defaults }) {
  const [scenario, setScenario] = useState<Scenario>(defaults);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setScenario({
          propertyValue: Number(parsed.propertyValue) || defaults.propertyValue,
          annualRevenue: Number(parsed.annualRevenue) || defaults.annualRevenue,
          annualOpex: Number(parsed.annualOpex) || defaults.annualOpex,
        });
      }
    } catch {}
    setHydrated(true);
  }, [defaults.propertyValue, defaults.annualRevenue, defaults.annualOpex]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scenario));
    } catch {}
  }, [scenario, hydrated]);

  const { noi, capRate, grossYield } = useMemo(() => {
    const noiVal = scenario.annualRevenue - scenario.annualOpex;
    const cap =
      scenario.propertyValue > 0 ? (noiVal / scenario.propertyValue) * 100 : 0;
    const yld =
      scenario.propertyValue > 0
        ? (scenario.annualRevenue / scenario.propertyValue) * 100
        : 0;
    return { noi: noiVal, capRate: cap, grossYield: yld };
  }, [scenario]);

  function update<K extends keyof Scenario>(key: K, raw: string) {
    const n = raw === "" ? 0 : Number(raw);
    setScenario((s) => ({ ...s, [key]: Number.isFinite(n) ? n : 0 }));
  }

  function reset() {
    setScenario(defaults);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  const isCustom =
    scenario.propertyValue !== defaults.propertyValue ||
    scenario.annualRevenue !== defaults.annualRevenue ||
    scenario.annualOpex !== defaults.annualOpex;

  return (
    <div className="data-card rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#161616]">Scenario inputs</h3>
        {isCustom && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-[#0f62fe] hover:text-[#0353e9]"
          >
            Reset to defaults
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Adjust property value, annual revenue, or OpEx to recompute NOI, cap rate,
        and gross yield. Values persist locally in this browser.
      </p>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Property asset value">
          <input
            type="number"
            value={scenario.propertyValue}
            onChange={(e) => update("propertyValue", e.target.value)}
            className="input-base font-mono"
            min={0}
            step={10000}
          />
        </Field>
        <Field label="Annual revenue">
          <input
            type="number"
            value={scenario.annualRevenue}
            onChange={(e) => update("annualRevenue", e.target.value)}
            className="input-base font-mono"
            min={0}
            step={1000}
          />
        </Field>
        <Field label="Annual OpEx">
          <input
            type="number"
            value={scenario.annualOpex}
            onChange={(e) => update("annualOpex", e.target.value)}
            className="input-base font-mono"
            min={0}
            step={1000}
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-5">
        <DerivedStat
          label="Net Operating Income"
          value={formatMoney(noi, { compact: true })}
          sub="Revenue − OpEx"
        />
        <DerivedStat
          label="Cap Rate"
          value={formatPct(capRate)}
          sub="NOI ÷ property value"
        />
        <DerivedStat
          label="Gross Yield"
          value={formatPct(grossYield)}
          sub="Revenue ÷ property value"
        />
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function DerivedStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-md bg-gray-50 px-4 py-3">
      <div className="text-xs text-gray-400 font-medium mb-1">{label}</div>
      <div className="text-lg font-bold font-mono text-[#161616]">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5 font-mono">{sub}</div>}
    </div>
  );
}
