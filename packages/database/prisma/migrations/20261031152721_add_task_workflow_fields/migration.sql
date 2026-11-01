-- AlterTable: Add new fields for task workflow (ROUND1-2, 4, 6, 7)
ALTER TABLE "work_tasks"."records"
  ADD COLUMN "reviewer" VARCHAR(150) NOT NULL DEFAULT '',
  ADD COLUMN "deadline" TIMESTAMP(3),
  ADD COLUMN "attachmentLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "statusHistory" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "reassignmentFlag" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "reassignmentHistory" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex: Optimize queries for "Việc của tôi" (assignee + reviewer filtering with deadline)
CREATE INDEX "records_assignee_status_deadline_idx" ON "work_tasks"."records"("assignee", "status", "deadline");

-- CreateIndex: Optimize queries for reviewer tasks
CREATE INDEX "records_reviewer_status_deadline_idx" ON "work_tasks"."records"("reviewer", "status", "deadline");

-- Comment: Explain the new fields
COMMENT ON COLUMN "work_tasks"."records"."reviewer" IS 'Người kiểm tra task (spec 8.2)';
COMMENT ON COLUMN "work_tasks"."records"."deadline" IS 'Deadline ngày+giờ (spec 8.2), thay thế date cho việc tính deadline status';
COMMENT ON COLUMN "work_tasks"."records"."attachmentLinks" IS 'Danh sách link đính kèm (spec 8.2)';
COMMENT ON COLUMN "work_tasks"."records"."statusHistory" IS 'Lịch sử trạng thái bất biến (BR-ST-06)';
COMMENT ON COLUMN "work_tasks"."records"."reassignmentFlag" IS 'Cờ cần giao lại task (BR-LV-06, BR-ACC-06, BR-ORG-09)';
COMMENT ON COLUMN "work_tasks"."records"."reassignmentHistory" IS 'Lịch sử giao lại task (BR-TSK-07)';
