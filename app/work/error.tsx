"use client";

import { useEffect } from "react";
import { RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function WorkError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Work page failed to render.", error);
  }, [error]);

  return (
    <section className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border p-6 text-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Work could not be loaded</h1>
        <p className="text-sm text-muted-foreground">
          Check the database connection, then try loading the page again.
        </p>
      </div>
      <Button type="button" variant="outline" onClick={unstable_retry}>
        <RotateCcwIcon data-icon="inline-start" />
        Try again
      </Button>
    </section>
  );
}

