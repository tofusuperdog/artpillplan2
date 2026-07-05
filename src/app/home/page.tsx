import HomeClient from "@/components/app/HomeClient";
import { getBloodPressureData } from "@/lib/bloodPressure";
import { hasSessionCookie } from "@/lib/serverAuth";
import { getAppData } from "@/lib/serverAppData";
import { redirect } from "next/navigation";

export default async function ModuleHomePage() {
  if (!(await hasSessionCookie())) redirect("/");

  const [appData, bpData] = await Promise.all([
    getAppData(),
    getBloodPressureData().catch(() => null),
  ]);

  return <HomeClient initialData={appData} bpSummary={bpData?.summary || null} />;
}
