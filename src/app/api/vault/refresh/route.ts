import { NextResponse } from "next/server";
import { hasSessionCookie } from "@/lib/serverAuth";
import { getVaultSessionBaseCode, setVaultSessionCookie } from "@/lib/serverVaultAuth";

export async function POST() {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const baseCode = await getVaultSessionBaseCode();
  if (!baseCode) return NextResponse.json({ message: "Vault is locked." }, { status: 401 });
  await setVaultSessionCookie(baseCode);
  return NextResponse.json({ ok: true });
}
