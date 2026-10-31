import {
  ModulePage,
  definition,
} from "@/features/tenant-system/automation-hub/workflow-rules";
export const metadata = { title: definition.label };
export default function Page() {
  return <ModulePage />;
}
