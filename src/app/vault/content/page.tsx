import VaultClient from "@/components/app/VaultClient";
import { hasSessionCookie } from "@/lib/serverAuth";
import { hasVaultSessionCookie } from "@/lib/serverVaultAuth";
import { redirect } from "next/navigation";

export default async function VaultContentPage() {
  if (!(await hasSessionCookie())) redirect("/");
  if (!(await hasVaultSessionCookie())) redirect("/vault");
  return <VaultClient content />;
}
