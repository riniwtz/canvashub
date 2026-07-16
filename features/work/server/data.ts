import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/lib/db";
import {
  canvasCourses,
  taskActivityLogs,
  taskStatuses,
  tasks,
  taskTypes,
  workOrganizations,
} from "@/lib/db/schema";
import {
  DEFAULT_WORK_QUERY,
  type WorkQuery,
  type WorkSortField,
} from "@/features/work/query";
import type {
  WorkCourseOption,
  WorkFilterOptions,
  WorkPageData,
  WorkStatusOption,
  WorkTaskItem,
  WorkTaskTypeTab,
} from "@/features/work/types";
import {
  createStableSlug,
  normalizeWorkName,
  taskTypeInputSchema,
  type ValidatedTaskInput,
  type ValidatedTaskStatusUpdate,
} from "@/features/work/validation";
import { NEW_TASK_TYPE_VALUE } from "@/features/work/constants";

const DIRECT_SUBTASK_LIMIT = 100;

const childTasks = alias(tasks, "child_tasks");
const childStatuses = alias(taskStatuses, "child_statuses");

type WorkDatabase = NonNullable<ReturnType<typeof getDb>>;
type WorkTransaction = Parameters<
  Parameters<WorkDatabase["transaction"]>[0]
>[0];

type WorkDataErrorCode =
  | "conflict"
  | "database_unavailable"
  | "duplicate_type"
  | "invalid_hierarchy"
  | "invalid_reference"
  | "not_found";

type TaskRowQuery = {
  db: WorkDatabase;
  ownerUserId: string;
  where: SQL | undefined;
  orderBy: SQL[];
  limit: number;
  offset: number;
};

type ReferenceValidation = {
  transaction: WorkTransaction;
  ownerUserId: string;
  input: ValidatedTaskInput;
  currentTaskTypeId?: string;
};

const WORK_SORT_COLUMNS = {
  title: tasks.title,
  dueDate: tasks.dueDate,
  status: taskStatuses.sortOrder,
  priority: sql`case ${tasks.priority}
    when 'urgent' then 4
    when 'high' then 3
    when 'medium' then 2
    else 1
  end`,
  type: taskTypes.name,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
} as const satisfies Record<WorkSortField, AnyColumn | SQL>;

export class WorkDataError extends Error {
  constructor(readonly code: WorkDataErrorCode) {
    super(code);
    this.name = "WorkDataError";
  }
}

export async function getWorkPageData(
  ownerUserId: string,
  query: WorkQuery = DEFAULT_WORK_QUERY,
): Promise<WorkPageData> {
  const db = getDb();

  if (!db) {
    return createUnavailableWorkPageData();
  }

  try {
    const where = buildWorkWhereCondition({
      db,
      ownerUserId,
      query,
      rootTasksOnly: true,
    });
    const [taskRows, countRows, tabs, options] = await Promise.all([
      selectTaskRows({
        db,
        ownerUserId,
        where,
        orderBy: buildWorkOrderBy(query),
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
      }),
      db
        .select({ value: count() })
        .from(tasks)
        .innerJoin(taskTypes, eq(tasks.taskTypeId, taskTypes.id))
        .innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
        .leftJoin(canvasCourses, eq(tasks.courseId, canvasCourses.id))
        .leftJoin(
          workOrganizations,
          eq(tasks.organizationId, workOrganizations.id),
        )
        .where(where),
      getTaskTypeTabs(db, ownerUserId),
      getWorkFilterOptions(db, ownerUserId),
    ]);
    const totalCount = Number(countRows[0]?.value ?? 0);

    return {
      tasks: taskRows,
      taskTypes: tabs,
      options,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / query.pageSize)),
      databaseAvailable: true,
    };
  } catch (error) {
    console.error("Unable to load Work page data.", error);
    return createUnavailableWorkPageData();
  }
}

export async function getTaskSubtasks(
  ownerUserId: string,
  parentTaskId: string,
): Promise<WorkTaskItem[]> {
  const db = getDb();

  if (!db) {
    throw new WorkDataError("database_unavailable");
  }

  const parentCount = await db.$count(
    tasks,
    and(
      eq(tasks.id, parentTaskId),
      eq(tasks.ownerUserId, ownerUserId),
      isNull(tasks.deletedAt),
    ),
  );

  if (!parentCount) {
    throw new WorkDataError("not_found");
  }

  return selectTaskRows({
    db,
    ownerUserId,
    where: and(
      eq(tasks.ownerUserId, ownerUserId),
      eq(tasks.parentTaskId, parentTaskId),
      isNull(tasks.deletedAt),
    ),
    orderBy: [asc(tasks.dueDate), asc(tasks.title), asc(tasks.id)],
    limit: DIRECT_SUBTASK_LIMIT,
    offset: 0,
  });
}

