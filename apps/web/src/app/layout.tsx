import { AccountSessionBoundary } from "@/features/tenant-system/access-control/accounts";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { ApplicationProviders } from "@/core/context/providers";
import { AppShell } from "@/core/layout/app-shell";

import "@/core/ui/styles/globals.css";

const inter = localFont({
  src: "../../public/assets/Inter-VariableFont_slnt,wght.7385e8d9d3c5518f.ttf",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});
export const metadata: Metadata = {
  title: { default: "OneOps · Trang chủ", template: "%s · OneOps" },
  description: "Không gian quản lý công việc, dự án và cộng tác đội nhóm",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={inter.variable}>
      <body>
        <ApplicationProviders>
          <AccountSessionBoundary>
            <AppShell>{children}</AppShell>
          </AccountSessionBoundary>
        </ApplicationProviders>
      </body>
    </html>
  );
}
