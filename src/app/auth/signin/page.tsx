"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2, FolderKanban, CalendarDays, RefreshCw } from "lucide-react";

const FEATURES = [
  { icon: CheckCircle2, label: "Priority-based task management" },
  { icon: FolderKanban, label: "Project tracking & history" },
  { icon: CalendarDays, label: "Timeline & scheduling" },
  { icon: RefreshCw, label: "Cross-device sync" },
];

function SignInContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 -right-20 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute top-1/4 left-1/3 h-48 w-48 rounded-full bg-white/3" />

        <div className="relative z-10 flex flex-col justify-center p-16 xl:p-20 text-white">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Zap className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Work Tracker</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
            Stay organized,<br />stay productive.
          </h1>
          <p className="text-indigo-200 text-lg mb-10 max-w-md leading-relaxed">
            Manage tasks, track projects, and plan your week — all in one place.
            Your work syncs across every device.
          </p>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-indigo-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right sign-in panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background p-6 relative">
        {/* Subtle background gradient for mobile */}
        <div className="absolute inset-0 lg:hidden bg-gradient-to-b from-indigo-50/50 to-background dark:from-indigo-950/20 pointer-events-none" />

        <div className="relative z-10 w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Work Tracker</h1>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Sign in to access your workspace
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive text-center">
                {error === "AccessDenied"
                  ? "Access denied. This account is not authorised."
                  : "Something went wrong. Please try again."}
              </div>
            )}

            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-border bg-card hover:bg-accent text-foreground font-medium text-sm transition-all hover:shadow-sm active:scale-[0.98] px-4"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Your data is encrypted and syncs securely across all your devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
