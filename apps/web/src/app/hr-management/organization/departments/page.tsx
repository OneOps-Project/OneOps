import {
  definition,
  ModulePage,
} from "@/features/hr-management/organization/departments-teams";

export const metadata = { title: definition.label };

export default function Page() {
  return <ModulePage />;
}
