import "server-only";

import { asc, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  canvasAssignmentGroups,
  canvasAssignments,
  canvasCalendarEvents,
  canvasCourseNicknames,
  canvasCourses,
  canvasDiscussionTopics,
  canvasEnrollments,
  canvasFiles,
  canvasFolders,
  canvasModuleItems,
  canvasModules,
  canvasSubmissions,
  canvasTodoItems,
  canvasUsers,
  type CanvasAssignment,
  type CanvasAssignmentGroup,
  type CanvasCalendarEvent,
  type CanvasCourse,
  type CanvasCourseNickname,
  type CanvasDiscussionTopic,
  type CanvasEnrollment,
  type CanvasFile,
  type CanvasFolder,
  type CanvasModule,
  type CanvasModuleItem,
  type CanvasSubmission,
  type CanvasTodoItem,
  type CanvasUser,
} from "@/lib/db/schema";

export type CanvasCourseSectionKey =
  | "overview"
  | "syllabus"
  | "modules"
  | "announcements"
  | "assignments"
  | "discussions"
  | "grades"
  | "people"
  | "files"
  | "calendar"
  | "meetings";

export type CanvasAssignmentStatus =
  | "upcoming"
  | "undated"
  | "past"
  | "overdue";

export type CanvasCourseSectionSummary = {
  key: CanvasCourseSectionKey;
  label: string;
  available: boolean;
  count: number;
  emptyLabel: string;
  updatedAt: string | null;
};

export type CanvasCourseNavigationItem = {
  routeKey: string;
  canvasId: string;
  label: string;
  secondaryLabel: string | null;
  href: string;
  availableSectionCount: number;
  sections: CanvasCourseSectionSummary[];
  syncedAt: string | null;
  updatedAt: string | null;
};

export type CanvasAssignmentView = {
  id: string;
  canvasId: string;
  courseCanvasId: string;
  title: string;
  status: CanvasAssignmentStatus;
  dueAt: string | null;
  dueDate: string | null;
  unlockAt: string | null;
  lockAt: string | null;
  assignmentGroup: string | null;
  pointsPossible: number | null;
  gradingType: string | null;
  submissionTypes: string[];
  workflowState: string | null;
  submissionState: string | null;
  submissionLabel: string;
  score: number | null;
  grade: string | null;
  late: boolean | null;
  missing: boolean | null;
  htmlUrl: string | null;
  description: string | null;
};

export type CanvasModuleItemView = {
  id: string;
  title: string;
  type: string | null;
  position: number | null;
  indent: number | null;
  htmlUrl: string | null;
  externalUrl: string | null;
  published: boolean | null;
};

export type CanvasModuleView = {
  id: string;
  canvasId: string;
  name: string;
  position: number | null;
  workflowState: string | null;
  unlockAt: string | null;
  items: CanvasModuleItemView[];
};

export type CanvasTopicView = {
  id: string;
  title: string;
  message: string | null;
  htmlUrl: string | null;
  postedAt: string | null;
  lastReplyAt: string | null;
  workflowState: string | null;
  authorName: string | null;
  replyCount: number | null;
};

export type CanvasGradeView = {
  currentScore: number | null;
  currentGrade: string | null;
  finalScore: number | null;
  finalGrade: string | null;
  enrollmentRole: string | null;
  items: {
    id: string;
    title: string;
    pointsPossible: number | null;
    score: number | null;
    grade: string | null;
    workflowState: string | null;
    submissionState: string | null;
  }[];
};

export type CanvasPersonView = {
  id: string;
  name: string;
  role: string | null;
  type: string | null;
  enrollmentState: string | null;
  email: string | null;
  avatarUrl: string | null;
  lastActivityAt: string | null;
};

export type CanvasFileView = {
  id: string;
  name: string;
  folderName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  url: string | null;
  updatedAt: string | null;
  locked: boolean | null;
  hidden: boolean | null;
};

export type CanvasCalendarItemView = {
  id: string;
  title: string;
  type: string | null;
  startsAt: string | null;
  endsAt: string | null;
  htmlUrl: string | null;
  location: string | null;
  source: "event" | "todo";
};

export type CanvasMeetingView = {
  id: string;
  title: string;
  type: string | null;
  htmlUrl: string | null;
  externalUrl: string | null;
};

export type CanvasCourseWorkspace = {
  course: {
    routeKey: string;
    canvasId: string;
    label: string;
    secondaryLabel: string | null;
    courseCode: string | null;
    originalName: string | null;
    name: string | null;
    termName: string | null;
    workflowState: string | null;
    enrollmentState: string | null;
    startAt: string | null;
    endAt: string | null;
    syncedAt: string | null;
    updatedAt: string | null;
    instructorNames: string[];
  };
  sections: CanvasCourseSectionSummary[];
  syllabus: string | null;
  modules: CanvasModuleView[];
  announcements: CanvasTopicView[];
  discussions: CanvasTopicView[];
  assignments: CanvasAssignmentView[];
  grades: CanvasGradeView;
  people: CanvasPersonView[];
  files: CanvasFileView[];
  calendar: CanvasCalendarItemView[];
  meetings: CanvasMeetingView[];
};

