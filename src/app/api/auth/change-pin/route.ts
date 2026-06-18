import { NextResponse } from "next/server";
import { hasSessionCookie } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { pin?: string } | null;
  const pin = String(body?.pin || "");
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ ok: false, message: "PIN must be 4 digits" }, { status: 400 });
  }

  const { data: current, error: readError } = await supabaseAdmin
    .from("app_settings")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (readError) {
    return NextResponse.json({ ok: false, message: "Unable to read settings" }, { status: 500 });
  }

  const query = current?.id
    ? supabaseAdmin
        .from("app_settings")
        .update({ pin_value: pin, updated_at: new Date().toISOString() })
        .eq("id", current.id)
    : supabaseAdmin
        .from("app_settings")
        .insert({ low_stock_alert_days: 14, expiring_lot_alert_days: 90, pin_value: pin });

  const { error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, message: "Unable to save PIN" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
