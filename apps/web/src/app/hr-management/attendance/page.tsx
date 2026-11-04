import {
  MyAttendance,
  definition,
} from "@/features/hr-management/attendance/daily-checkin";
import { WorkforceBoard } from "@/features/hr-management/attendance/workforce-board";
import { ExplanationReview } from "@/features/hr-management/attendance/checkin-explanations";
import { MonthlyReportTable } from "@/features/hr-management/attendance/attendance-reports";
export const metadata = { title: definition.label };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { section } = await searchParams;
  if (section === "Quân số hôm nay") return <WorkforceBoard />;
  if (section === "Duyệt giải trình") return <ExplanationReview />;
  if (section === "Bảng điểm danh tháng") return <MonthlyReportTable />;
  return <MyAttendance />;
}