type CanvasCourseCache = {
  courses: CanvasCourse[];
  nicknames: CanvasCourseNickname[];
  enrollments: CanvasEnrollment[];
  assignmentGroups: CanvasAssignmentGroup[];
  assignments: CanvasAssignment[];
  submissions: CanvasSubmission[];
  discussionTopics: CanvasDiscussionTopic[];
  modules: CanvasModule[];
  moduleItems: CanvasModuleItem[];
  folders: CanvasFolder[];
  files: CanvasFile[];
  calendarEvents: CanvasCalendarEvent[];
  todoItems: CanvasTodoItem[];
  users: CanvasUser[];
};

type SectionDerivedData = {
  assignments?: CanvasAssignmentView[];
  modules?: CanvasModuleView[];
  announcements?: CanvasTopicView[];
  discussions?: CanvasTopicView[];
  people?: CanvasPersonView[];
  files?: CanvasFileView[];
  calendar?: CanvasCalendarItemView[];
  meetings?: CanvasMeetingView[];
};

const sectionDefinitions = [
  {
    key: "overview",
    label: "Overview",
    emptyLabel: "Course identity is available, but no Canvas item groups are cached yet.",
  },
  {
    key: "syllabus",
    label: "Syllabus",
    emptyLabel: "No cached syllabus content is available for this course.",
  },
  {
    key: "modules",
    label: "Modules",
    emptyLabel: "No cached modules or module items are available for this course.",
  },
  {
    key: "announcements",
    label: "Announcements",
    emptyLabel: "No cached announcements are available for this course.",
  },
  {
    key: "assignments",
    label: "Assignments",
    emptyLabel: "No cached assignments are available for this course.",
  },
  {
    key: "discussions",
    label: "Discussions",
    emptyLabel: "No cached discussion topics are available for this course.",
  },
  {
    key: "grades",
    label: "Grades",
    emptyLabel: "No cached grade or submission data is available for this course.",
  },
  {
    key: "people",
    label: "People",
    emptyLabel: "No cached enrollment or user records are available for this course.",
  },
  {
    key: "files",
    label: "Files",
    emptyLabel: "No cached folders or files are available for this course.",
  },
  {
    key: "calendar",
    label: "Calendar",
    emptyLabel: "No cached calendar events or to-do items are available for this course.",
  },
  {
    key: "meetings",
    label: "Meetings",
    emptyLabel: "No cached meeting or external conference links are available for this course.",
  },
] as const satisfies readonly {
  key: CanvasCourseSectionKey;
  label: string;
  emptyLabel: string;
}[];

const inactiveStates = new Set([
  "archived",
  "completed",
  "deleted",
  "inactive",
  "rejected",
  "unpublished",
]);

export async function getCanvasCourseNavigation(): Promise<
  CanvasCourseNavigationItem[]
