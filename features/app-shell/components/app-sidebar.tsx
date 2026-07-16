"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  BookOpenIcon,
  BriefcaseBusinessIcon,
  ChevronRightIcon,
  ContactRoundIcon,
  GraduationCapIcon,
  KeyRoundIcon,
  LayersIcon,
  LayoutDashboardIcon,
  UniversityIcon,
} from "lucide-react";

import type { CanvasCourseNavigationItem } from "@/features/courses/server/course-data";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CourseCheckboxList } from "@/features/courses/components/course-picker";
import { APP_NAME } from "@/lib/branding";

const mainNavigation = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Contacts",
    url: "/contacts",
    icon: ContactRoundIcon,
  },
  {
    title: "Accounts",
    url: "/accounts",
    icon: KeyRoundIcon,
  },
  {
    title: "Work",
    url: "/work",
    icon: BriefcaseBusinessIcon,
  },
];
const ACTIVE_COURSE_SECTION_BADGE_LIMIT = 4;

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  courses?: CanvasCourseNavigationItem[];
};

export function AppSidebar({ courses = [], ...props }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GraduationCapIcon />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold">{APP_NAME}</span>
                  <span className="truncate text-xs">Student Workspace</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Dialog>
                  <DialogTrigger asChild>
                    <SidebarMenuButton
                      type="button"
                      variant="outline"
                      tooltip="Fetch from Canvas"
                    >
                      <ArrowDownToLine />
                      <span>Fetch from Canvas</span>
                    </SidebarMenuButton>
                  </DialogTrigger>

                  <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Fetch from Canvas</DialogTitle>
                      <DialogDescription>
                        Sync your Canvas course data into {APP_NAME}.
                      </DialogDescription>
                    </DialogHeader>
                    <CourseCheckboxList />
                  </DialogContent>
                </Dialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isNavigationPathActive(pathname, item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <UniversityNavigation courses={courses} pathname={pathname} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm">
              <Link href="/dashboard">
                <GraduationCapIcon />
                <span>Active Term</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

type UniversityNavigationProps = {
  courses: CanvasCourseNavigationItem[];
  pathname: string;
};

function UniversityNavigation({
  courses,
  pathname,
}: UniversityNavigationProps) {
  const isCourseRoute = isNavigationPathActive(pathname, "/courses");
  const activeCourse = courses.find((course) =>
    isActiveCoursePath(pathname, course),
  );

  return (
    <Collapsible asChild defaultOpen={isCourseRoute}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={isCourseRoute}
            tooltip="University"
          >
            <UniversityIcon />
            <span>University</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleTrigger asChild>
          <SidebarMenuAction className="data-[state=open]:rotate-90">
            <ChevronRightIcon />
            <span className="sr-only">Toggle university</span>
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <Collapsible asChild defaultOpen={isCourseRoute}>
              <SidebarMenuSubItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isCourseRoute}
                    className="group w-full pr-1"
                  >
                    <button type="button">
                      <BookOpenIcon />
                      <span>Courses</span>
                      <ChevronRightIcon className="ml-auto transition-transform group-data-[state=open]:rotate-90" />
                    </button>
                  </SidebarMenuSubButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {courses.length > 0 ? (
                      courses.map((course) => (
                        <CachedCourseNavigationItem
                          key={course.canvasId}
                          course={course}
                          isActive={
                            activeCourse?.canvasId === course.canvasId
                          }
                        />
                      ))
                    ) : (
                      <EmptyCourseNavigationItem />
                    )}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuSubItem>
            </Collapsible>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function CachedCourseNavigationItem({
  course,
  isActive,
}: {
  course: CanvasCourseNavigationItem;
  isActive: boolean;
}) {
  const availableSections = course.sections.filter(
    (section) => section.key !== "overview" && section.available,
  );

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        asChild
        isActive={isActive}
        className="h-auto min-h-7 py-1.5"
      >
        <Link href={course.href}>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className={cn("truncate", isActive && "font-medium")}>
              {course.label}
            </span>
            {course.secondaryLabel ? (
              <span className="truncate text-xs text-muted-foreground">
                {course.secondaryLabel}
              </span>
            ) : null}
          </span>
        </Link>
      </SidebarMenuSubButton>
      <SidebarMenuBadge>{course.availableSectionCount}</SidebarMenuBadge>
      {isActive ? (
        <div className="flex flex-wrap gap-1 px-2 pb-1">
          {availableSections.length > 0 ? (
            availableSections
              .slice(0, ACTIVE_COURSE_SECTION_BADGE_LIMIT)
              .map((section) => (
                <Badge
                  key={section.key}
                  variant="outline"
                  className="h-5 px-1.5 text-[10px]"
                >
                  {section.label}
                </Badge>
              ))
          ) : (
            <span className="text-xs text-muted-foreground">
              No cached item groups
            </span>
          )}
        </div>
      ) : null}
    </SidebarMenuSubItem>
  );
}

function EmptyCourseNavigationItem() {
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        aria-disabled="true"
        className="h-auto min-h-14 cursor-default py-2"
      >
        <LayersIcon />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate">No cached courses</span>
          <span className="truncate text-xs text-muted-foreground">
            Click to fetch from Canvas
          </span>
        </span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function isNavigationPathActive(pathname: string, navigationPath: string) {
  return (
    pathname === navigationPath || pathname.startsWith(`${navigationPath}/`)
  );
}

function isActiveCoursePath(
  pathname: string,
  course: CanvasCourseNavigationItem,
) {
  if (pathname === course.href) {
    return true;
  }

  try {
    return decodeURIComponent(pathname) === `/courses/${course.canvasId}`;
  } catch {
    return false;
  }
}