export async function createWorkTask(
  ownerUserId: string,
  input: ValidatedTaskInput,
): Promise<string> {
  const db = requireDatabase();
  const existingTask = await findTaskByRequestKey(db, ownerUserId, input.requestKey);

  if (existingTask) {
    return existingTask.id;
  }

  return db.transaction(async (transaction) => {
    await transaction.execute(sql`
      select pg_advisory_xact_lock(
        hashtext(${ownerUserId}),
        hashtext(${input.requestKey})
      )
    `);
    const duplicateTask = await findTaskByRequestKey(
      transaction,
      ownerUserId,
      input.requestKey,
    );

    if (duplicateTask) {
      return duplicateTask.id;
    }

    const references = await validateTaskReferences({
      transaction,
      ownerUserId,
      input,
    });
    const now = new Date();
    const [createdTask] = await transaction
      .insert(tasks)
      .values({
        ownerUserId,
        parentTaskId: input.parentTaskId ?? null,
        taskTypeId: references.taskTypeId,
        statusId: input.statusId,
        courseId: input.courseId ?? null,
        organizationId: input.organizationId ?? null,
        title: input.title,
        description: input.description ?? null,
        notes: input.notes ?? null,
        priority: input.priority,
        workCategory: input.workCategory,
        startDate: input.startDate ?? null,
        dueDate: input.deadlineMode === "none" ? null : (input.dueDate ?? null),
        dueTime: input.deadlineMode === "datetime" ? (input.dueTime ?? null) : null,
        dueAt: resolveDueAt(input),
        timezone: input.timezone,
        completedAt: references.status.isCompleted ? now : null,
        requestKey: input.requestKey,
        createdBy: ownerUserId,
        updatedBy: ownerUserId,
      })
      .returning({ id: tasks.id });

    if (!createdTask) {
      throw new WorkDataError("database_unavailable");
    }

    await transaction.insert(taskActivityLogs).values({
      ownerUserId,
      taskId: createdTask.id,
      actorUserId: ownerUserId,
      action: input.parentTaskId ? "subtask_created" : "task_created",
      details: { parentTaskId: input.parentTaskId ?? null },
    });

    return createdTask.id;
  });
}

export async function updateWorkTask(
  ownerUserId: string,
  taskId: string,
  input: ValidatedTaskInput,
): Promise<void> {
  const db = requireDatabase();

  await db.transaction(async (transaction) => {
    const [currentTask] = await transaction
      .select({
        id: tasks.id,
        taskTypeId: tasks.taskTypeId,
        completedAt: tasks.completedAt,
        version: tasks.version,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.ownerUserId, ownerUserId),
          isNull(tasks.deletedAt),
        ),
      )
      .limit(1);

    if (!currentTask) {
      throw new WorkDataError("not_found");
    }

    if (currentTask.version !== input.version) {
      throw new WorkDataError("conflict");
    }

    if (input.parentTaskId === taskId) {
      throw new WorkDataError("invalid_hierarchy");
    }

    if (
      input.parentTaskId &&
      (await isTaskDescendant({
        transaction,
        ownerUserId,
        taskId,
        proposedParentId: input.parentTaskId,
      }))
    ) {
      throw new WorkDataError("invalid_hierarchy");
    }

    const references = await validateTaskReferences({
      transaction,
      ownerUserId,
      input,
      currentTaskTypeId: currentTask.taskTypeId,
    });
    const now = new Date();
    const completedAt = references.status.isCompleted
      ? (currentTask.completedAt ?? now)
      : null;
    const [updatedTask] = await transaction
      .update(tasks)
      .set({
        parentTaskId: input.parentTaskId ?? null,
        taskTypeId: references.taskTypeId,
        statusId: input.statusId,
        courseId: input.courseId ?? null,
        organizationId: input.organizationId ?? null,
        title: input.title,
        description: input.description ?? null,
        notes: input.notes ?? null,
        priority: input.priority,
        workCategory: input.workCategory,
        startDate: input.startDate ?? null,
        dueDate: input.deadlineMode === "none" ? null : (input.dueDate ?? null),
        dueTime: input.deadlineMode === "datetime" ? (input.dueTime ?? null) : null,
        dueAt: resolveDueAt(input),
        timezone: input.timezone,
        completedAt,
        updatedAt: now,
        updatedBy: ownerUserId,
        version: sql`${tasks.version} + 1`,
      })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.ownerUserId, ownerUserId),
          eq(tasks.version, input.version ?? -1),
          isNull(tasks.deletedAt),
        ),
      )
      .returning({ id: tasks.id });

    if (!updatedTask) {
      throw new WorkDataError("conflict");
    }

    await transaction.insert(taskActivityLogs).values({
      ownerUserId,
      taskId,
      actorUserId: ownerUserId,
      action: "task_updated",
      details: { version: input.version },
    });
  });
}

