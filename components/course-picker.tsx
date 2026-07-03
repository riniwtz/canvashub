"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DownloadIcon, LoaderCircleIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CoursePickerCourse } from "@/lib/canvas-course-discovery-utils";

type CoursePickerResponse = {
  courses: CoursePickerCourse[];
  source: "cache" | "canvas" | "stale-cache";
  lastSyncedAt: string | null;
  cacheExpiresAt: string | null;
  warning: string | null;
};

type CoursePickerErrorResponse = {
  error?: string;
  warning?: string;
};

type LoadState = "idle" | "loading" | "success" | "error";
type CourseCheckedState = boolean | "indeterminate";

const LOAD_COURSES_DELAY_MS = 0;
const COURSE_LIST_SKELETON_COUNT = 6;
const createdAtFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function CourseCheckboxList() {
  const [courses, setCourses] = useState<CoursePickerCourse[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadCourses = useCallback(async () => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoadState("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/canvas/courses/available", {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => null)) as
        | (Partial<CoursePickerResponse> & CoursePickerErrorResponse)
        | null;

      if (!response.ok) {
        throw new Error(data?.warning ?? getErrorMessage(data));
      }

      const nextCourses = Array.isArray(data?.courses) ? data.courses : [];
      const nextCourseIds = new Set(nextCourses.map((course) => course.id));

      setCourses(nextCourses);
      setSelectedIds((current) =>
        current.filter((courseId) => nextCourseIds.has(courseId)),
      );
      setLoadState("success");
      setMessage(data?.warning ?? getSuccessMessage(data, nextCourses.length));
    } catch (error) {
      if (controller.signal.aborted) {
        if (abortControllerRef.current === controller) {
          setLoadState("idle");
        }

        return;
      }

      setLoadState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Courses could not be loaded right now.",
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  const cancelLoad = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoadState((current) =>
      current === "loading" ? (courses.length ? "success" : "idle") : current,
    );
  }, [courses.length]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadCourses();
    }, LOAD_COURSES_DELAY_MS);

    return () => {
      window.clearTimeout(loadTimer);
      abortControllerRef.current?.abort();
    };
  }, [loadCourses]);

  function selectCourse(courseId: string) {
    setSelectedIds((current) =>
      Array.from(new Set([...current, courseId])),
    );
  }

  function deselectCourse(courseId: string) {
    setSelectedIds((current) => current.filter((id) => id !== courseId));
  }

  function handleCourseCheckedChange(
    courseId: string,
    checked: CourseCheckedState,
  ) {
    if (checked === true) {
      selectCourse(courseId);
      return;
    }

    deselectCourse(courseId);
  }

  const isLoading = loadState === "loading";
  const isError = loadState === "error";
  const isFetchDisabled = isLoading || isError;
  const statusMessage = isLoading ? null : message;

  return (
    <div className="flex max-h-[calc(100dvh-11rem)] w-full min-w-0 flex-col gap-3 overflow-hidden rounded-md border p-4">
      <div className="flex flex-col gap-2">
        {isLoading ? (
          <CoursePickerSummarySkeleton />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">
              Selected: {selectedIds.length}
            </div>
            <div className="shrink-0 text-xs text-muted-foreground">
              {formatCourseCount(courses.length)} available
            </div>
          </div>
        )}
        {isLoading ? (
          <Skeleton className="h-11 w-full" />
        ) : statusMessage ? (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-sm leading-relaxed break-words",
              isError
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "bg-muted/40 text-muted-foreground",
            )}
            role={isError ? "alert" : "status"}
          >
            {statusMessage}
          </div>
        ) : null}
      </div>

      <ScrollArea className="h-[min(22rem,calc(100dvh-18rem))] min-h-0 w-full overflow-hidden pr-3">
        <div className="flex w-full min-w-0 flex-col gap-2">
          {isLoading && !courses.length ? (
            <CourseListSkeleton />
          ) : courses.length ? (
            courses.map((course) => {
              const isSelected = selectedIds.includes(course.id);
              const primaryLabel = course.courseCode ?? course.label;
              const createdAtLabel = formatCreatedAt(course.createdAt);

              return (
                <Label
                  key={course.id}
                  htmlFor={`course-${course.id}`}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm font-normal transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isSelected
                      ? "border-border bg-accent text-accent-foreground"
                      : "border-transparent",
                  )}
                >
                  <Checkbox
                    id={`course-${course.id}`}
                    checked={isSelected}
                    disabled={isLoading}
                    onCheckedChange={(checked) =>
                      handleCourseCheckedChange(course.id, checked)
                    }
                  />

                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <StatusIndicator state={course.enrollmentState} />
                      <span className="min-w-0 truncate font-medium">
                        {primaryLabel}
                      </span>
                    </span>
                    {course.secondaryLabel ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {course.secondaryLabel}
                      </span>
                    ) : null}
                    {createdAtLabel ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {createdAtLabel}
                      </span>
                    ) : null}
                  </span>
                </Label>
              );
            })
          ) : (
            <div className="flex min-h-60 w-full items-center justify-center rounded-md border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
              No courses are available to select.
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-end gap-2 border-t pt-3">
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={cancelLoad}>
            <XIcon data-icon="inline-start" />
            Cancel
          </Button>
        </DialogClose>
        <Button type="button" onClick={loadCourses} disabled={isFetchDisabled}>
          {isLoading ? (
            <LoaderCircleIcon
              data-icon="inline-start"
              className="animate-spin"
            />
          ) : (
            <DownloadIcon data-icon="inline-start" />
          )}
          {isLoading ? "Fetching" : "Fetch"}
        </Button>
      </div>
    </div>
  );
}

function CourseListSkeleton() {
  return Array.from({ length: COURSE_LIST_SKELETON_COUNT }).map((_, index) => (
    <div
      key={index}
      className="flex min-h-12 items-center gap-3 rounded-md border border-transparent px-3 py-2"
    >
      <Skeleton className="size-4" />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-44" />
      </span>
    </div>
  ));
}

function CoursePickerSummarySkeleton() {
  return (
    <div className="flex items-center justify-between gap-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

function StatusIndicator({
  state,
}: {
  state: CoursePickerCourse["enrollmentState"];
}) {
  return (
    <span
      aria-label={state === "active" ? "Active course" : "Completed course"}
      className={cn(
        "size-2.5 shrink-0 rounded-full",
        state === "active"
          ? "bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/20"
          : "bg-muted-foreground shadow-[0_0_0_3px] shadow-muted-foreground/20",
      )}
    />
  );
}

function getErrorMessage(
  data: (Partial<CoursePickerResponse> & CoursePickerErrorResponse) | null,
) {
  if (typeof data?.error === "string") {
    return data.error;
  }

  return "Courses could not be loaded right now.";
}

function getSuccessMessage(
  data: Partial<CoursePickerResponse> | null,
  courseCount: number,
) {
  if (!data?.source) {
    return `${formatCourseCount(courseCount)} loaded.`;
  }

  return data.source === "cache"
    ? `Showing ${formatCourseCount(courseCount)} saved in StudentHub.`
    : `Fetched ${formatCourseCount(courseCount)} from Canvas.`;
}

function formatCourseCount(courseCount: number) {
  return `${courseCount} ${courseCount === 1 ? "course" : "courses"}`;
}

function formatCreatedAt(createdAt: string | null) {
  if (!createdAt) {
    return null;
  }

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `Created ${createdAtFormatter.format(date)}`;
}