> {
  const courses = await getActiveCanvasCourses();

  if (!courses.length) {
    return [];
  }

  const cache = await loadCourseCache(courses);
  const nicknamesByCourse = mapCourseNicknames(cache.nicknames);

  return courses
    .map((course) => {
      const courseCache = filterCacheForCourse(cache, course.canvasId);
      const sections = buildSectionSummaries(course, courseCache);
      const model = buildCourseIdentity(course, nicknamesByCourse);

      return {
        ...model,
        href: `/courses/${model.routeKey}`,
        availableSectionCount: sections.filter(
          (section) => section.key !== "overview" && section.available,
        ).length,
        sections,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function getCanvasCourseWorkspace(
  routeKey: string,
): Promise<CanvasCourseWorkspace | null> {
  const courses = await getActiveCanvasCourses();
  const routeCourse = courses.find((course) =>
    matchesCourseRouteKey(course, routeKey),
  );

  if (!routeCourse) {
    return null;
  }

  const cache = await loadCourseCache([routeCourse]);
  const nicknamesByCourse = mapCourseNicknames(cache.nicknames);
  const courseCache = filterCacheForCourse(cache, routeCourse.canvasId);
  const assignments = buildAssignmentViews(courseCache);
  const modules = buildModules(courseCache);
  const announcements = buildAnnouncements(courseCache);
  const discussions = buildDiscussions(courseCache);
  const people = buildPeople(courseCache);
  const files = buildFiles(courseCache);
  const calendar = buildCalendar(courseCache);
  const meetings = buildMeetings(courseCache);
  const sections = buildSectionSummaries(routeCourse, courseCache, {
    assignments,
    modules,
    announcements,
    discussions,
    people,
    files,
    calendar,
    meetings,
  });

  return {
    course: {
      ...buildCourseIdentity(routeCourse, nicknamesByCourse),
      courseCode: valueOrNull(routeCourse.courseCode),
      originalName: valueOrNull(routeCourse.originalName),
      name: valueOrNull(routeCourse.name),
      termName: valueOrNull(routeCourse.termName),
      workflowState: valueOrNull(routeCourse.workflowState),
      enrollmentState: valueOrNull(routeCourse.enrollmentState),
      startAt: toIso(routeCourse.startAt),
      endAt: toIso(routeCourse.endAt),
      instructorNames: getInstructorNames(courseCache),
    },
    sections,
    syllabus: stripHtml(routeCourse.syllabusBody),
    modules,
    announcements,
    discussions,
    assignments,
    grades: buildGrades(courseCache, assignments),
    people,
    files,
    calendar,
    meetings,
  };
}

export function getSectionDefinitions() {
  return sectionDefinitions;
}

export function getCanvasCourseRouteKey(canvasId: string) {
  return encodeURIComponent(canvasId.trim());
}

function matchesCourseRouteKey(course: CanvasCourse, routeKey: string) {
  const decodedRouteKey = decodeRouteKey(routeKey);
  const normalizedCanvasId = course.canvasId.trim();

  return (
    getCanvasCourseRouteKey(normalizedCanvasId) === routeKey ||
    normalizedCanvasId === decodedRouteKey
  );
}

async function getActiveCanvasCourses() {
  const db = getDb();

  if (!db) {
    return [];
  }

  try {
    const courses = await db
      .select()
      .from(canvasCourses)
      .orderBy(asc(canvasCourses.courseCode), asc(canvasCourses.name));

    return courses.filter(isActiveCourse);
  } catch (error) {
    console.error("Unable to load Canvas courses from cache.", error);

    return [];
  }
}

async function loadCourseCache(courses: CanvasCourse[]): Promise<CanvasCourseCache> {
  const db = getDb();
  const courseCanvasIds = courses.map((course) => course.canvasId);

  if (!db || !courseCanvasIds.length) {
    return emptyCache(courses);
  }

  try {
    const [
      nicknames,
      enrollments,
      assignmentGroups,
      assignments,
      submissions,
      discussionTopics,
      modules,
      moduleItems,
      folders,
      files,
      calendarEvents,
      todoItems,
    ] = await Promise.all([
      db
        .select()
        .from(canvasCourseNicknames)
        .where(inArray(canvasCourseNicknames.courseCanvasId, courseCanvasIds)),
      db
        .select()
        .from(canvasEnrollments)
        .where(inArray(canvasEnrollments.courseCanvasId, courseCanvasIds)),
      db
        .select()
        .from(canvasAssignmentGroups)
        .where(inArray(canvasAssignmentGroups.courseCanvasId, courseCanvasIds)),
      db
        .select()
        .from(canvasAssignments)
        .where(inArray(canvasAssignments.courseCanvasId, courseCanvasIds)),
      db
        .select()
        .from(canvasSubmissions)
        .where(inArray(canvasSubmissions.courseCanvasId, courseCanvasIds)),
      db
        .select()
        .from(canvasDiscussionTopics)
        .where(inArray(canvasDiscussionTopics.courseCanvasId, courseCanvasIds)),
      db
        .select()
        .from(canvasModules)
        .where(inArray(canvasModules.courseCanvasId, courseCanvasIds)),
      db
        .select()
        .from(canvasModuleItems)
        .where(inArray(canvasModuleItems.courseCanvasId, courseCanvasIds)),
      db
        .select()
        .from(canvasFolders)
        .where(inArray(canvasFolders.courseCanvasId, courseCanvasIds)),
      db
        .select()
        .from(canvasFiles)
        .where(inArray(canvasFiles.courseCanvasId, courseCanvasIds)),
      db
        .select()
        .from(canvasCalendarEvents)
        .where(inArray(canvasCalendarEvents.courseCanvasId, courseCanvasIds)),
      db
        .select()
        .from(canvasTodoItems)
        .where(inArray(canvasTodoItems.courseCanvasId, courseCanvasIds)),
    ]);
    const userCanvasIds = Array.from(
      new Set(
        enrollments
          .map((enrollment) => enrollment.userCanvasId)
          .filter((userCanvasId): userCanvasId is string =>
            Boolean(userCanvasId),
          ),
      ),
    );
    const users = userCanvasIds.length
      ? await db
          .select()
          .from(canvasUsers)
          .where(inArray(canvasUsers.canvasId, userCanvasIds))
      : [];

    return {
      courses,
      nicknames,
      enrollments,
      assignmentGroups,
      assignments,
      submissions,
      discussionTopics,
      modules,
      moduleItems,
      folders,
      files,
      calendarEvents,
      todoItems,
      users,
    };
  } catch (error) {
    console.error("Unable to load Canvas course cache records.", error);

    return emptyCache(courses);
  }
}

function emptyCache(courses: CanvasCourse[]): CanvasCourseCache {
  return {
    courses,
    nicknames: [],
    enrollments: [],
    assignmentGroups: [],
    assignments: [],
    submissions: [],
    discussionTopics: [],
    modules: [],
    moduleItems: [],
    folders: [],
    files: [],
    calendarEvents: [],
    todoItems: [],
    users: [],
  };
}

function filterCacheForCourse(
  cache: CanvasCourseCache,
  courseCanvasId: string,
): CanvasCourseCache {
  return {
    courses: cache.courses.filter((course) => course.canvasId === courseCanvasId),
    nicknames: cache.nicknames.filter(
      (nickname) => nickname.courseCanvasId === courseCanvasId,
    ),
    enrollments: cache.enrollments.filter(
      (enrollment) => enrollment.courseCanvasId === courseCanvasId,
    ),
    assignmentGroups: cache.assignmentGroups.filter(
      (group) => group.courseCanvasId === courseCanvasId,
    ),
    assignments: cache.assignments.filter(
      (assignment) => assignment.courseCanvasId === courseCanvasId,
    ),
    submissions: cache.submissions.filter(
      (submission) => submission.courseCanvasId === courseCanvasId,
    ),
    discussionTopics: cache.discussionTopics.filter(
      (topic) => topic.courseCanvasId === courseCanvasId,
    ),
    modules: cache.modules.filter((module) => module.courseCanvasId === courseCanvasId),
    moduleItems: cache.moduleItems.filter(
      (item) => item.courseCanvasId === courseCanvasId,
    ),
    folders: cache.folders.filter(
      (folder) => folder.courseCanvasId === courseCanvasId,
    ),
    files: cache.files.filter((file) => file.courseCanvasId === courseCanvasId),
    calendarEvents: cache.calendarEvents.filter(
      (event) => event.courseCanvasId === courseCanvasId,
    ),
    todoItems: cache.todoItems.filter(
      (item) => item.courseCanvasId === courseCanvasId,
    ),
    users: cache.users,
  };
}

function buildCourseIdentity(
  course: CanvasCourse,
  nicknamesByCourse: Map<string, CanvasCourseNickname>,
) {
  const nickname = valueOrNull(nicknamesByCourse.get(course.canvasId)?.nickname);
  const label = firstText(
    nickname,
    course.courseCode,
    course.originalName,
    course.name,
    `Course ${course.canvasId}`,
  );
  const secondaryLabel = [
    valueOrNull(course.courseCode) !== label ? valueOrNull(course.courseCode) : null,
    valueOrNull(course.termName),
    valueOrNull(course.originalName) !== label
      ? valueOrNull(course.originalName)
      : null,
  ]
    .filter((value): value is string => Boolean(value))
    .slice(0, 2)
    .join(" / ");

  return {
    routeKey: getCanvasCourseRouteKey(course.canvasId),
    canvasId: course.canvasId,
    label,
    secondaryLabel: secondaryLabel || null,
    syncedAt: toIso(course.syncedAt),
    updatedAt: toIso(course.updatedAt),
  };
}

function buildSectionSummaries(
  course: CanvasCourse,
  cache: CanvasCourseCache,
  derived: SectionDerivedData = {},
): CanvasCourseSectionSummary[] {
  const syllabus = stripHtml(course.syllabusBody);
  const announcements = derived.announcements ?? getAnnouncementTopics(cache);
  const discussions = derived.discussions ?? getDiscussionTopics(cache);
  const moduleCount = derived.modules
    ? derived.modules.length +
      derived.modules.reduce((count, module) => count + module.items.length, 0)
    : cache.modules.length + cache.moduleItems.length;
  const assignments = derived.assignments ?? cache.assignments;
  const people = derived.people ?? cache.enrollments;
  const files = derived.files ?? cache.files;
  const calendar = derived.calendar ?? [
    ...cache.calendarEvents,
    ...cache.todoItems,
  ];
  const meetings = derived.meetings ?? filterMeetingItems(cache.moduleItems);
  const gradeCount =
    cache.submissions.length +
    cache.enrollments.filter(
      (enrollment) =>
        enrollment.currentGrade ||
        enrollment.currentScore !== null ||
        enrollment.finalGrade ||
        enrollment.finalScore !== null,
    ).length;
  const sectionCounts = {
    overview: 1,
    syllabus: syllabus ? 1 : 0,
    modules: moduleCount,
    announcements: announcements.length,
    assignments: assignments.length,
    discussions: discussions.length,
    grades: gradeCount,
    people: people.length,
    files: files.length + cache.folders.length,
    calendar: calendar.length,
    meetings: meetings.length,
  } satisfies Record<CanvasCourseSectionKey, number>;
  const sectionUpdatedAt = {
    overview: latestIso([course]),
    syllabus: toIso(course.updatedAt),
    modules: latestIso([...cache.modules, ...cache.moduleItems]),
    announcements: latestIso(getAnnouncementTopics(cache)),
    assignments: latestIso([...cache.assignments, ...cache.submissions]),
    discussions: latestIso(getDiscussionTopics(cache)),
    grades: latestIso([...cache.enrollments, ...cache.submissions]),
    people: latestIso([...cache.enrollments, ...cache.users]),
    files: latestIso([...cache.folders, ...cache.files]),
    calendar: latestIso([...cache.calendarEvents, ...cache.todoItems]),
    meetings: latestIso(filterMeetingItems(cache.moduleItems)),
  } satisfies Record<CanvasCourseSectionKey, string | null>;

  return sectionDefinitions.map((definition) => ({
    ...definition,
    available: definition.key === "overview" || sectionCounts[definition.key] > 0,
    count: sectionCounts[definition.key],
    updatedAt: sectionUpdatedAt[definition.key],
  }));
}

function buildAssignmentViews(cache: CanvasCourseCache): CanvasAssignmentView[] {
  const groupNameById = new Map<string, string>();
  const groupNameByCanvasId = new Map<string, string>();
  const userCanvasId = resolveCurrentUserCanvasId(cache);

  cache.assignmentGroups.forEach((group) => {
    const name = valueOrNull(group.name);

    if (name) {
      groupNameById.set(group.id, name);
      groupNameByCanvasId.set(group.canvasId, name);
    }
  });

  return [...cache.assignments]
    .sort(compareAssignments)
    .map((assignment) => {
      const submission = pickSubmissionForAssignment(
        assignment,
        cache.submissions,
        userCanvasId,
      );
      const status = deriveAssignmentStatus(assignment, submission);
      const dueAt = toIso(assignment.dueAt);
      const groupName = assignment.assignmentGroupId
        ? groupNameById.get(assignment.assignmentGroupId)
        : assignment.assignmentGroupCanvasId
          ? groupNameByCanvasId.get(assignment.assignmentGroupCanvasId)
          : null;

      return {
        id: assignment.id,
        canvasId: assignment.canvasId,
        courseCanvasId: assignment.courseCanvasId,
        title: firstText(assignment.name, `Assignment ${assignment.canvasId}`),
        status,
        dueAt,
        dueDate: dueAt ? dueAt.slice(0, 10) : null,
        unlockAt: toIso(assignment.unlockAt),
        lockAt: toIso(assignment.lockAt),
        assignmentGroup: groupName ?? null,
        pointsPossible: assignment.pointsPossible,
        gradingType: valueOrNull(assignment.gradingType),
        submissionTypes: assignment.submissionTypes ?? [],
        workflowState: valueOrNull(assignment.workflowState),
        submissionState: valueOrNull(submission?.workflowState),
        submissionLabel: getSubmissionLabel(submission),
        score: submission?.score ?? null,
        grade: valueOrNull(submission?.grade),
        late: submission?.late ?? null,
        missing: submission?.missing ?? null,
        htmlUrl: valueOrNull(assignment.htmlUrl),
        description: stripHtml(assignment.description),
      };
    });
}

function buildModules(cache: CanvasCourseCache): CanvasModuleView[] {
  const itemsByModuleCanvasId = groupBy(
    cache.moduleItems,
    (item) => item.moduleCanvasId,
  );
  const modules = [...cache.modules]
    .sort(comparePositionThenName)
    .map((module) => ({
      id: module.id,
      canvasId: module.canvasId,
      name: firstText(module.name, `Module ${module.canvasId}`),
      position: module.position,
      workflowState: valueOrNull(module.workflowState),
      unlockAt: toIso(module.unlockAt),
      items: (itemsByModuleCanvasId.get(module.canvasId) ?? [])
        .sort(comparePositionThenTitle)
        .map(buildModuleItem),
    }));
  const moduleCanvasIds = new Set(cache.modules.map((module) => module.canvasId));
  const orphanItems = cache.moduleItems
    .filter((item) => !moduleCanvasIds.has(item.moduleCanvasId))
    .sort(comparePositionThenTitle);

  if (orphanItems.length) {
    modules.push({
      id: "ungrouped-module-items",
      canvasId: "ungrouped-module-items",
      name: "Ungrouped module items",
      position: null,
      workflowState: null,
      unlockAt: null,
      items: orphanItems.map(buildModuleItem),
    });
  }

  return modules;
}

function buildModuleItem(item: CanvasModuleItem): CanvasModuleItemView {
  return {
    id: item.id,
    title: firstText(item.title, `Item ${item.canvasId}`),
    type: valueOrNull(item.type),
    position: item.position,
    indent: item.indent,
    htmlUrl: valueOrNull(item.htmlUrl),
    externalUrl: valueOrNull(item.externalUrl ?? item.url),
    published: item.published,
  };
}

function buildAnnouncements(cache: CanvasCourseCache): CanvasTopicView[] {
  return buildTopicViews(getAnnouncementTopics(cache), "Announcement");
}

function buildDiscussions(cache: CanvasCourseCache): CanvasTopicView[] {
  return buildTopicViews(getDiscussionTopics(cache), "Discussion");
}

function getAnnouncementTopics(cache: CanvasCourseCache) {
  return cache.discussionTopics.filter(isAnnouncementTopic);
}

function getDiscussionTopics(cache: CanvasCourseCache) {
  return cache.discussionTopics.filter(isDiscussionTopic);
}

function isAnnouncementTopic(topic: CanvasDiscussionTopic) {
  return topic.isAnnouncement;
}

function isDiscussionTopic(topic: CanvasDiscussionTopic) {
  return !topic.isAnnouncement;
}

function buildTopicViews(
  topics: CanvasDiscussionTopic[],
  fallbackTitle: string,
): CanvasTopicView[] {
  return topics
    .sort((a, b) => compareIsoDesc(toIso(a.postedAt), toIso(b.postedAt)))
    .map((topic) => ({
      id: topic.id,
      title: firstText(topic.title, fallbackTitle),
      message: stripHtml(topic.message),
      htmlUrl: valueOrNull(topic.htmlUrl),
      postedAt: toIso(topic.postedAt),
      lastReplyAt: toIso(topic.lastReplyAt),
      workflowState: valueOrNull(topic.workflowState),
      authorName: getRawText(topic.author, ["display_name", "name", "short_name"]),
      replyCount: topic.discussionSubentryCount,
    }));
}

function buildGrades(
  cache: CanvasCourseCache,
  assignments: CanvasAssignmentView[],
): CanvasGradeView {
  const userCanvasId = resolveCurrentUserCanvasId(cache);
  const enrollment =
    (userCanvasId
      ? cache.enrollments.find(
          (item) => item.userCanvasId === userCanvasId && isEnrollmentActive(item),
        )
      : null) ??
    cache.enrollments.find((item) => isEnrollmentActive(item)) ??
    cache.enrollments[0];

  return {
    currentScore: enrollment?.currentScore ?? null,
    currentGrade: valueOrNull(enrollment?.currentGrade),
    finalScore: enrollment?.finalScore ?? null,
    finalGrade: valueOrNull(enrollment?.finalGrade),
    enrollmentRole: valueOrNull(enrollment?.role ?? enrollment?.type),
    items: assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      pointsPossible: assignment.pointsPossible,
      score: assignment.score,
      grade: assignment.grade,
      workflowState: assignment.workflowState,
      submissionState: assignment.submissionState,
    })),
  };
}

function buildPeople(cache: CanvasCourseCache): CanvasPersonView[] {
  const usersByCanvasId = new Map(
    cache.users.map((user) => [user.canvasId, user]),
  );

  return [...cache.enrollments]
    .sort((a, b) => {
      const aUser = a.userCanvasId ? usersByCanvasId.get(a.userCanvasId) : null;
      const bUser = b.userCanvasId ? usersByCanvasId.get(b.userCanvasId) : null;

      return getUserDisplayName(aUser, a).localeCompare(
        getUserDisplayName(bUser, b),
      );
    })
    .map((enrollment) => {
      const user = enrollment.userCanvasId
        ? usersByCanvasId.get(enrollment.userCanvasId)
        : null;

      return {
        id: enrollment.id,
        name: getUserDisplayName(user, enrollment),
        role: valueOrNull(enrollment.role),
        type: valueOrNull(enrollment.type),
        enrollmentState: valueOrNull(enrollment.enrollmentState),
        email: valueOrNull(user?.email),
        avatarUrl: valueOrNull(user?.avatarUrl),
        lastActivityAt: toIso(enrollment.lastActivityAt),
      };
    });
}

function buildFiles(cache: CanvasCourseCache): CanvasFileView[] {
  const foldersByCanvasId = new Map(
    cache.folders.map((folder) => [folder.canvasId, folder]),
  );

  return [...cache.files]
    .sort((a, b) => {
      const aDate = toIso(a.updatedAtCanvas) ?? toIso(a.createdAtCanvas);
      const bDate = toIso(b.updatedAtCanvas) ?? toIso(b.createdAtCanvas);

      return compareIsoDesc(aDate, bDate);
    })
    .map((file) => {
      const folder = file.folderCanvasId
        ? foldersByCanvasId.get(file.folderCanvasId)
        : null;

      return {
        id: file.id,
        name: firstText(file.displayName, file.filename, `File ${file.canvasId}`),
        folderName: valueOrNull(folder?.fullName ?? folder?.name),
        contentType: valueOrNull(file.contentType),
        sizeBytes: file.sizeBytes,
        url: valueOrNull(file.url),
        updatedAt: toIso(file.updatedAtCanvas ?? file.createdAtCanvas),
        locked: file.locked,
        hidden: file.hidden,
      };
    });
}

function buildCalendar(cache: CanvasCourseCache): CanvasCalendarItemView[] {
  const events = cache.calendarEvents.map((event) => ({
    id: event.id,
    title: firstText(event.title, "Calendar event"),
    type: valueOrNull(event.type),
    startsAt: toIso(event.startAt),
    endsAt: toIso(event.endAt),
    htmlUrl: valueOrNull(event.htmlUrl),
    location: valueOrNull(event.locationName ?? event.locationAddress),
    source: "event" as const,
  }));
  const todos = cache.todoItems.map((todo) => ({
    id: todo.id,
    title: firstText(todo.title, "To-do item"),
    type: valueOrNull(todo.type),
    startsAt: toIso(todo.dueAt ?? todo.plannableDate),
    endsAt: null,
    htmlUrl: valueOrNull(todo.htmlUrl),
    location: valueOrNull(todo.contextName),
    source: "todo" as const,
  }));

  return [...events, ...todos].sort((a, b) =>
    compareIsoAsc(a.startsAt, b.startsAt),
  );
}

function buildMeetings(cache: CanvasCourseCache): CanvasMeetingView[] {
  return filterMeetingItems(cache.moduleItems)
    .sort(comparePositionThenTitle)
    .map((item) => ({
      id: item.id,
      title: firstText(item.title, "Meeting link"),
      type: valueOrNull(item.type),
      htmlUrl: valueOrNull(item.htmlUrl),
      externalUrl: valueOrNull(item.externalUrl ?? item.url),
    }));
}

function filterMeetingItems(items: CanvasModuleItem[]) {
  return items.filter((item) => {
    const searchableText = [item.title, item.type, item.externalUrl, item.htmlUrl]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      searchableText.includes("zoom") ||
      searchableText.includes("meeting") ||
      searchableText.includes("meet") ||
      searchableText.includes("conference") ||
      item.type === "ExternalTool" ||
      item.type === "ExternalUrl"
    );
  });
}

