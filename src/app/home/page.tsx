import HomeClient from "@/components/app/HomeClient";
import { hasSessionCookie } from "@/lib/serverAuth";
import { redirect } from "next/navigation";

export default async function ModuleHomePage() {
  if (!(await hasSessionCookie())) redirect("/");

  return <HomeClient />;
}
