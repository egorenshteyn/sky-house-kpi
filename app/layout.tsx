import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import AddContextFab from "@/components/AddContextFab";
import { Providers } from "./providers";
import LayoutShell from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "Sky House — KPI Tracker",
  description: "Sky House Dillon Beach KPI tracker, dashboard, and CRM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-gray-900">
        <Providers>
          <Header />
          <LayoutShell>{children}</LayoutShell>
          <AddContextFab />
        </Providers>
      </body>
    </html>
  );
}
