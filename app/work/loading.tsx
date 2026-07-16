import { Skeleton } from "@/components/ui/skeleton";

export default function WorkLoading() {
  return (
    <section className="flex flex-col gap-4" aria-label="Loading work">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-80 max-w-[70vw]" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-80 w-full" />
    </section>
  );
}