function deriveAssignmentStatus(
  assignment: CanvasAssignment,
  submission: CanvasSubmission | undefined,
): CanvasAssignmentStatus {
  if (!assignment.dueAt) {
    return "undated";
  }

  const dueAt = assignment.dueAt.getTime();
  const now = Date.now();
  const submitted =
    Boolean(submission?.submittedAt) ||
    submission?.workflowState === "submitted" ||
    submission?.workflowState === "graded" ||
    submission?.score !== null ||
    Boolean(submission?.grade);

  if (dueAt > now) {
    return "upcoming";
  }

  if (submission?.missing || submission?.late || !submitted) {
    return "overdue";
  }

  return "past";
}

function pickSubmissionForAssignment(
  assignment: CanvasAssignment,
  submissions: CanvasSubmission[],
  userCanvasId: string | null,
) {
  const assignmentSubmissions = submissions
    .filter((submission) => submission.assignmentCanvasId === assignment.canvasId)
    .sort((a, b) => (b.attempt ?? 0) - (a.attempt ?? 0));

  if (userCanvasId) {
    return assignmentSubmissions.find(
      (submission) => submission.userCanvasId === userCanvasId,
    );
  }

  return assignmentSubmissions.length === 1 ? assignmentSubmissions[0] : undefined;
}