export async function updateWorkTaskStatus(
  ownerUserId: string,
  input: ValidatedTaskStatusUpdate,
): Promise<void> {
  const db = requireDatabase();

  await db.transaction(async (transaction) => {
    const [currentTask] = await transaction
      .select({
        statusId: tasks.statusId,
        completedAt: tasks.completedAt,
        version: tasks.version,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.id, input.taskId),
          eq(tasks.ownerUserId, ownerUserId),
          isNull(tasks.deletedAt),
        ),
      )
      .limit(1);

    if (!currentTask) {
      throw new WorkDataError("not_found");
    }

    if (currentTask.version !== input.version) {
      throw new WorkDataError("conflict");
    }

    const status = await findActiveStatus(
      transaction,
      ownerUserId,
      input.statusId,
    );

    if (!status) {
      throw new WorkDataError("invalid_reference");
    }

    if (currentTask.statusId === status.id) {
      return;
    }

    const now = new Date();
    const [updatedTask] = await transaction
      .update(tasks)
      .set({
        statusId: status.id,
        completedAt: status.isCompleted
          ? (currentTask.completedAt ?? now)
          : null,
        updatedAt: now,
        updatedBy: ownerUserId,
        version: sql`${tasks.version} + 1`,
      })
      .where(
        and(
          eq(tasks.id, input.taskId),
          eq(tasks.ownerUserId, ownerUserId),
          eq(tasks.version, input.version),
          isNull(tasks.deletedAt),
        ),
      )
      .returning({ id: tasks.id });

    if (!updatedTask) {
      throw new WorkDataError("conflict");
    }

    await transaction.insert(taskActivityLogs).values({
      ownerUserId,
      taskId: input.taskId,
      actorUserId: ownerUserId,
      action: "task_status_updated",
      details: {
        previousStatusId: currentTask.statusId,
        statusId: status.id,
        version: input.version,
      },
    });
  });
}

export async function softDeleteWorkTask(
  ownerUserId: string,
  taskId: string,
): Promise<number> {
  const db = requireDatabase();

  return db.transaction(async (transaction) => {
    const now = new Date();
    const result = await transaction.execute(sql`
      with recursive descendants(id) as (
        select ${tasks.id}
        from ${tasks}
        where ${tasks.id} = ${taskId}
          and ${tasks.ownerUserId} = ${ownerUserId}
          and ${tasks.deletedAt} is null
        union all
        select child.id
        from ${tasks} as child
        inner join descendants on child.parent_task_id = descendants.id
        where child.owner_user_id = ${ownerUserId}
          and child.deleted_at is null
      )
      update ${tasks}
      set deleted_at = ${now},
          updated_at = ${now},
          updated_by = ${ownerUserId},
          version = version + 1
      where ${tasks.id} in (select id from descendants)
      returning ${tasks.id}
    `);
    const deletedCount = result.rows.length;

    if (!deletedCount) {
      throw new WorkDataError("not_found");
    }

    await transaction.insert(taskActivityLogs).values({
      ownerUserId,
      taskId,
      actorUserId: ownerUserId,
      action: "task_deleted",
      details: { deletedTaskCount: deletedCount },
    });

    return deletedCount;
  });
}

