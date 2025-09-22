import { cn } from "@/lib/utils";

interface SkeletonRowProps {
  lines?: number;
  className?: string;
  "data-testid"?: string;
}

export function SkeletonRow({ 
  lines = 3, 
  className,
  "data-testid": testId 
}: SkeletonRowProps) {
  return (
    <div className={cn("space-y-3", className)} data-testid={testId}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-3 w-3/4 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("surface p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="skeleton h-5 w-24 rounded" />
        <div className="skeleton h-8 w-8 rounded-full" />
      </div>
      <div className="skeleton h-8 w-16 rounded mb-2" />
      <div className="skeleton h-3 w-20 rounded" />
    </div>
  );
}