import { NextResponse } from "next/server";
import { hasSessionCookie } from "@/lib/serverAuth";

export async function GET() {
  return NextResponse.json({ authenticated: await hasSessionCookie() });
}
