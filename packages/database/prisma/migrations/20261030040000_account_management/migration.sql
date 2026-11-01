-- Add account management and its minimum dependencies; retain every existing table.
CREATE SCHEMA IF NOT EXISTS "tenant_accounts";
CREATE SCHEMA IF NOT EXISTS "tenant_auth";
CREATE SCHEMA IF NOT EXISTS "tenant_permissions";
CREATE SCHEMA IF NOT EXISTS "tenant_audit";
CREATE SCHEMA IF NOT EXISTS "hr_employees";
CREATE SCHEMA IF NOT EXISTS "work_notifications";

CREATE TABLE "tenant_accounts"."accounts" (
 "id" UUID NOT NULL, "employeeId" UUID NOT NULL, "employeeCode" VARCHAR(100) NOT NULL,
 "displayName" VARCHAR(200) NOT NULL, "username" VARCHAR(64) NOT NULL, "email" VARCHAR(254) NOT NULL,
 "role" VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE', "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
 "passwordHash" VARCHAR(300) NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "accounts_role_check" CHECK ("role" IN ('EMPLOYEE','MANAGER')),
 CONSTRAINT "accounts_status_check" CHECK ("status" IN ('ACTIVE','LOCKED'))
);
CREATE UNIQUE INDEX "accounts_employeeId_key" ON "tenant_accounts"."accounts"("employeeId");
CREATE UNIQUE INDEX "accounts_username_key" ON "tenant_accounts"."accounts"("username");
CREATE UNIQUE INDEX "accounts_email_key" ON "tenant_accounts"."accounts"("email");
CREATE INDEX "accounts_status_role_idx" ON "tenant_accounts"."accounts"("status","role");
CREATE TABLE "tenant_accounts"."groups" (
 "id" UUID NOT NULL, "name" VARCHAR(100) NOT NULL, "directory" VARCHAR(64) NOT NULL,
 "description" VARCHAR(2000) NOT NULL DEFAULT '', "ownerId" UUID NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "groups_pkey" PRIMARY KEY("id"),
 CONSTRAINT "groups_ownerId_fkey" FOREIGN KEY("ownerId") REFERENCES "tenant_accounts"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "groups_directory_key" ON "tenant_accounts"."groups"("directory");
CREATE TABLE "tenant_accounts"."group_members" (
 "groupId" UUID NOT NULL, "accountId" UUID NOT NULL, CONSTRAINT "group_members_pkey" PRIMARY KEY("groupId","accountId"),
 CONSTRAINT "group_members_groupId_fkey" FOREIGN KEY("groupId") REFERENCES "tenant_accounts"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "group_members_accountId_fkey" FOREIGN KEY("accountId") REFERENCES "tenant_accounts"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "group_members_accountId_idx" ON "tenant_accounts"."group_members"("accountId");
CREATE TABLE "tenant_auth"."sessions" (
 "id" UUID NOT NULL, "tokenHash" VARCHAR(64) NOT NULL, "accountId" UUID NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "sessions_pkey" PRIMARY KEY("id")
);
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "tenant_auth"."sessions"("tokenHash");
CREATE INDEX "sessions_accountId_idx" ON "tenant_auth"."sessions"("accountId");
CREATE INDEX "sessions_expiresAt_idx" ON "tenant_auth"."sessions"("expiresAt");
CREATE TABLE "tenant_auth"."attempts" (
 "key" VARCHAR(64) NOT NULL, "failures" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "attempts_pkey" PRIMARY KEY("key")
);
CREATE TABLE "tenant_permissions"."account_permissions" (
 "accountId" UUID NOT NULL, "superAdmin" BOOLEAN NOT NULL DEFAULT false, "manageAccounts" BOOLEAN NOT NULL DEFAULT false,
 "version" INTEGER NOT NULL DEFAULT 1, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "account_permissions_pkey" PRIMARY KEY("accountId")
);
CREATE TABLE "tenant_audit"."entries" (
 "id" UUID NOT NULL, "actorId" UUID NOT NULL, "actorName" VARCHAR(100) NOT NULL, "action" VARCHAR(100) NOT NULL,
 "entityType" VARCHAR(50) NOT NULL, "entityId" UUID NOT NULL, "before" JSONB, "after" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "entries_pkey" PRIMARY KEY("id")
);
CREATE INDEX "entries_entityType_entityId_createdAt_idx" ON "tenant_audit"."entries"("entityType","entityId","createdAt");
CREATE INDEX "entries_actorId_createdAt_idx" ON "tenant_audit"."entries"("actorId","createdAt");
CREATE TABLE "hr_employees"."employees" (
 "id" UUID NOT NULL, "code" VARCHAR(100) NOT NULL, "name" VARCHAR(200) NOT NULL, "email" VARCHAR(254) NOT NULL,
 "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "employees_pkey" PRIMARY KEY("id")
);
CREATE UNIQUE INDEX "employees_code_key" ON "hr_employees"."employees"("code");
CREATE UNIQUE INDEX "employees_email_key" ON "hr_employees"."employees"("email");
CREATE TABLE "work_notifications"."account_notifications" (
 "id" UUID NOT NULL, "recipientId" UUID NOT NULL, "accountId" UUID NOT NULL, "message" VARCHAR(1000) NOT NULL,
 "taskIds" JSONB NOT NULL, "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "account_notifications_pkey" PRIMARY KEY("id")
);
CREATE INDEX "account_notifications_recipientId_createdAt_idx" ON "work_notifications"."account_notifications"("recipientId","createdAt");