async function selectTaskRows(input: TaskRowQuery): Promise<WorkTaskItem[]> {
  const { db, ownerUserId, where, orderBy, limit, offset } = input;
  const subtaskSummary = db
    .select({
      parentTaskId: childTasks.parentTaskId,
      directSubtaskCount: count(childTasks.id).as("direct_subtask_count"),
      completedSubtaskCount: sql<number>`count(${childTasks.id}) filter (where ${childStatuses.isCompleted} = true)`
        .mapWith(Number)
        .as("completed_subtask_count"),
    })
    .from(childTasks)
    .innerJoin(childStatuses, eq(childTasks.statusId, childStatuses.id))
    .where(
      and(
        eq(childTasks.ownerUserId, ownerUserId),
        isNull(childTasks.deletedAt),
      ),
    )
    .groupBy(childTasks.parentTaskId)
    .as("subtask_summary");
  const rows = await db
    .select({
      id: tasks.id,
      parentTaskId: tasks.parentTaskId,
      title: tasks.title,
      description: tasks.description,
      notes: tasks.notes,
      priority: tasks.priority,
      workCategory: tasks.workCategory,
      startDate: tasks.startDate,
      dueDate: tasks.dueDate,
      dueTime: tasks.dueTime,
      timezone: tasks.timezone,
      archivedAt: tasks.archivedAt,
      version: tasks.version,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      taskTypeId: taskTypes.id,
      taskTypeName: taskTypes.name,
      taskTypeSlug: taskTypes.slug,
      taskTypeColor: taskTypes.color,
      taskTypeIcon: taskTypes.icon,
      taskTypeIsActive: taskTypes.isActive,
      taskTypeIsSystem: taskTypes.isSystem,
      statusId: taskStatuses.id,
      statusName: taskStatuses.name,
      statusSlug: taskStatuses.slug,
      statusColor: taskStatuses.color,
      statusIsCompleted: taskStatuses.isCompleted,
      courseId: canvasCourses.id,
      courseName: canvasCourses.name,
      courseCode: canvasCourses.courseCode,
      organizationId: workOrganizations.id,
      organizationName: workOrganizations.name,
      directSubtaskCount: subtaskSummary.directSubtaskCount,
      completedSubtaskCount: subtaskSummary.completedSubtaskCount,
    })
    .from(tasks)
    .innerJoin(taskTypes, eq(tasks.taskTypeId, taskTypes.id))
    .innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
    .leftJoin(canvasCourses, eq(tasks.courseId, canvasCourses.id))
    .leftJoin(
      workOrganizations,
      eq(tasks.organizationId, workOrganizations.id),
    )
    .leftJoin(subtaskSummary, eq(tasks.id, subtaskSummary.parentTaskId))
    .where(where)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);
  return rows.map((row) => ({
    id: row.id,
    parentTaskId: row.parentTaskId,
    title: row.title,
    description: row.description,
    notes: row.notes,
    priority: row.priority,
    workCategory: row.workCategory,
    startDate: row.startDate,
    dueDate: row.dueDate,
    dueTime: row.dueTime?.slice(0, 5) ?? null,
    timezone: row.timezone,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    taskType: {
      id: row.taskTypeId,
      name: row.taskTypeName,
      slug: row.taskTypeSlug,
      color: row.taskTypeColor,
      icon: row.taskTypeIcon,
      isActive: row.taskTypeIsActive,
      isSystem: row.taskTypeIsSystem,
    },
    status: {
      id: row.statusId,
      name: row.statusName,
      slug: row.statusSlug,
      color: row.statusColor,
      isCompleted: row.statusIsCompleted,
    },
    course: mapCourseOption(row),
    organization: row.organizationId
      ? { id: row.organizationId, name: row.organizationName ?? "Organization" }
      : null,
    directSubtaskCount: Number(row.directSubtaskCount ?? 0),
    completedSubtaskCount: Number(row.completedSubtaskCount ?? 0),
  }));
}

interface WorkWhereInput {
  db: WorkDatabase;
  ownerUserId: string;
  query: WorkQuery;
  rootTasksOnly: boolean;
}

