import LoginClient from "@/components/app/LoginClient";
import { hasSessionCookie } from "@/lib/serverAuth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  if (await hasSessionCookie()) redirect("/home");
  return <LoginClient />;
}
