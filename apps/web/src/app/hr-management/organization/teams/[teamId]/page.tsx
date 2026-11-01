import {
  MockAuthProvider,
  TeamDetail,
} from "@/features/hr-management/organization/departments-teams";

export default async function Page({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  return (
    <MockAuthProvider>
      <TeamDetail id={teamId} />
    </MockAuthProvider>
  );
}
