import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/app-shell";
import { DataLoader } from "@/components/data-loader";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Work Tracker — Smart Task Manager",
  description: "A modern, smart work tracker with projects, timeline, and priority management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange={false}
          >
            <DataLoader />
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
