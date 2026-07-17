import { NextResponse } from "next/server";
import { hasSessionCookie } from "@/lib/serverAuth";
import { clearVaultSessionCookie } from "@/lib/serverVaultAuth";

export async function POST() {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  await clearVaultSessionCookie();
  return NextResponse.json({ ok: true });
}
