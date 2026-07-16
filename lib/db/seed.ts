import "dotenv/config";

import { asc, sql } from "drizzle-orm";

import { closeDb, getDb } from "@/lib/db";
import {
  canvasCourses,
  taskStatuses,
  tasks,
  taskTypes,
  workOrganizations,
  workUsers,
  type NewTask,
} from "@/lib/db/schema";
import {
  DEFAULT_WORK_TIMEZONE,
  LOCAL_WORK_USER_ID,
} from "@/features/work/constants";

const STATUS_IDS = {
  backlog: "00000000-0000-4000-8000-000000000010",
  todo: "00000000-0000-4000-8000-000000000011",
  inProgress: "00000000-0000-4000-8000-000000000012",
  blocked: "00000000-0000-4000-8000-000000000013",
  done: "00000000-0000-4000-8000-000000000014",
} as const;

const TYPE_IDS = {
  project: "00000000-0000-4000-8000-000000000020",
  assignment: "00000000-0000-4000-8000-000000000021",
  exam: "00000000-0000-4000-8000-000000000022",
  meeting: "00000000-0000-4000-8000-000000000023",
  studySession: "00000000-0000-4000-8000-000000000024",
  organizationTask: "00000000-0000-4000-8000-000000000025",
  personalTask: "00000000-0000-4000-8000-000000000026",
  developmentTask: "00000000-0000-4000-8000-000000000027",
} as const;

const ORGANIZATION_ID = "00000000-0000-4000-8000-000000000030";

const TASK_IDS = {
  faithProject: "00000000-0000-4000-8000-000000000040",
  exam: "00000000-0000-4000-8000-000000000041",
  meeting: "00000000-0000-4000-8000-000000000042",
  study: "00000000-0000-4000-8000-000000000043",
  animation: "00000000-0000-4000-8000-000000000044",
  storyboard: "00000000-0000-4000-8000-000000000045",
  render: "00000000-0000-4000-8000-000000000046",
} as const;

async function seed() {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is required to seed Work data.");
  }

  await db.transaction(async (transaction) => {
    await transaction
      .insert(workUsers)
      .values({
        id: LOCAL_WORK_USER_ID,
        name: "StudentHub User",
        email: "student@localhost",
        timezone: DEFAULT_WORK_TIMEZONE,
      })
      .onConflictDoUpdate({
        target: workUsers.id,
        set: {
          name: "StudentHub User",
          timezone: DEFAULT_WORK_TIMEZONE,
          updatedAt: new Date(),
        },
      });

    await transaction
      .insert(taskStatuses)
      .values([
        createStatus({
          id: STATUS_IDS.backlog,
          name: "Backlog",
          slug: "backlog",
          color: "#737373",
          sortOrder: 10,
        }),
        createStatus({
          id: STATUS_IDS.todo,
          name: "To Do",
          slug: "to-do",
          color: "#525252",
          sortOrder: 20,
        }),
        createStatus({
          id: STATUS_IDS.inProgress,
          name: "In Progress",
          slug: "in-progress",
          color: "#2563eb",
          sortOrder: 30,
        }),
        createStatus({
          id: STATUS_IDS.blocked,
          name: "Blocked",
          slug: "blocked",
          color: "#dc2626",
          sortOrder: 40,
        }),
        {
          ...createStatus({
            id: STATUS_IDS.done,
            name: "Done",
            slug: "done",
            color: "#16a34a",
            sortOrder: 50,
          }),
          isCompleted: true,
        },
      ])
      .onConflictDoUpdate({
        target: taskStatuses.id,
        set: { color: sql`excluded.color` },
      });

    await transaction
      .insert(taskTypes)
      .values([
        createTaskType({
          id: TYPE_IDS.project,
          name: "Project",
          slug: "project",
          icon: "folder-kanban",
          color: "#7c3aed",
          sortOrder: 10,
        }),
        createTaskType({
          id: TYPE_IDS.assignment,
          name: "Assignment",
          slug: "assignment",
          icon: "notebook-pen",
          color: "#2563eb",
          sortOrder: 20,
        }),
        createTaskType({
          id: TYPE_IDS.exam,
          name: "Exam",
          slug: "exam",
          icon: "file-check",
          color: "#dc2626",
          sortOrder: 30,
        }),
        createTaskType({
          id: TYPE_IDS.meeting,
          name: "Meeting",
          slug: "meeting",
          icon: "users",
          color: "#0891b2",
          sortOrder: 40,
        }),
        createTaskType({
          id: TYPE_IDS.studySession,
          name: "Study Session",
          slug: "study-session",
          icon: "book-open",
          color: "#059669",
          sortOrder: 50,
        }),
        createTaskType({
          id: TYPE_IDS.organizationTask,
          name: "Organization Task",
          slug: "organization-task",
          icon: "building-2",
          color: "#d97706",
          sortOrder: 60,
        }),
        createTaskType({
          id: TYPE_IDS.personalTask,
          name: "Personal Task",
          slug: "personal-task",
          icon: "circle-user-round",
          color: "#db2777",
          sortOrder: 70,
        }),
        createTaskType({
          id: TYPE_IDS.developmentTask,
          name: "Development Task",
          slug: "development-task",
          icon: "code-2",
          color: "#4f46e5",
          sortOrder: 80,
        }),
      ])
      .onConflictDoUpdate({
        target: taskTypes.id,
        set: { color: sql`excluded.color` },
      });

    await transaction
      .insert(workOrganizations)
      .values({
        id: ORGANIZATION_ID,
        ownerUserId: LOCAL_WORK_USER_ID,
        name: "LAmbs",
        normalizedName: "lambs",
        description: "Student organization work",
      })
      .onConflictDoNothing();

    const courses = await transaction
      .select({
        id: canvasCourses.id,
        code: canvasCourses.courseCode,
      })
      .from(canvasCourses)
      .orderBy(asc(canvasCourses.courseCode));
    const coursesByCode = new Map(
      courses
        .filter((course) => course.code)
        .map((course) => [course.code!.trim().toLocaleUpperCase("en"), course.id]),
    );
    const rootTasks = createRootSampleTasks(coursesByCode);

    await transaction
      .insert(tasks)
      .values(rootTasks)
      .onConflictDoNothing({ target: tasks.id });

    await transaction
      .insert(tasks)
      .values(createSubtaskSamples())
      .onConflictDoNothing({ target: tasks.id });
  });
}

