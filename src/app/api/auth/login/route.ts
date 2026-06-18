import { NextResponse } from "next/server";
import { pinsMatch, setSessionCookie } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { pin?: string } | null;
  const pin = String(body?.pin || "");

  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("pin_value")
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, message: "Unable to verify PIN" }, { status: 500 });
  }

  if (!pinsMatch(pin, data?.pin_value)) {
    return NextResponse.json({ ok: false, message: "Incorrect PIN" }, { status: 401 });
  }

  await setSessionCookie();
  return NextResponse.json({ ok: true });
}