function buildWorkWhereCondition(input: WorkWhereInput): SQL | undefined {
  const { db, ownerUserId, query, rootTasksOnly } = input;
  const matchingSubtask = db
    .select({ id: childTasks.id })
    .from(childTasks)
    .where(
      and(
        eq(childTasks.ownerUserId, ownerUserId),
        eq(childTasks.parentTaskId, tasks.id),
        isNull(childTasks.deletedAt),
      ),
    );
  return and(
    eq(tasks.ownerUserId, ownerUserId),
    isNull(tasks.deletedAt),
    rootTasksOnly ? isNull(tasks.parentTaskId) : undefined,
    buildSearchCondition(query.query),
    query.type === "all" ? undefined : eq(taskTypes.slug, query.type),
    query.status === "all" ? undefined : eq(taskStatuses.slug, query.status),
    query.priority === "all" ? undefined : eq(tasks.priority, query.priority),
    query.category === "all"
      ? undefined
      : eq(tasks.workCategory, query.category),
    query.course === "all" ? undefined : eq(tasks.courseId, query.course),
    query.organization === "all"
      ? undefined
      : eq(tasks.organizationId, query.organization),
    query.dueFrom ? gte(tasks.dueDate, query.dueFrom) : undefined,
    query.dueTo ? lte(tasks.dueDate, query.dueTo) : undefined,
    query.hasDeadline === "yes" ? isNotNull(tasks.dueDate) : undefined,
    query.hasDeadline === "no" ? isNull(tasks.dueDate) : undefined,
    query.hasSubtasks === "yes" ? exists(matchingSubtask) : undefined,
    query.hasSubtasks === "no" ? sql`not exists (${matchingSubtask})` : undefined,
    query.completion === "complete"
      ? eq(taskStatuses.isCompleted, true)
      : undefined,
    query.completion === "incomplete"
      ? eq(taskStatuses.isCompleted, false)
      : undefined,
    query.visibility === "active" ? isNull(tasks.archivedAt) : undefined,
    query.visibility === "archived" ? isNotNull(tasks.archivedAt) : undefined,
  );
}

function buildSearchCondition(search: string): SQL | undefined {
  if (!search) {
    return undefined;
  }

  const pattern = `%${escapeLikePattern(search)}%`;
  return or(
    ilike(tasks.title, pattern),
    ilike(tasks.description, pattern),
    ilike(canvasCourses.courseCode, pattern),
    ilike(canvasCourses.name, pattern),
    ilike(workOrganizations.name, pattern),
    ilike(taskTypes.name, pattern),
  );
}

function buildWorkOrderBy(query: WorkQuery): SQL[] {
  const sortColumn = WORK_SORT_COLUMNS[query.sort];
  const primarySort = query.order === "asc" ? asc(sortColumn) : desc(sortColumn);

  return [sql`${primarySort} nulls last`, asc(tasks.title), asc(tasks.id)];
}

async function getTaskTypeTabs(
  db: WorkDatabase,
  ownerUserId: string,
): Promise<WorkTaskTypeTab[]> {
  const rows = await db
    .select({
      id: taskTypes.id,
      name: taskTypes.name,
      slug: taskTypes.slug,
      color: taskTypes.color,
      icon: taskTypes.icon,
      isActive: taskTypes.isActive,
      isSystem: taskTypes.isSystem,
      taskCount: count(tasks.id),
    })
    .from(taskTypes)
    .leftJoin(
      tasks,
      and(
        eq(tasks.taskTypeId, taskTypes.id),
        eq(tasks.ownerUserId, ownerUserId),
        isNull(tasks.parentTaskId),
        isNull(tasks.archivedAt),
        isNull(tasks.deletedAt),
      ),
    )
    .where(
      and(
        eq(taskTypes.ownerUserId, ownerUserId),
        eq(taskTypes.isActive, true),
        isNull(taskTypes.archivedAt),
      ),
    )
    .groupBy(taskTypes.id)
    .orderBy(asc(taskTypes.sortOrder), asc(taskTypes.name));

  return rows.map((row) => ({ ...row, taskCount: Number(row.taskCount) }));
}

