import VaultClient from "@/components/app/VaultClient";
import { hasSessionCookie } from "@/lib/serverAuth";
import { redirect } from "next/navigation";

export default async function VaultPage() {
  if (!(await hasSessionCookie())) redirect("/");
  return <VaultClient />;
}
