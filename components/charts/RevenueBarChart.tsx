"use client";

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
      x: { grid: { display: false }, border: { display: false } },
      y: {
        grid: { color: "#f4f4f4" },
        border: { display: false },
        ticks: {
          callback: (v: any) => "$" + v / 1000 + "K",
        },
      },
    },
  };

  return <Bar data={data} options={options} />;
}
