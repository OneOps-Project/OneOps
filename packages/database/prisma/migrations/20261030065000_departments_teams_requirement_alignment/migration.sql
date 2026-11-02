-- Rename the persisted role without dropping existing membership values.
ALTER TYPE "hr_organization"."TeamMembershipRole" RENAME VALUE 'LEADER' TO 'MANAGER';

-- Department names are unique only while the department is active.
DROP INDEX "hr_organization"."departments_name_key";
CREATE UNIQUE INDEX "departments_name_active_key"
ON "hr_organization"."departments"("name")
WHERE "status" = 'ACTIVE';

-- Keep descriptions bounded as short text.
ALTER TABLE "hr_organization"."departments"
ALTER COLUMN "description" SET DATA TYPE VARCHAR(1000);
ALTER TABLE "hr_organization"."teams"
ALTER COLUMN "description" SET DATA TYPE VARCHAR(1000);

-- Store group assignments for team membership.
CREATE TABLE "hr_organization"."team_access_groups" (
    "teamId" UUID NOT NULL,
    "groupId" UUID NOT NULL,

    CONSTRAINT "team_access_groups_pkey" PRIMARY KEY ("teamId","groupId")
);

CREATE INDEX "team_access_groups_groupId_idx"
ON "hr_organization"."team_access_groups"("groupId");

CREATE INDEX "departments_status_idx"
ON "hr_organization"."departments"("status");

ALTER TABLE "hr_organization"."team_access_groups"
ADD CONSTRAINT "team_access_groups_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "hr_organization"."teams"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
