import { notFound } from "next/navigation"

import { getCanvasCourseWorkspace } from "@/features/courses/server/course-data"
import { CourseWorkspace } from "@/features/courses/components/course-workspace"

export default async function CoursePage({
  params,
}: {
  params: Promise<{ course_id: string }>
}) {
  const { course_id } = await params
  const workspace = await getCanvasCourseWorkspace(course_id)

  if (!workspace) {
    notFound()
  }

  return <CourseWorkspace workspace={workspace} />
}
