import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-white/[0.06]",
        className
      )}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-surface border border-white/[0.04] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3.5 w-3.5 rounded" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-2.5 w-24" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={cn("h-4", i === 0 ? "w-32" : "w-16")} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonLeadCard() {
  return (
    <div className="bg-surface border border-white/[0.04] rounded-xl p-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-md" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}