function resolveCurrentUserCanvasId(cache: CanvasCourseCache) {
  const submissionUserIds = Array.from(
    new Set(cache.submissions.map((submission) => submission.userCanvasId)),
  );

  if (submissionUserIds.length === 1) {
    return submissionUserIds[0];
  }

  const activeEnrollment = cache.enrollments.find(
    (enrollment) =>
      isEnrollmentActive(enrollment) &&
      enrollment.userCanvasId &&
      (!submissionUserIds.length ||
        submissionUserIds.includes(enrollment.userCanvasId)),
  );

  return activeEnrollment?.userCanvasId ?? null;
}

function getSubmissionLabel(submission: CanvasSubmission | undefined) {
  if (!submission) {
    return "No cached submission";
  }

  if (submission.missing) {
    return "Missing";
  }

  if (submission.late) {
    return "Late";
  }

  if (submission.workflowState === "graded" || submission.grade || submission.score !== null) {
    return "Graded";
  }

  if (submission.submittedAt || submission.workflowState === "submitted") {
    return "Submitted";
  }

  return firstText(submission.workflowState, "Cached submission");
}

function getInstructorNames(cache: CanvasCourseCache) {
  const usersByCanvasId = new Map(
    cache.users.map((user) => [user.canvasId, user]),
  );

  return cache.enrollments
    .filter((enrollment) => {
      const role = [enrollment.type, enrollment.role].join(" ").toLowerCase();

      return role.includes("teacher") || role.includes("instructor");
    })
    .map((enrollment) => {
      const user = enrollment.userCanvasId
        ? usersByCanvasId.get(enrollment.userCanvasId)
        : null;

      return getUserDisplayName(user, enrollment);
    })
    .filter((name, index, names) => names.indexOf(name) === index);
}

