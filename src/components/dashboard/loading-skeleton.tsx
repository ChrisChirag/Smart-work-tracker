import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome banner skeleton */}
      <Skeleton className="h-28 w-full rounded-2xl" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-10" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Task list skeleton */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded-full mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex justify-between items-center">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
