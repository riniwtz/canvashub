import { notFound } from "next/navigation"

import { getCanvasCourseWorkspace } from "@/lib/canvas-course-data"
import { CourseWorkspace } from "@/components/course-workspace"

export default async function Page({
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
