import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardSnapshot } from "@/lib/dashboard/snapshot";

export const dynamic = "force-dynamic";

export default async function Home() {
  const snapshot = await getDashboardSnapshot();
  return <DashboardShell snapshot={snapshot} />;
}
