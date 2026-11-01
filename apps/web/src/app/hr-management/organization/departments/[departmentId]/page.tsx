import {
  DepartmentDetail,
  MockAuthProvider,
} from "@/features/hr-management/organization/departments-teams";

export default async function Page({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = await params;
  return (
    <MockAuthProvider>
      <DepartmentDetail id={departmentId} />
    </MockAuthProvider>
  );
}
