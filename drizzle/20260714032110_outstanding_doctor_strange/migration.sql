ALTER TABLE "tasks" ADD CONSTRAINT "tasks_context_compatibility_check" CHECK (("course_id" is null or "work_category" = 'academic')
        and ("organization_id" is null or "work_category" = 'organization')
        and not ("course_id" is not null and "organization_id" is not null));