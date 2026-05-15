import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0">
              {children}
            </main>
          </div>
          <MobileNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