async function getWorkFilterOptions(
  db: WorkDatabase,
  ownerUserId: string,
): Promise<WorkFilterOptions> {
  const [typeRows, statusRows, courseRows, organizationRows, parentRows] =
    await Promise.all([
      db
        .select({
          id: taskTypes.id,
          name: taskTypes.name,
          slug: taskTypes.slug,
          color: taskTypes.color,
          icon: taskTypes.icon,
          isActive: taskTypes.isActive,
          isSystem: taskTypes.isSystem,
        })
        .from(taskTypes)
        .where(eq(taskTypes.ownerUserId, ownerUserId))
        .orderBy(asc(taskTypes.sortOrder), asc(taskTypes.name)),
      db
        .select({
          id: taskStatuses.id,
          name: taskStatuses.name,
          slug: taskStatuses.slug,
          color: taskStatuses.color,
          isCompleted: taskStatuses.isCompleted,
        })
        .from(taskStatuses)
        .where(
          and(
            eq(taskStatuses.ownerUserId, ownerUserId),
            eq(taskStatuses.isActive, true),
          ),
        )
        .orderBy(asc(taskStatuses.sortOrder), asc(taskStatuses.name)),
      db
        .select({
          id: canvasCourses.id,
          name: canvasCourses.name,
          code: canvasCourses.courseCode,
        })
        .from(canvasCourses)
        .orderBy(asc(canvasCourses.courseCode), asc(canvasCourses.name)),
      db
        .select({ id: workOrganizations.id, name: workOrganizations.name })
        .from(workOrganizations)
        .where(
          and(
            eq(workOrganizations.ownerUserId, ownerUserId),
            eq(workOrganizations.isActive, true),
            isNull(workOrganizations.archivedAt),
          ),
        )
        .orderBy(asc(workOrganizations.name)),
      db
        .select({ id: tasks.id, title: tasks.title })
        .from(tasks)
        .where(
          and(
            eq(tasks.ownerUserId, ownerUserId),
            isNull(tasks.deletedAt),
            isNull(tasks.archivedAt),
          ),
        )
        .orderBy(asc(tasks.title))
        .limit(200),
    ]);

  return {
    taskTypes: typeRows,
    statuses: statusRows,
    courses: courseRows.map((course) => ({
      id: course.id,
      name: course.name ?? course.code ?? "Course",
      code: course.code ?? course.name ?? "Course",
    })),
    organizations: organizationRows,
    parentTasks: parentRows,
  };
}

async function validateTaskReferences(
  validation: ReferenceValidation,
): Promise<{ taskTypeId: string; status: WorkStatusOption }> {
  const { transaction, ownerUserId, input } = validation;
  const taskTypeId = await resolveTaskType(validation);
  const status = await findActiveStatus(
    transaction,
    ownerUserId,
    input.statusId,
  );

  if (!status) {
    throw new WorkDataError("invalid_reference");
  }

  const [courseCount, organizationCount, parentCount] = await Promise.all([
    input.courseId
      ? transaction.$count(canvasCourses, eq(canvasCourses.id, input.courseId))
      : Promise.resolve(1),
    input.organizationId
      ? transaction.$count(
          workOrganizations,
          and(
            eq(workOrganizations.id, input.organizationId),
            eq(workOrganizations.ownerUserId, ownerUserId),
            eq(workOrganizations.isActive, true),
            isNull(workOrganizations.archivedAt),
          ),
        )
      : Promise.resolve(1),
    input.parentTaskId
      ? transaction.$count(
          tasks,
          and(
            eq(tasks.id, input.parentTaskId),
            eq(tasks.ownerUserId, ownerUserId),
            isNull(tasks.deletedAt),
          ),
        )
      : Promise.resolve(1),
  ]);

  if (!courseCount || !organizationCount || !parentCount) {
    throw new WorkDataError("invalid_reference");
  }

  return { taskTypeId, status };
}

async function findActiveStatus(
  transaction: WorkTransaction,
  ownerUserId: string,
  statusId: string,
): Promise<WorkStatusOption | undefined> {
  const [status] = await transaction
    .select({
      id: taskStatuses.id,
      name: taskStatuses.name,
      slug: taskStatuses.slug,
      color: taskStatuses.color,
      isCompleted: taskStatuses.isCompleted,
    })
    .from(taskStatuses)
    .where(
      and(
        eq(taskStatuses.id, statusId),
        eq(taskStatuses.ownerUserId, ownerUserId),
        eq(taskStatuses.isActive, true),
      ),
    )
    .limit(1);

  return status;
}