function getUserDisplayName(
  user: CanvasUser | null | undefined,
  enrollment: CanvasEnrollment,
) {
  return firstText(
    user?.name,
    user?.shortName,
    user?.sortableName,
    enrollment.userCanvasId ? `User ${enrollment.userCanvasId}` : null,
    enrollment.role,
    enrollment.type,
    "Canvas user",
  );
}

function mapCourseNicknames(nicknames: CanvasCourseNickname[]) {
  return new Map(nicknames.map((nickname) => [nickname.courseCanvasId, nickname]));
}

function isActiveCourse(course: CanvasCourse) {
  const workflowState = valueOrNull(course.workflowState)?.toLowerCase();
  const enrollmentState = valueOrNull(course.enrollmentState)?.toLowerCase();

  return (
    Boolean(course.canvasId.trim()) &&
    !inactiveStates.has(workflowState ?? "") &&
    !inactiveStates.has(enrollmentState ?? "")
  );
}

function isEnrollmentActive(enrollment: CanvasEnrollment) {
  const enrollmentState = valueOrNull(enrollment.enrollmentState)?.toLowerCase();

  return !inactiveStates.has(enrollmentState ?? "");
}

function compareAssignments(a: CanvasAssignment, b: CanvasAssignment) {
  const aDue = toIso(a.dueAt);
  const bDue = toIso(b.dueAt);

  if (aDue && bDue && aDue !== bDue) {
    return aDue.localeCompare(bDue);
  }

  if (aDue && !bDue) return -1;
  if (!aDue && bDue) return 1;

  return firstText(a.name, a.canvasId).localeCompare(firstText(b.name, b.canvasId));
}

