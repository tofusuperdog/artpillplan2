import AppClient from "@/components/app/AppClient";
import { hasSessionCookie } from "@/lib/serverAuth";
import { redirect } from "next/navigation";

export default async function MedicationDetailPage() {
  if (!(await hasSessionCookie())) redirect("/");
  return <AppClient />;
}
