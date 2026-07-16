import type { TaskPriority, TaskWorkCategory } from "@/lib/db/schema";

export type WorkTaskTypeOption = {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  isActive: boolean;
  isSystem: boolean;
};

export type WorkStatusOption = {
  id: string;
  name: string;
  slug: string;
  color: string;
  isCompleted: boolean;
};

export type WorkCourseOption = {
  id: string;
  name: string;
  code: string;
};

export type WorkOrganizationOption = {
  id: string;
  name: string;
};

export type WorkParentTaskOption = {
  id: string;
  title: string;
};

export type WorkFilterOptions = {
  taskTypes: WorkTaskTypeOption[];
  statuses: WorkStatusOption[];
  courses: WorkCourseOption[];
  organizations: WorkOrganizationOption[];
  parentTasks: WorkParentTaskOption[];
};

export type WorkTaskItem = {
  id: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  priority: TaskPriority;
  workCategory: TaskWorkCategory;
  startDate: string | null;
  dueDate: string | null;
  dueTime: string | null;
  timezone: string;
  archivedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  taskType: WorkTaskTypeOption;
  status: WorkStatusOption;
  course: WorkCourseOption | null;
  organization: WorkOrganizationOption | null;
  directSubtaskCount: number;
  completedSubtaskCount: number;
};

export type WorkTaskTypeTab = WorkTaskTypeOption & {
  taskCount: number;
};

export type WorkPageData = {
  tasks: WorkTaskItem[];
  taskTypes: WorkTaskTypeTab[];
  options: WorkFilterOptions;
  totalCount: number;
  totalPages: number;
  databaseAvailable: boolean;
};