function comparePositionThenName(a: CanvasModule, b: CanvasModule) {
  return (
    (a.position ?? Number.MAX_SAFE_INTEGER) -
      (b.position ?? Number.MAX_SAFE_INTEGER) ||
    firstText(a.name, a.canvasId).localeCompare(firstText(b.name, b.canvasId))
  );
}

function comparePositionThenTitle(a: CanvasModuleItem, b: CanvasModuleItem) {
  return (
    (a.position ?? Number.MAX_SAFE_INTEGER) -
      (b.position ?? Number.MAX_SAFE_INTEGER) ||
    firstText(a.title, a.canvasId).localeCompare(firstText(b.title, b.canvasId))
  );
}

function compareIsoAsc(a: string | null, b: string | null) {
  if (a && b) return a.localeCompare(b);
  if (a) return -1;
  if (b) return 1;

  return 0;
}

function compareIsoDesc(a: string | null, b: string | null) {
  return compareIsoAsc(b, a);
}

function latestIso(items: { syncedAt?: Date | null; updatedAt?: Date | null }[]) {
  const timestamps = items
    .flatMap((item) => [toIso(item.syncedAt), toIso(item.updatedAt)])
    .filter((value): value is string => Boolean(value));

  if (!timestamps.length) {
    return null;
  }

  return timestamps.sort().at(-1) ?? null;
}

function groupBy<TItem, TKey>(
  items: TItem[],
  getKey: (item: TItem) => TKey,
) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    const currentItems = groups.get(key) ?? [];

    currentItems.push(item);
    groups.set(key, currentItems);

    return groups;
  }, new Map<TKey, TItem[]>());
}

function firstText(...values: (string | null | undefined)[]) {
  return (
    values
      .map((value) => valueOrNull(value))
      .find((value): value is string => Boolean(value)) ?? ""
  );
}

function valueOrNull(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function stripHtml(value: string | null | undefined) {
  const normalizedValue = valueOrNull(value);

  if (!normalizedValue) {
    return null;
  }

  const text = normalizedValue
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return text || null;
}

function getRawText(
  raw: Record<string, unknown> | null | undefined,
  keys: string[],
) {
  for (const key of keys) {
    const value = raw?.[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function decodeRouteKey(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
