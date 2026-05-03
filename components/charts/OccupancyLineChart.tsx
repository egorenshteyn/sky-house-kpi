"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Series = {
  year: number;
  data: number[];
  color: string;
  filled?: boolean;
  dashed?: boolean;
};

export default function OccupancyLineChart({ series }: { series: Series[] }) {
  const data = {
    labels: MONTHS,
    datasets: series.map((s) => ({
      label: String(s.year),
      data: s.data,
      borderColor: s.color,
      backgroundColor: s.filled ? "rgba(15,98,254,0.04)" : "transparent",
      fill: s.filled || false,
      tension: 0,
      borderWidth: s.filled ? 2 : 1.5,
      pointRadius: s.filled ? 3 : 2,
      pointBackgroundColor: s.color,
      pointBorderColor: s.filled ? "#fff" : s.color,
      pointBorderWidth: s.filled ? 1.5 : 0,
      borderDash: s.dashed ? [4, 4] : [],
    })),
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: {
        grid: { color: "#f4f4f4" },
        border: { display: false },
        ticks: { callback: (v: any) => v + "%" },
        max: 100,
      },
    },
  };
  return <Line data={data} options={options} />;
}
