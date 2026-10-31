-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr_attendance";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr_attendance_reports";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr_capacity";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr_checkin_explanations";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr_leave_approvals";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr_leaves";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr_shifts";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr_workforce";

-- CreateTable
CREATE TABLE "hr_attendance_reports"."attendance_periods" (
    "id" UUID NOT NULL,
    "periodKey" VARCHAR(7) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "fromDate" VARCHAR(10) NOT NULL,
    "toDate" VARCHAR(10) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_attendance_reports"."attendance_period_lines" (
    "id" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "employeeId" VARCHAR(64) NOT NULL,
    "employeeName" VARCHAR(200) NOT NULL,
    "workedDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidLeaveDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unpaidLeaveDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_period_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_checkin_explanations"."checkin_explanations" (
    "id" UUID NOT NULL,
    "employeeId" VARCHAR(64) NOT NULL,
    "employeeName" VARCHAR(200) NOT NULL,
    "workDate" VARCHAR(10) NOT NULL,
    "type" VARCHAR(30) NOT NULL DEFAULT 'FORGOT_CHECKIN',
    "reason" VARCHAR(1000) NOT NULL,
    "requestedCheckIn" VARCHAR(5) NOT NULL DEFAULT '',
    "requestedCheckOut" VARCHAR(5) NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "decidedBy" VARCHAR(200) NOT NULL DEFAULT '',
    "decidedAt" TIMESTAMP(3),
    "decisionNote" VARCHAR(500) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkin_explanations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_attendance"."attendance_records" (
    "id" UUID NOT NULL,
    "employeeId" VARCHAR(64) NOT NULL,
    "employeeName" VARCHAR(200) NOT NULL,
    "workDate" VARCHAR(10) NOT NULL,
    "checkIn" VARCHAR(5) NOT NULL,
    "checkOut" VARCHAR(5),
    "source" VARCHAR(20) NOT NULL DEFAULT 'WEB',
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_shifts"."shift_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "nameKey" VARCHAR(150) NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "nightShift" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" VARCHAR(10) NOT NULL,
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_shifts"."schedule_patterns" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "nameKey" VARCHAR(150) NOT NULL,
    "slots" JSONB NOT NULL,
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_shifts"."schedule_assignments" (
    "id" UUID NOT NULL,
    "employeeId" VARCHAR(64) NOT NULL,
    "employeeName" VARCHAR(200) NOT NULL,
    "workDate" VARCHAR(10) NOT NULL,
    "shiftId" UUID NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_workforce"."workforce_presence" (
    "id" UUID NOT NULL,
    "employeeId" VARCHAR(64) NOT NULL,
    "employeeName" VARCHAR(200) NOT NULL,
    "workDate" VARCHAR(10) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'IN_OFFICE',
    "shiftLabel" VARCHAR(120) NOT NULL DEFAULT '',
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workforce_presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_capacity"."capacity_periods" (
    "id" UUID NOT NULL,
    "employeeId" VARCHAR(64) NOT NULL,
    "employeeName" VARCHAR(200) NOT NULL,
    "fromDate" VARCHAR(10) NOT NULL,
    "toDate" VARCHAR(10) NOT NULL,
    "standardHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "workingDays" INTEGER NOT NULL DEFAULT 0,
    "holidayDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leaveDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capacity_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_capacity"."project_allocations" (
    "id" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "employeeId" VARCHAR(64) NOT NULL,
    "employeeName" VARCHAR(200) NOT NULL,
    "projectRef" VARCHAR(200) NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_approvals"."leave_decisions" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "employeeId" VARCHAR(64) NOT NULL,
    "employeeName" VARCHAR(200) NOT NULL,
    "leaveType" VARCHAR(20) NOT NULL DEFAULT 'ANNUAL',
    "fromDate" VARCHAR(10) NOT NULL,
    "toDate" VARCHAR(10) NOT NULL,
    "days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" VARCHAR(1000) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "decidedBy" VARCHAR(200) NOT NULL,
    "decisionNote" VARCHAR(500) NOT NULL DEFAULT '',
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leaves"."leave_requests" (
    "id" UUID NOT NULL,
    "employeeId" VARCHAR(64) NOT NULL,
    "employeeName" VARCHAR(200) NOT NULL,
    "leaveType" VARCHAR(20) NOT NULL DEFAULT 'ANNUAL',
    "fromDate" VARCHAR(10) NOT NULL,
    "toDate" VARCHAR(10) NOT NULL,
    "days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" VARCHAR(1000) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "decidedBy" VARCHAR(200) NOT NULL DEFAULT '',
    "decidedAt" TIMESTAMP(3),
    "decisionNote" VARCHAR(500) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_periods_periodKey_key" ON "hr_attendance_reports"."attendance_periods"("periodKey");

-- CreateIndex
CREATE INDEX "attendance_periods_status_fromDate_idx" ON "hr_attendance_reports"."attendance_periods"("status", "fromDate");

-- CreateIndex
CREATE INDEX "attendance_period_lines_periodId_idx" ON "hr_attendance_reports"."attendance_period_lines"("periodId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_period_lines_periodId_employeeId_key" ON "hr_attendance_reports"."attendance_period_lines"("periodId", "employeeId");

-- CreateIndex
CREATE INDEX "checkin_explanations_status_workDate_idx" ON "hr_checkin_explanations"."checkin_explanations"("status", "workDate");

-- CreateIndex
CREATE UNIQUE INDEX "checkin_explanations_employeeId_workDate_type_key" ON "hr_checkin_explanations"."checkin_explanations"("employeeId", "workDate", "type");

-- CreateIndex
CREATE INDEX "attendance_records_workDate_status_idx" ON "hr_attendance"."attendance_records"("workDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_employeeId_workDate_key" ON "hr_attendance"."attendance_records"("employeeId", "workDate");

-- CreateIndex
CREATE UNIQUE INDEX "shift_templates_nameKey_key" ON "hr_shifts"."shift_templates"("nameKey");

-- CreateIndex
CREATE INDEX "shift_templates_status_name_idx" ON "hr_shifts"."shift_templates"("status", "name");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_patterns_nameKey_key" ON "hr_shifts"."schedule_patterns"("nameKey");

-- CreateIndex
CREATE INDEX "schedule_assignments_workDate_shiftId_idx" ON "hr_shifts"."schedule_assignments"("workDate", "shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_assignments_employeeId_workDate_key" ON "hr_shifts"."schedule_assignments"("employeeId", "workDate");

-- CreateIndex
CREATE INDEX "workforce_presence_workDate_status_idx" ON "hr_workforce"."workforce_presence"("workDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workforce_presence_employeeId_workDate_key" ON "hr_workforce"."workforce_presence"("employeeId", "workDate");

-- CreateIndex
CREATE INDEX "capacity_periods_fromDate_toDate_idx" ON "hr_capacity"."capacity_periods"("fromDate", "toDate");

-- CreateIndex
CREATE UNIQUE INDEX "capacity_periods_employeeId_fromDate_toDate_key" ON "hr_capacity"."capacity_periods"("employeeId", "fromDate", "toDate");

-- CreateIndex
CREATE INDEX "project_allocations_periodId_status_idx" ON "hr_capacity"."project_allocations"("periodId", "status");

-- CreateIndex
CREATE INDEX "project_allocations_employeeId_idx" ON "hr_capacity"."project_allocations"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "leave_decisions_requestId_key" ON "hr_leave_approvals"."leave_decisions"("requestId");

-- CreateIndex
CREATE INDEX "leave_decisions_status_decidedAt_idx" ON "hr_leave_approvals"."leave_decisions"("status", "decidedAt");

-- CreateIndex
CREATE INDEX "leave_decisions_employeeId_decidedAt_idx" ON "hr_leave_approvals"."leave_decisions"("employeeId", "decidedAt");

-- CreateIndex
CREATE INDEX "leave_requests_status_fromDate_idx" ON "hr_leaves"."leave_requests"("status", "fromDate");

-- CreateIndex
CREATE INDEX "leave_requests_employeeId_fromDate_idx" ON "hr_leaves"."leave_requests"("employeeId", "fromDate");

-- AddForeignKey
ALTER TABLE "hr_attendance_reports"."attendance_period_lines" ADD CONSTRAINT "attendance_period_lines_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "hr_attendance_reports"."attendance_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
