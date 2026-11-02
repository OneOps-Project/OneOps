-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr_organization";

-- CreateEnum
CREATE TYPE "hr_organization"."OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "hr_organization"."TeamMembershipRole" AS ENUM ('LEADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "hr_organization"."OrgHistoryEntityType" AS ENUM ('DEPARTMENT', 'TEAM');

-- CreateEnum
CREATE TYPE "hr_organization"."OrgHistoryAction" AS ENUM ('CREATE', 'UPDATE', 'DEACTIVATE', 'TRANSFER');

-- CreateTable
CREATE TABLE "hr_organization"."departments" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" "hr_organization"."OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_organization"."teams" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" "hr_organization"."OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "departmentId" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_organization"."department_administrators" (
    "departmentId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "department_administrators_pkey" PRIMARY KEY ("departmentId","userId")
);

-- CreateTable
CREATE TABLE "hr_organization"."department_access_users" (
    "departmentId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "department_access_users_pkey" PRIMARY KEY ("departmentId","userId")
);

-- CreateTable
CREATE TABLE "hr_organization"."department_access_groups" (
    "departmentId" UUID NOT NULL,
    "groupId" UUID NOT NULL,

    CONSTRAINT "department_access_groups_pkey" PRIMARY KEY ("departmentId","groupId")
);

-- CreateTable
CREATE TABLE "hr_organization"."team_memberships" (
    "teamId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "hr_organization"."TeamMembershipRole" NOT NULL,

    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("teamId","userId")
);

-- CreateTable
CREATE TABLE "hr_organization"."org_history" (
    "id" UUID NOT NULL,
    "entityType" "hr_organization"."OrgHistoryEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "action" "hr_organization"."OrgHistoryAction" NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "performedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "hr_organization"."departments"("name");

-- CreateIndex
CREATE INDEX "teams_departmentId_status_idx" ON "hr_organization"."teams"("departmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_departmentId_key" ON "hr_organization"."teams"("name", "departmentId");

-- CreateIndex
CREATE INDEX "department_administrators_userId_idx" ON "hr_organization"."department_administrators"("userId");

-- CreateIndex
CREATE INDEX "department_access_users_userId_idx" ON "hr_organization"."department_access_users"("userId");

-- CreateIndex
CREATE INDEX "department_access_groups_groupId_idx" ON "hr_organization"."department_access_groups"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "team_memberships_userId_key" ON "hr_organization"."team_memberships"("userId");

-- CreateIndex
CREATE INDEX "team_memberships_teamId_role_idx" ON "hr_organization"."team_memberships"("teamId", "role");

-- CreateIndex
CREATE INDEX "org_history_entityType_entityId_createdAt_idx" ON "hr_organization"."org_history"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "org_history_performedBy_createdAt_idx" ON "hr_organization"."org_history"("performedBy", "createdAt");

-- AddForeignKey
ALTER TABLE "hr_organization"."teams" ADD CONSTRAINT "teams_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "hr_organization"."departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_organization"."department_administrators" ADD CONSTRAINT "department_administrators_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "hr_organization"."departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_organization"."department_access_users" ADD CONSTRAINT "department_access_users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "hr_organization"."departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_organization"."department_access_groups" ADD CONSTRAINT "department_access_groups_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "hr_organization"."departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_organization"."team_memberships" ADD CONSTRAINT "team_memberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "hr_organization"."teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
