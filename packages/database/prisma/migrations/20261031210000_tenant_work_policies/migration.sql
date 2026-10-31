-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_policies";

-- CreateTable
CREATE TABLE "tenant_policies"."policies" (
    "id" UUID NOT NULL,
    "key" VARCHAR(20) NOT NULL DEFAULT 'default',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "workStart" VARCHAR(5) NOT NULL DEFAULT '08:30',
    "workEnd" VARCHAR(5) NOT NULL DEFAULT '17:30',
    "breakMinutes" INTEGER NOT NULL DEFAULT 60,
    "lateGraceMinutes" INTEGER NOT NULL DEFAULT 5,
    "workDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_policies"."holidays" (
    "id" UUID NOT NULL,
    "dateKey" VARCHAR(10) NOT NULL,
    "date" DATE NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT true,
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_policies"."office_networks" (
    "id" UUID NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "cidr" VARCHAR(64) NOT NULL,
    "cidrKey" VARCHAR(64) NOT NULL,
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "office_networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_policies"."leave_quotas" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "daysPerYear" INTEGER NOT NULL DEFAULT 12,
    "maxCarryOverDays" INTEGER NOT NULL DEFAULT 0,
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "policies_key_key" ON "tenant_policies"."policies"("key");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_dateKey_key" ON "tenant_policies"."holidays"("dateKey");

-- CreateIndex
CREATE INDEX "holidays_status_date_idx" ON "tenant_policies"."holidays"("status", "date");

-- CreateIndex
CREATE UNIQUE INDEX "office_networks_cidrKey_key" ON "tenant_policies"."office_networks"("cidrKey");

-- CreateIndex
CREATE INDEX "office_networks_status_label_idx" ON "tenant_policies"."office_networks"("status", "label");

-- CreateIndex
CREATE UNIQUE INDEX "leave_quotas_year_key" ON "tenant_policies"."leave_quotas"("year");