interface StatusSeed {
  id: string;
  name: string;
  slug: string;
  color: string;
  sortOrder: number;
}

function createStatus(status: StatusSeed) {
  return {
    ...status,
    ownerUserId: LOCAL_WORK_USER_ID,
  };
}

interface TaskTypeSeed {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  sortOrder: number;
}

function createTaskType(taskType: TaskTypeSeed) {
  return {
    ...taskType,
    ownerUserId: LOCAL_WORK_USER_ID,
    normalizedName: taskType.name.toLocaleLowerCase("en"),
    isSystem: true,
  };
}

function createRootSampleTasks(coursesByCode: Map<string, string>): NewTask[] {
  const taskRows: NewTask[] = [
    createSampleTask({
      id: TASK_IDS.animation,
      taskTypeId: TYPE_IDS.project,
      statusId: STATUS_IDS.inProgress,
      title: "Animation Project",
      workCategory: "organization",
      organizationId: ORGANIZATION_ID,
      dueDate: "2026-07-14",
    }),
  ];
  const lcfaithCourseId = coursesByCode.get("LCFAITH");
  const csnetwkCourseId = coursesByCode.get("CSNETWK");
  const sthciuxCourseId = coursesByCode.get("STHCIUX");

  if (lcfaithCourseId) {
    taskRows.push(
      createSampleTask({
        id: TASK_IDS.faithProject,
        taskTypeId: TYPE_IDS.project,
        statusId: STATUS_IDS.inProgress,
        title: "Faith Engagement Project",
        workCategory: "academic",
        courseId: lcfaithCourseId,
      }),
    );
  }

  if (csnetwkCourseId) {
    taskRows.push(
      createSampleTask({
        id: TASK_IDS.exam,
        taskTypeId: TYPE_IDS.exam,
        statusId: STATUS_IDS.done,
        title: "Exam",
        workCategory: "academic",
        courseId: csnetwkCourseId,
        dueDate: "2026-07-18",
        completedAt: new Date("2026-07-13T09:00:00+08:00"),
      }),
      createSampleTask({
        id: TASK_IDS.study,
        taskTypeId: TYPE_IDS.studySession,
        statusId: STATUS_IDS.inProgress,
        title: "Study for Exam",
        workCategory: "academic",
        courseId: csnetwkCourseId,
        dueDate: "2026-07-15",
        dueTime: "10:00:00",
        dueAt: new Date("2026-07-15T10:00:00+08:00"),
      }),
    );
  }

  if (sthciuxCourseId) {
    taskRows.push(
      createSampleTask({
        id: TASK_IDS.meeting,
        taskTypeId: TYPE_IDS.meeting,
        statusId: STATUS_IDS.inProgress,
        title: "Meeting",
        workCategory: "academic",
        courseId: sthciuxCourseId,
        dueDate: "2026-07-14",
        dueTime: "20:30:00",
        dueAt: new Date("2026-07-14T20:30:00+08:00"),
      }),
    );
  }

  return taskRows;
}

function createSubtaskSamples(): NewTask[] {
  return [
    createSampleTask({
      id: TASK_IDS.storyboard,
      parentTaskId: TASK_IDS.animation,
      taskTypeId: TYPE_IDS.organizationTask,
      statusId: STATUS_IDS.done,
      title: "Storyboard key scenes",
      workCategory: "organization",
      organizationId: ORGANIZATION_ID,
      completedAt: new Date("2026-07-13T18:00:00+08:00"),
    }),
    createSampleTask({
      id: TASK_IDS.render,
      parentTaskId: TASK_IDS.animation,
      taskTypeId: TYPE_IDS.organizationTask,
      statusId: STATUS_IDS.inProgress,
      title: "Render final sequence",
      workCategory: "organization",
      organizationId: ORGANIZATION_ID,
    }),
  ];
}

function createSampleTask(
  input: Pick<
    NewTask,
    | "id"
    | "taskTypeId"
    | "statusId"
    | "title"
    | "workCategory"
  > &
    Partial<
      Pick<
        NewTask,
        | "completedAt"
        | "courseId"
        | "dueAt"
        | "dueDate"
        | "dueTime"
        | "organizationId"
        | "parentTaskId"
      >
    >,
): NewTask {
  return {
    ...input,
    ownerUserId: LOCAL_WORK_USER_ID,
    priority: "medium",
    timezone: DEFAULT_WORK_TIMEZONE,
    requestKey: input.id,
    createdBy: LOCAL_WORK_USER_ID,
    updatedBy: LOCAL_WORK_USER_ID,
  };
}

seed()
  .then(() => {
    console.info("Work seed data is ready.");
  })
  .catch((error) => {
    console.error("Unable to seed Work data.", error);
    process.exitCode = 1;
  })
  .finally(closeDb);
