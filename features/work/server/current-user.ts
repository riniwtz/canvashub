import "server-only";

import { cache } from "react";

import { LOCAL_WORK_USER_ID } from "@/features/work/constants";

export const getCurrentWorkUserId = cache(async () => LOCAL_WORK_USER_ID);