async function resolveTaskType(
  validation: ReferenceValidation,
): Promise<string> {
  const { transaction, ownerUserId, input, currentTaskTypeId } = validation;
  if (input.taskTypeId === NEW_TASK_TYPE_VALUE) {
    const newType = taskTypeInputSchema.parse(input.newType);
    const normalizedName = normalizeWorkName(newType.name);
    const duplicateCount = await transaction.$count(
      taskTypes,
      and(
        eq(taskTypes.ownerUserId, ownerUserId),
        eq(taskTypes.normalizedName, normalizedName),
      ),
    );

    if (duplicateCount) {
      throw new WorkDataError("duplicate_type");
    }

    const slug = await createAvailableSlug(
      transaction,
      ownerUserId,
      newType.name,
    );
    const [createdType] = await transaction
      .insert(taskTypes)
      .values({
        ownerUserId,
        name: newType.name,
        normalizedName,
        slug,
        description: newType.description ?? null,
        color: newType.color,
        icon: newType.icon,
        sortOrder: 1_000,
      })
      .returning({ id: taskTypes.id });

    if (!createdType) {
      throw new WorkDataError("database_unavailable");
    }

    return createdType.id;
  }

  const [selectedType] = await transaction
    .select({ id: taskTypes.id, isActive: taskTypes.isActive })
    .from(taskTypes)
    .where(
      and(
        eq(taskTypes.id, input.taskTypeId),
        eq(taskTypes.ownerUserId, ownerUserId),
      ),
    )
    .limit(1);

  if (
    !selectedType ||
    (!selectedType.isActive && selectedType.id !== currentTaskTypeId)
  ) {
    throw new WorkDataError("invalid_reference");
  }

  return selectedType.id;
}

async function createAvailableSlug(
  transaction: WorkTransaction,
  ownerUserId: string,
  name: string,
): Promise<string> {
  const baseSlug = createStableSlug(name) || "task-type";

  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const slug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
    const slugCount = await transaction.$count(
      taskTypes,
      and(
        eq(taskTypes.ownerUserId, ownerUserId),
        eq(taskTypes.slug, slug),
      ),
    );

    if (!slugCount) {
      return slug;
    }
  }

  throw new WorkDataError("duplicate_type");
}


interface TaskHierarchyInput {
  transaction: WorkTransaction;
  ownerUserId: string;
  taskId: string;
  proposedParentId: string;
}

async function isTaskDescendant(input: TaskHierarchyInput): Promise<boolean> {
  const { transaction, ownerUserId, taskId, proposedParentId } = input;
  const result = await transaction.execute(sql`
    with recursive descendants(id) as (
      select ${tasks.id}
      from ${tasks}
      where ${tasks.parentTaskId} = ${taskId}
        and ${tasks.ownerUserId} = ${ownerUserId}
        and ${tasks.deletedAt} is null
      union all
      select child.id
      from ${tasks} as child
      inner join descendants on child.parent_task_id = descendants.id
      where child.owner_user_id = ${ownerUserId}
        and child.deleted_at is null
    )
    select id from descendants where id = ${proposedParentId} limit 1
  `);

  return result.rows.length > 0;
}

async function findTaskByRequestKey(
  db: Pick<WorkDatabase, "select">,
  ownerUserId: string,
  requestKey: string,
) {
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.ownerUserId, ownerUserId),
        eq(tasks.requestKey, requestKey),
      ),
    )
    .limit(1);

  return task;
}

function resolveDueAt(input: ValidatedTaskInput): Date | null {
  if (input.deadlineMode !== "datetime" || !input.dueDate || !input.dueTime) {
    return null;
  }

  const [year, month, day] = input.dueDate.split("-").map(Number);
  const [hour, minute] = input.dueTime.split(":").map(Number);
  const targetTimestamp = Date.UTC(year, month - 1, day, hour, minute);
  let resolvedTimestamp = targetTimestamp;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: input.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let iteration = 0; iteration < 2; iteration += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(resolvedTimestamp))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const formattedTimestamp = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    resolvedTimestamp += targetTimestamp - formattedTimestamp;
  }

  return new Date(resolvedTimestamp);
}

function mapCourseOption(row: {
  courseId: string | null;
  courseName: string | null;
  courseCode: string | null;
}): WorkCourseOption | null {
  if (!row.courseId) {
    return null;
  }

  return {
    id: row.courseId,
    name: row.courseName ?? row.courseCode ?? "Course",
    code: row.courseCode ?? row.courseName ?? "Course",
  };
}

function createUnavailableWorkPageData(): WorkPageData {
  return {
    tasks: [],
    taskTypes: [],
    options: {
      taskTypes: [],
      statuses: [],
      courses: [],
      organizations: [],
      parentTasks: [],
    },
    totalCount: 0,
    totalPages: 1,
    databaseAvailable: false,
  };
}

function requireDatabase(): WorkDatabase {
  const db = getDb();

  if (!db) {
    throw new WorkDataError("database_unavailable");
  }

  return db;
}

function escapeLikePattern(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}
