DROP INDEX "hr_organization"."departments_name_active_key";
CREATE UNIQUE INDEX "departments_name_active_key"
ON "hr_organization"."departments"(LOWER("name"))
WHERE "status" = 'ACTIVE';

DROP INDEX "hr_organization"."teams_name_departmentId_key";

CREATE UNIQUE INDEX "teams_name_department_active_key"
ON "hr_organization"."teams"(LOWER("name"), "departmentId")
WHERE "status" = 'ACTIVE';

DROP INDEX "hr_organization"."team_memberships_userId_key";

CREATE UNIQUE INDEX "team_memberships_member_userId_key"
ON "hr_organization"."team_memberships"("userId")
WHERE "role" = 'MEMBER';

CREATE INDEX "team_memberships_userId_role_idx"
ON "hr_organization"."team_memberships"("userId", "role");
