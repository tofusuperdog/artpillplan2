import AppClient from "@/components/app/AppClient";
import { hasSessionCookie } from "@/lib/serverAuth";
import { getAppData } from "@/lib/serverAppData";
import { redirect } from "next/navigation";

export default async function MainPage() {
  if (!(await hasSessionCookie())) redirect("/");
  try {
    return <AppClient initialData={await getAppData()} />;
  } catch (error) {
    return <AppClient initialError={error instanceof Error ? error.message : "Unable to load app data."} />;
  }
}
