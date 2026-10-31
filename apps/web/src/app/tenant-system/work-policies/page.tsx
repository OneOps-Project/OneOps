import {
  ModulePage,
  definition,
} from "@/features/tenant-system/organization/work-policies";
export const metadata = { title: definition.label };
export default function Page() {
  return <ModulePage />;
}
