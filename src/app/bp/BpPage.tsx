import BpClient from "@/components/app/BpClient";
import { getBloodPressureData } from "@/lib/bloodPressure";
import { hasSessionCookie } from "@/lib/serverAuth";
import { redirect } from "next/navigation";

export default async function BpPage() {
  if (!(await hasSessionCookie())) redirect("/");

  try {
    return <BpClient initialData={await getBloodPressureData()} />;
  } catch (error) {
    return <BpClient initialError={error instanceof Error ? error.message : "Unable to load blood pressure data."} />;
  }
}
