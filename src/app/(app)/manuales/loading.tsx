import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Skeleton className="h-6 w-40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
