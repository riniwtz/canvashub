"use client";

import { usePathname } from "next/navigation";

import { APP_NAME } from "@/lib/branding";

const routeLabels = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/contacts", label: "Contacts" },
  { path: "/accounts", label: "Accounts" },
  { path: "/work", label: "Work" },
  { path: "/courses", label: "University / Courses" },
] as const;

export function AppHeader() {
  const pathname = usePathname();

  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm font-medium">{APP_NAME}</span>
      <span className="truncate text-xs text-muted-foreground">
        {getRouteLabel(pathname)}
      </span>
    </div>
  );
}

function getRouteLabel(pathname: string) {
  if (pathname === "/") {
    return "Dashboard";
  }

  return (
    routeLabels.find(({ path }) => isSameOrChildPath(pathname, path))?.label ??
    "Workspace"
  );
}

function isSameOrChildPath(pathname: string, routePath: string) {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}
