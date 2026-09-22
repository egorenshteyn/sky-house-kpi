"use client";

import ChartData from "./ChartData";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Series = { year: number; data: number[]; color: string };

export default function RevenueBarChart({ series }: { series: Series[] }) {
  const data = {
    labels: MONTHS,
    datasets: series.map((s) => ({
      label: String(s.year),
      data: s.data,
      backgroundColor: s.color,
      borderRadius: 3,
    })),
  };

  const options = {
    responsive: true,
    interaction: { mode: "index" as const, intersect: false },
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6, color: "#525252" }, grid: { display: false }, border: { display: false } },
      y: {
        grid: { color: "#f4f4f4" },
        border: { display: false },
        ticks: {
          callback: (v: any) => "$" + v / 1000 + "K",
        },
      },
    },
  };

  return <><div className="chart-frame"><Bar role="img" aria-label="Monthly revenue comparison. Values available in the table below." data={data} options={options} /></div><ChartData series={series} unit="currency" /></>;
}
