import {
  CanvasCourseDiscoveryError,
  getAvailableCanvasCoursesForPicker,
} from "@/lib/canvas-course-discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNKNOWN_COURSE_DISCOVERY_ERROR = {
  status: 500,
  body: {
    error: "Courses could not be loaded right now.",
    code: "canvas_course_discovery_error",
  },
};

export async function GET(request: Request) {
  try {
    const result = await getAvailableCanvasCoursesForPicker({
      signal: request.signal,
    });

    return Response.json(result);
  } catch (error) {
    const response = getCourseDiscoveryErrorResponse(error);

    return Response.json(response.body, { status: response.status });
  }
}

function getCourseDiscoveryErrorResponse(error: unknown) {
  if (!(error instanceof CanvasCourseDiscoveryError)) {
    return UNKNOWN_COURSE_DISCOVERY_ERROR;
  }

  return {
    status: error.status,
    body: {
      error: error.publicMessage,
      code: error.code,
    },
  };
}
